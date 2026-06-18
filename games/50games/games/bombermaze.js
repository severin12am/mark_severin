// games/bombermaze.js
class BomberMaze extends GameBase {
    constructor() {
        super("Bomber Maze", "Trap your opponent with bombs — last player standing wins.");
        this.gridSize = 11;
        this.cell = 64;
        this.reset();
    }

    reset() {
        this.map = Array(this.gridSize).fill().map(()=>Array(this.gridSize).fill(1));
        this.bombs = [];
        this.explosions = [];
        this.players = [
            { x: 1.5, y: 1.5, color: Theme.p1, alive: true },
            { x: this.gridSize - 2.5, y: this.gridSize - 2.5, color: Theme.p2, alive: true }
        ];
        this.scoreP1 = 0;
        this.scoreP2 = 0;

        // outer walls already 1, inner random soft walls
        for (let y = 1; y < this.gridSize - 1; y++) {
            for (let x = 1; x < this.gridSize - 1; x++) {
                if (x % 2 === 1 && y % 2 === 1) continue;
                if (Math.random() < 0.78) this.map[y][x] = 2; // destructible
            }
        }
        // clear spawn areas
        this.map[1][1] = this.map[1][2] = this.map[2][1] = 0;
        this.map[this.gridSize-2][this.gridSize-2] = this.map[this.gridSize-2][this.gridSize-3] = this.map[this.gridSize-3][this.gridSize-2] = 0;
    }

    init(w, h) { super.init(w, h); this.reset(); }

    update(dt) {
        if (!this.players[0].alive && !this.players[1].alive) return;

        // player movement & bomb drop
        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            if (!p.alive) continue;

            let speed = 3.2;
            let dx = 0, dy = 0;

            const keys = i === 0 ?
                {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',bomb:'Space'} :
                (GameManager.isSinglePlayer ? {} : {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',bomb:'Enter'});

            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.up))    dy -= speed * dt;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.down))  dy += speed * dt;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.left))  dx -= speed * dt;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.right)) dx += speed * dt;

            // CPU bomb & move logic (very basic)
            if (GameManager.isSinglePlayer && i === 1) {
                let tx = Math.round(this.players[0].x);
                let ty = Math.round(this.players[0].y);
                let px = Math.round(p.x);
                let py = Math.round(p.y);

                if (Math.abs(tx - px) + Math.abs(ty - py) < 4 && Math.random() < 0.008) {
                    if (this.bombs.length < 3) this.dropBomb(p);
                }

                dx = (tx - px) * 0.8;
                dy = (ty - py) * 0.8;
                let len = Math.sqrt(dx*dx + dy*dy) || 1;
                dx = dx / len * speed * dt * 0.7;
                dy = dy / len * speed * dt * 0.7;
            }

            let nx = p.x + dx, ny = p.y + dy;

            let cx = Math.floor(nx), cy = Math.floor(ny);
            if (this.map[cy] && this.map[cy][cx] === 0) {
                p.x = nx; p.y = ny;
            }

            // drop bomb
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.bomb)) {
                if (this.bombs.length < 4 && !this.bombs.some(b=> Math.floor(b.x)===Math.floor(p.x) && Math.floor(b.y)===Math.floor(p.y))) {
                    this.dropBomb(p);
                }
            }
        }

        // update bombs & explosions
        this.bombs.forEach(b => {
            b.timer -= dt;
            if (b.timer <= 0) {
                this.explode(b.x, b.y, 2);
                this.bombs.splice(this.bombs.indexOf(b), 1);
            }
        });

        this.explosions = this.explosions.filter(e => {
            e.timer -= dt;
            return e.timer > 0;
        });

        // check player hit by explosion
        for (let p of this.players) {
            if (!p.alive) continue;
            let hit = this.explosions.some(e =>
                Math.floor(e.x) === Math.floor(p.x) &&
                Math.floor(e.y) === Math.floor(p.y)
            );
            if (hit) {
                p.alive = false;
                GameManager.gameOver(this.players[0].alive ? 1 : this.players[1].alive ? 2 : 0);
            }
        }
    }

    dropBomb(p) {
        this.bombs.push({ x: Math.round(p.x), y: Math.round(p.y), timer: 3.2, owner: p });
    }

    explode(x, y, power) {
        this.addExplosion(x, y);
        for (let d of [[0,-1],[0,1],[-1,0],[1,0]]) {
            for (let k = 1; k <= power; k++) {
                let cx = Math.floor(x) + d[0]*k;
                let cy = Math.floor(y) + d[1]*k;
                if (cx < 0 || cx >= this.gridSize || cy < 0 || cy >= this.gridSize) break;
                if (this.map[cy][cx] === 1) break; // hard wall
                this.addExplosion(cx + 0.5, cy + 0.5);
                if (this.map[cy][cx] === 2) {
                    this.map[cy][cx] = 0;
                    break;
                }
            }
        }
    }

    addExplosion(x, y) {
        this.explosions.push({ x, y, timer: 0.6 });
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // grid
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                let val = this.map[y][x];
                if (val === 1) {
                    ctx.fillStyle = "#444";
                    ctx.fillRect(x*this.cell, y*this.cell, this.cell, this.cell);
                } else if (val === 2) {
                    ctx.fillStyle = "#a66";
                    ctx.fillRect(x*this.cell+4, y*this.cell+4, this.cell-8, this.cell-8);
                }
            }
        }

        // explosions
        ctx.globalAlpha = 0.9;
        for (let e of this.explosions) {
            ctx.fillStyle = Theme.accent;
            ctx.fillRect((e.x-0.5)*this.cell, (e.y-0.5)*this.cell, this.cell, this.cell);
        }
        ctx.globalAlpha = 1;

        // bombs
        for (let b of this.bombs) {
            ctx.fillStyle = "#222";
            ctx.beginPath();
            ctx.arc(b.x*this.cell, b.y*this.cell, 22, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(b.x*this.cell, b.y*this.cell, 14, 0, Math.PI*2);
            ctx.fill();
        }

        // players
        for (let p of this.players) {
            if (!p.alive) continue;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x*this.cell, p.y*this.cell, 30, 0, Math.PI*2);
            ctx.fill();
        }
    }
}

GameManager.registerGame(new BomberMaze());