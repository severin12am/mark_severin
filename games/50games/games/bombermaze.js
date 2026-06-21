class BomberMaze extends GameBase {
    constructor() {
        super("Bomber Maze", "Drop bombs — blast your rival! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.gridSize = 11;
        this.cell = Math.min(w, h) / this.gridSize;
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startRound() {
        this.map = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(1));
        this.bombs = [];
        this.explosions = [];
        this.p1 = { x: 1.5, y: 1.5, alive: true };
        this.p2 = { x: this.gridSize - 2.5, y: this.gridSize - 2.5, alive: true };

        for (let y = 1; y < this.gridSize - 1; y++) {
            for (let x = 1; x < this.gridSize - 1; x++) {
                if (x % 2 === 1 && y % 2 === 1) continue;
                if (Math.random() < 0.72) this.map[y][x] = 2;
            }
        }
        this.map[1][1] = this.map[1][2] = this.map[2][1] = 0;
        const n = this.gridSize - 2;
        this.map[n][n] = this.map[n][n - 1] = this.map[n - 1][n] = 0;
    }

    walkable(gx, gy) {
        if (gx < 0 || gy < 0 || gx >= this.gridSize || gy >= this.gridSize) return false;
        if (this.map[gy][gx] !== 0) return false;
        return !this.bombs.some(b => Math.round(b.x) === gx && Math.round(b.y) === gy);
    }

    dropBomb(p) {
        const bx = Math.round(p.x);
        const by = Math.round(p.y);
        if (this.bombs.some(b => Math.round(b.x) === bx && Math.round(b.y) === by)) return;
        this.bombs.push({ x: bx, y: by, timer: 2.8, power: 2 });
        AudioManager.select();
    }

    explode(x, y, power) {
        this.addBlast(x, y);
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            for (let k = 1; k <= power; k++) {
                const cx = x + dx * k;
                const cy = y + dy * k;
                if (cx < 0 || cy < 0 || cx >= this.gridSize || cy >= this.gridSize) break;
                if (this.map[cy][cx] === 1) break;
                this.addBlast(cx, cy);
                if (this.map[cy][cx] === 2) {
                    this.map[cy][cx] = 0;
                    break;
                }
            }
        }
        AudioManager.wrong();
    }

    addBlast(gx, gy) {
        this.explosions.push({ x: gx, y: gy, timer: 0.55 });
    }

    hitByBlast(p) {
        const gx = Math.round(p.x);
        const gy = Math.round(p.y);
        return this.explosions.some(e => e.x === gx && e.y === gy);
    }

    cpuStep(dt) {
        const p = this.p2;
        const tx = Math.round(this.p1.x);
        const ty = Math.round(this.p1.y);
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        const speed = 3.2 * dt;

        if (Math.abs(tx - px) + Math.abs(ty - py) <= 3 && this.bombs.length < 3 && Math.random() < 0.02) {
            this.dropBomb(p);
        }

        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        let best = null;
        let bestScore = -999;
        for (const [dx, dy] of opts) {
            const nx = px + dx;
            const ny = py + dy;
            if (!this.walkable(nx, ny)) continue;
            const score = Math.abs(tx - nx) + Math.abs(ty - ny) - (this.explosions.some(e => e.x === nx && e.y === ny) ? 50 : 0);
            if (score > bestScore) { bestScore = score; best = [nx, ny]; }
        }
        if (best) {
            p.x += (best[0] - p.x) * speed * 2.5;
            p.y += (best[1] - p.y) * speed * 2.5;
        }
    }

    movePlayer(p, up, down, left, right, bombKey, dt) {
        if (!p.alive) return;
        const speed = 3.2 * dt;
        let nx = p.x, ny = p.y;
        if (Input.isDown(up)) ny -= speed;
        if (Input.isDown(down)) ny += speed;
        if (Input.isDown(left)) nx -= speed;
        if (Input.isDown(right)) nx += speed;
        const gx = Math.round(nx);
        const gy = Math.round(ny);
        if (this.walkable(gx, gy) || (Math.round(p.x) === gx && Math.round(p.y) === gy)) {
            p.x = nx;
            p.y = ny;
        }
        if (this.justPressed(bombKey)) this.dropBomb(p);
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        this.movePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', dt);
        if (GameManager.isSinglePlayer) this.cpuStep(dt);
        else this.movePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', dt);

        for (let i = this.bombs.length - 1; i >= 0; i--) {
            this.bombs[i].timer -= dt;
            if (this.bombs[i].timer <= 0) {
                const b = this.bombs.splice(i, 1)[0];
                this.explode(b.x, b.y, b.power);
            }
        }

        this.explosions = this.explosions.filter(e => {
            e.timer -= dt;
            return e.timer > 0;
        });

        if (this.p1.alive && this.hitByBlast(this.p1)) this.p1.alive = false;
        if (this.p2.alive && this.hitByBlast(this.p2)) this.p2.alive = false;

        if (!this.p1.alive || !this.p2.alive) {
            if (this.p1.alive && !this.p2.alive) {
                this.scoreP1++;
                this.roundMsg = 'P1 BLASTS CPU!';
                AudioManager.correct();
            } else if (this.p2.alive && !this.p1.alive) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 BLASTS P1!';
                AudioManager.wrong();
            } else {
                this.roundMsg = 'DOUBLE KO — no point';
                AudioManager.tick();
            }

            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else {
                this.msgTimer = 1.2;
                this.startRound();
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        const offX = (this.width - this.gridSize * this.cell) / 2;
        const offY = (this.height - this.gridSize * this.cell) / 2 + 10;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 28);

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const px = offX + x * this.cell;
                const py = offY + y * this.cell;
                if (this.map[y][x] === 1) {
                    ctx.fillStyle = '#444';
                    ctx.fillRect(px, py, this.cell, this.cell);
                } else if (this.map[y][x] === 2) {
                    ctx.fillStyle = '#a55';
                    ctx.fillRect(px + 3, py + 3, this.cell - 6, this.cell - 6);
                } else {
                    ctx.fillStyle = '#1a1a2a';
                    ctx.fillRect(px + 1, py + 1, this.cell - 2, this.cell - 2);
                }
            }
        }

        this.explosions.forEach(e => {
            ctx.fillStyle = Theme.accent;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(offX + e.x * this.cell, offY + e.y * this.cell, this.cell, this.cell);
        });
        ctx.globalAlpha = 1;

        this.bombs.forEach(b => {
            const cx = offX + b.x * this.cell + this.cell / 2;
            const cy = offY + b.y * this.cell + this.cell / 2;
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(cx, cy, this.cell * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(b.timer), cx, cy + 4);
        });

        const drawP = (p, color) => {
            if (!p.alive) return;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(offX + p.x * this.cell, offY + p.y * this.cell, this.cell * 0.32, 0, Math.PI * 2);
            ctx.fill();
        };
        drawP(this.p1, Theme.p1);
        drawP(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height - 24);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD move · SPACE bomb  |  Arrows · ENTER (2P)', this.width / 2, this.height - 6);
    }
}

GameManager.registerGame(new BomberMaze());
