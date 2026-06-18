// paint-roller.js
class PaintRoller extends GameBase {
    constructor() {
        super("Paint Roller", "Roll and paint the floor! Most area wins.");
    }

    init(w, h) {
        super.init(w, h);
        this.width = w;
        this.height = h;
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.grid = Array(25).fill().map(() => Array(40).fill(0)); // 0=empty, 1=P1, 2=P2
        this.p1 = {x: 150, y: 450, vx: 0, vy: 0};
        this.p2 = {x: 650, y: 450, vx: 0, vy: 0};
        this.timer = 0;
    }

    update(dt) {
        this.timer += dt;

        // P1
        this.p1.vx = 0; this.p1.vy = 0;
        if (Input.isDown('KeyA')) this.p1.vx = -220;
        if (Input.isDown('KeyD')) this.p1.vx = 220;
        if (Input.isDown('KeyW')) this.p1.vy = -220;
        if (Input.isDown('KeyS')) this.p1.vy = 220;
        this.p1.x += this.p1.vx * dt;
        this.p1.y += this.p1.vy * dt;

        // P2 / CPU
        this.p2.vx = 0; this.p2.vy = 0;
        if (GameManager.isSinglePlayer) {
            this.p2.vx = (this.p1.x - this.p2.x) * 1.1;
            this.p2.vy = (this.p1.y - this.p2.y) * 1.1;
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.vx = -220;
            if (Input.isDown('ArrowRight')) this.p2.vx = 220;
            if (Input.isDown('ArrowUp')) this.p2.vy = -220;
            if (Input.isDown('ArrowDown')) this.p2.vy = 220;
        }
        this.p2.x += this.p2.vx * dt;
        this.p2.y += this.p2.vy * dt;

        this.clampPlayers();

        this.paintCell(this.p1.x, this.p1.y, 1);
        this.paintCell(this.p2.x, this.p2.y, 2);

        if (this.timer > 28) {
            let count1 = 0, count2 = 0;
            for (let row of this.grid) for (let cell of row) {
                if (cell === 1) count1++;
                if (cell === 2) count2++;
            }
            if (count1 > count2) this.scoreP1++;
            else if (count2 > count1) this.scoreP2++;
            if (this.scoreP1 >= 5 || this.scoreP2 >= 5) GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
            else this.init(this.width, this.height); // new round
        }
    }

    clampPlayers() {
        this.p1.x = Math.max(40, Math.min(this.width - 40, this.p1.x));
        this.p1.y = Math.max(40, Math.min(this.height - 100, this.p1.y));
        this.p2.x = Math.max(40, Math.min(this.width - 40, this.p2.x));
        this.p2.y = Math.max(40, Math.min(this.height - 100, this.p2.y));
    }

    paintCell(x, y, owner) {
        const gx = Math.floor(x / 20);
        const gy = Math.floor(y / 20);
        if (gx >= 0 && gx < 40 && gy >= 0 && gy < 25) {
            if (this.grid[gy][gx] === 0) this.grid[gy][gx] = owner;
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Painted floor
        for (let y = 0; y < 25; y++) {
            for (let x = 0; x < 40; x++) {
                if (this.grid[y][x] === 1) {
                    ctx.fillStyle = Theme.p1;
                    ctx.fillRect(x * 20, y * 20, 20, 20);
                } else if (this.grid[y][x] === 2) {
                    ctx.fillStyle = Theme.p2;
                    ctx.fillRect(x * 20, y * 20, 20, 20);
                }
            }
        }

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x - 18, this.p1.y - 18, 36, 36);
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x - 18, this.p2.y - 18, 36, 36);

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 42px sans-serif";
        ctx.fillText(this.scoreP1, 180, 70);
        ctx.fillText(this.scoreP2, 620, 70);
    }
}

GameManager.registerGame(new PaintRoller());