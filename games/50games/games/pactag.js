class PacTag extends GameBase {
    constructor() {
        super("Pac-Tag", "Ghost chases runner on the maze! Tag to swap — first to 5 tags.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.startRound();
    }

    startRound() {
        this.cols = 19;
        this.rows = 13;
        this.cell = Math.min(36, (this.width - 40) / this.cols);
        this.ox = (this.width - this.cols * this.cell) / 2;
        this.oy = 72;

        this.maze = [
            '###################',
            '#.................#',
            '#.###.#####.###..#',
            '#.#.......#.....#',
            '#.#.###.#.#.###.#',
            '#...#...#.....#.#',
            '###.#.#####.###.#',
            '#.....#.......#.#',
            '#.#####.###.#.#.#',
            '#.......#...#...#',
            '#.#####.#.#####.#',
            '#.................#',
            '###################'
        ];

        this.p1 = { gx: 1, gy: 1, x: 0, y: 0, hunter: false };
        this.p2 = { gx: 17, gy: 11, x: 0, y: 0, hunter: true };
        this.syncWorldPos(this.p1);
        this.syncWorldPos(this.p2);
        this.tagFlash = 0;
        this.tagMsg = '';
        this.passCd = 0;
    }

    syncWorldPos(p) {
        p.x = this.ox + p.gx * this.cell + this.cell / 2;
        p.y = this.oy + p.gy * this.cell + this.cell / 2;
    }

    isOpen(gx, gy) {
        if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return false;
        return this.maze[gy][gx] === '.';
    }

    tryMove(p, dx, dy) {
        const nx = p.gx + dx;
        const ny = p.gy + dy;
        if (!this.isOpen(nx, ny)) return;
        p.gx = nx;
        p.gy = ny;
        this.syncWorldPos(p);
    }

    update(dt) {
        const speed = 210 * dt;
        this.passCd = Math.max(0, this.passCd - dt);
        if (this.tagFlash > 0) this.tagFlash -= dt;

        const movePlayer = (p, up, down, left, right, isCpu) => {
            let dx = 0;
            let dy = 0;
            if (isCpu) {
                const target = this.p1.hunter ? this.p2 : this.p1;
                const flee = p.hunter ? target : this.p1;
                const tx = p.hunter ? target.gx : flee.gx;
                const ty = p.hunter ? target.gy : flee.gy;
                if (Math.abs(p.gx - tx) > Math.abs(p.gy - ty)) dx = Math.sign(tx - p.gx);
                else dy = Math.sign(ty - p.gy);
            } else {
                if (Input.isDown(up)) dy = -1;
                if (Input.isDown(down)) dy = 1;
                if (Input.isDown(left)) dx = -1;
                if (Input.isDown(right)) dx = 1;
            }
            if (dx || dy) {
                const len = Math.hypot(dx, dy) || 1;
                const step = (p.hunter ? speed * 1.05 : speed * 1.12) / this.cell;
                const ogx = p.gx;
                const ogy = p.gy;
                if (Math.abs(dx) >= Math.abs(dy)) this.tryMove(p, Math.sign(dx), 0);
                else this.tryMove(p, 0, Math.sign(dy));
                if (p.gx === ogx && p.gy === ogy) {
                    if (dx) this.tryMove(p, Math.sign(dx), 0);
                    if (dy) this.tryMove(p, 0, Math.sign(dy));
                }
            }
        };

        movePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', false);
        if (GameManager.isSinglePlayer) {
            movePlayer(this.p2, '', '', '', '', true);
        } else {
            movePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', false);
        }

        if (this.passCd <= 0 && this.p1.gx === this.p2.gx && this.p1.gy === this.p2.gy) {
            const taggerWasP2 = this.p2.hunter;
            this.p1.hunter = !this.p1.hunter;
            this.p2.hunter = !this.p2.hunter;
            if (taggerWasP2) {
                this.scoreP2++;
                this.tagMsg = GameManager.isSinglePlayer ? 'CPU TAGGED!' : 'P2 TAGGED!';
            } else {
                this.scoreP1++;
                this.tagMsg = 'P1 TAGGED!';
            }
            AudioManager.correct();
            this.tagFlash = 0.6;
            this.passCd = 0.8;
            if (this.scoreP1 >= 5) GameManager.gameOver(1);
            else if (this.scoreP2 >= 5) GameManager.gameOver(2);
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Tags: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 36);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Stay on the paths — ghost tags runner to swap roles!', this.width / 2, 58);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const px = this.ox + x * this.cell;
                const py = this.oy + y * this.cell;
                if (this.maze[y][x] === '#') {
                    ctx.fillStyle = Theme.fg;
                    ctx.fillRect(px, py, this.cell, this.cell);
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.06)';
                    ctx.fillRect(px + 2, py + 2, this.cell - 4, this.cell - 4);
                }
            }
        }

        const drawPac = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.cell * 0.32, 0, Math.PI * 2);
            ctx.fill();
            if (p.hunter) {
                ctx.strokeStyle = Theme.accent;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.hunter ? 'GHOST' : 'RUN', p.x, p.y - this.cell * 0.45);
            ctx.fillText(label, p.x, p.y + this.cell * 0.55);
        };

        drawPac(this.p1, Theme.p1, 'P1');
        drawPac(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.tagFlash > 0) {
            ctx.fillStyle = `rgba(255,230,0,${this.tagFlash})`;
            ctx.font = 'bold 32px Impact';
            ctx.fillText(this.tagMsg, this.width / 2, this.height - 40);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD / Arrows — runner is slightly faster', this.width / 2, this.height - 14);
    }
}

GameManager.registerGame(new PacTag());
