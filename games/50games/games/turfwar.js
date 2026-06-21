class TurfWar extends GameBase {
    constructor() {
        super("Turf War", "Paint the most tiles in 30 seconds! First to 2 round wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.cellSize = 18;
        this.cols = Math.floor(w / this.cellSize);
        this.rows = Math.floor((h - 60) / this.cellSize);
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    startRound() {
        this.grid = new Array(this.cols * this.rows).fill(0);
        this.p1 = { x: 2, y: Math.floor(this.rows / 2) };
        this.p2 = { x: this.cols - 3, y: Math.floor(this.rows / 2) };
        this.cd1 = 0;
        this.cd2 = 0;
        this.timeLeft = 30;
        this.moveDelay = 0.08;
    }

    idx(x, y) {
        return y * this.cols + x;
    }

    paint(x, y, val) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
        this.grid[this.idx(x, y)] = val;
    }

    countTiles() {
        let c1 = 0, c2 = 0;
        this.grid.forEach(c => {
            if (c === 1) c1++;
            if (c === 2) c2++;
        });
        return { c1, c2 };
    }

    cpuMove() {
        const p = this.p2;
        const opts = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        let best = null;
        let bestScore = -1;
        for (const [dx, dy] of opts) {
            const nx = p.x + dx;
            const ny = p.y + dy;
            if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
            let score = this.grid[this.idx(nx, ny)] === 0 ? 3 : 0;
            for (const [dx2, dy2] of opts) {
                const ax = nx + dx2;
                const ay = ny + dy2;
                if (ax >= 0 && ay >= 0 && ax < this.cols && ay < this.rows && this.grid[this.idx(ax, ay)] === 0) score++;
            }
            if (this.grid[this.idx(nx, ny)] === 1) score += 2;
            if (score > bestScore) { bestScore = score; best = [nx, ny]; }
        }
        if (best) { p.x = best[0]; p.y = best[1]; }
    }

    tryMove(p, up, down, left, right, cdKey, dt) {
        if (this[cdKey] > 0) {
            this[cdKey] -= dt;
            return false;
        }
        let moved = false;
        if (Input.isDown(up) && p.y > 0) { p.y--; moved = true; }
        else if (Input.isDown(down) && p.y < this.rows - 1) { p.y++; moved = true; }
        else if (Input.isDown(left) && p.x > 0) { p.x--; moved = true; }
        else if (Input.isDown(right) && p.x < this.cols - 1) { p.x++; moved = true; }
        if (moved) this[cdKey] = this.moveDelay;
        return moved;
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            const { c1, c2 } = this.countTiles();
            if (c1 > c2) {
                this.scoreP1++;
                this.roundMsg = `P1 WINS ${c1}-${c2}!`;
                AudioManager.correct();
            } else if (c2 > c1) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? `CPU WINS ${c2}-${c1}!` : `P2 WINS ${c2}-${c1}!`;
                AudioManager.wrong();
            } else {
                this.roundMsg = `TIE ${c1}-${c2} — no point`;
                AudioManager.tick();
            }
            if (this.scoreP1 >= 2) GameManager.gameOver(1);
            else if (this.scoreP2 >= 2) GameManager.gameOver(2);
            else {
                this.msgTimer = 1.4;
                this.startRound();
            }
            return;
        }

        this.tryMove(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'cd1', dt);

        if (GameManager.isSinglePlayer) {
            if (this.cd2 <= 0) {
                this.cpuMove();
                this.cd2 = this.moveDelay;
            } else {
                this.cd2 -= dt;
            }
        } else {
            this.tryMove(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'cd2', dt);
        }

        this.paint(this.p1.x, this.p1.y, 1);
        this.paint(this.p2.x, this.p2.y, 2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        const offY = 55;
        const { c1, c2 } = this.countTiles();

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const v = this.grid[this.idx(x, y)];
                if (v === 1) {
                    ctx.fillStyle = Theme.p1;
                    ctx.fillRect(x * this.cellSize, offY + y * this.cellSize, this.cellSize, this.cellSize);
                } else if (v === 2) {
                    ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
                    ctx.fillRect(x * this.cellSize, offY + y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        ctx.fillStyle = Theme.fg;
        ctx.fillRect(this.p1.x * this.cellSize, offY + this.p1.y * this.cellSize, this.cellSize, this.cellSize);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.p2.x * this.cellSize, offY + this.p2.y * this.cellSize, this.cellSize, this.cellSize);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillRect(this.p2.x * this.cellSize + 3, offY + this.p2.y * this.cellSize + 3, this.cellSize - 6, this.cellSize - 6);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 2)  ·  Tiles: ${c1} vs ${c2}`, this.width / 2, 28);

        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, 38, this.width * (this.timeLeft / 30), 6);

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD paint trail · claim the most tiles in 30s', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new TurfWar());
