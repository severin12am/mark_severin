// games/mazerunner.js
class MazeRunner extends GameBase {
    constructor() {
        super("Maze Runner", "Race to the golden key in the center!");
        this.reset();
    }

    reset() {
        this.mazeSize = 15;
        this.cell = 800 / this.mazeSize;
        this.map = [];
        this.players = [
            { x: 1, y: 1, color: Theme.p1 },
            { x: this.mazeSize - 2, y: this.mazeSize - 2, color: Theme.p2 }
        ];
        this.keyX = Math.floor(this.mazeSize / 2);
        this.keyY = Math.floor(this.mazeSize / 2);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.generateMaze();
    }

    generateMaze() {
        this.map = Array(this.mazeSize).fill().map(() => Array(this.mazeSize).fill(1));
        // simple recursive backtracker (light version)
        const stack = [[1,1]];
        this.map[1][1] = 0;
        while (stack.length) {
            let [x,y] = stack[stack.length-1];
            let dirs = [[0,-2],[0,2],[2,0],[-2,0]].sort(()=>Math.random()-0.5);
            let carved = false;
            for (let [dx,dy] of dirs) {
                let nx = x + dx, ny = y + dy;
                if (nx > 0 && nx < this.mazeSize-1 && ny > 0 && ny < this.mazeSize-1 && this.map[ny][nx] === 1) {
                    this.map[ny][nx] = 0;
                    this.map[y + dy/2][x + dx/2] = 0;
                    stack.push([nx,ny]);
                    carved = true;
                    break;
                }
            }
            if (!carved) stack.pop();
        }
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            let speed = 5.5;
            let dx = 0, dy = 0;

            const keys = i === 0 ?
                {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'} :
                (GameManager.isSinglePlayer ? {} : {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'});

            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.up))    dy -= 1;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.down))  dy += 1;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.left))  dx -= 1;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.right)) dx += 1;

            if (GameManager.isSinglePlayer && i === 1) {
                // CPU heads toward key
                dx = this.keyX - p.x;
                dy = this.keyY - p.y;
            }

            let len = Math.hypot(dx, dy) || 1;
            let nx = p.x + (dx / len) * speed * dt;
            let ny = p.y + (dy / len) * speed * dt;

            // collision check
            if (this.map[Math.floor(ny)][Math.floor(nx)] === 0) {
                p.x = nx;
                p.y = ny;
            }

            // reached key?
            if (Math.floor(p.x) === this.keyX && Math.floor(p.y) === this.keyY) {
                if (i === 0) this.scoreP1++; else this.scoreP2++;
                GameManager.gameOver(i === 0 ? 1 : 2);
                return;
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // maze walls
        ctx.fillStyle = Theme.fg;
        for (let y = 0; y < this.mazeSize; y++) {
            for (let x = 0; x < this.mazeSize; x++) {
                if (this.map[y][x] === 1) {
                    ctx.fillRect(x * this.cell, y * this.cell, this.cell, this.cell);
                }
            }
        }

        // golden key
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.keyX * this.cell + this.cell/2, this.keyY * this.cell + this.cell/2, 18, 0, Math.PI * 2);
        ctx.fill();

        // players
        for (let p of this.players) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x * this.cell + this.cell/2, p.y * this.cell + this.cell/2, this.cell * 0.38, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

GameManager.registerGame(new MazeRunner());