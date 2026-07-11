class PaintRoller extends GameBase {
    constructor() {
        super("Paint Roller", "Paint the floor! Most tiles when time's up wins the round. First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.cols = 32;
        this.rows = 18;
        this.cellW = 0;
        this.cellH = 0;
        this.roundTime = 20;
        this.resetRound();
    }

    resetRound() {
        this.cellW = this.width / this.cols;
        this.cellH = (this.height - 70) / this.rows;
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
        this.p1 = { x: this.width * 0.25, y: this.height * 0.6, r: 14 };
        this.p2 = { x: this.width * 0.75, y: this.height * 0.6, r: 14 };
        this.timer = this.roundTime;
        this.roundMsg = '';
        this.roundPause = 0;
        this.cpuTarget = null;
        this.cpuRetarget = 0;
        this.count1 = 0;
        this.count2 = 0;
    }

    paintAt(x, y, owner) {
        const gy = Math.floor((y - 60) / this.cellH);
        const gx = Math.floor(x / this.cellW);
        if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return;
        // Brush paints a small area
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = gx + dx;
                const cy = gy + dy;
                if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) {
                    if (Math.abs(dx) + Math.abs(dy) <= 1) {
                        this.grid[cy][cx] = owner;
                    }
                }
            }
        }
    }

    recount() {
        let c1 = 0, c2 = 0;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === 1) c1++;
                else if (this.grid[y][x] === 2) c2++;
            }
        }
        this.count1 = c1;
        this.count2 = c2;
    }

    findEmptyNear(px, py) {
        const gx = Math.floor(px / this.cellW);
        const gy = Math.floor((py - 60) / this.cellH);
        let best = null;
        let bestD = 1e9;
        // Prefer empty, else enemy paint
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === 2) continue;
                const d = Math.hypot(x - gx, y - gy) + (this.grid[y][x] === 1 ? 2 : 0);
                // Bias toward emptiness + randomness
                const score = d + Math.random() * 4;
                if (score < bestD) {
                    bestD = score;
                    best = { x: (x + 0.5) * this.cellW, y: 60 + (y + 0.5) * this.cellH };
                }
            }
        }
        return best;
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        const speed = 260;
        const top = 60 + this.p1.r;
        const bot = this.height - 20 - this.p1.r;
        const left = this.p1.r + 4;
        const right = this.width - this.p1.r - 4;

        // P1
        let dx1 = 0, dy1 = 0;
        if (Input.isDown('KeyA')) dx1 -= 1;
        if (Input.isDown('KeyD')) dx1 += 1;
        if (Input.isDown('KeyW')) dy1 -= 1;
        if (Input.isDown('KeyS')) dy1 += 1;
        if (dx1 !== 0 || dy1 !== 0) {
            const mag = Math.hypot(dx1, dy1);
            this.p1.x += (dx1 / mag) * speed * dt;
            this.p1.y += (dy1 / mag) * speed * dt;
        }

        // P2 / CPU
        if (GameManager.isSinglePlayer) {
            this.cpuRetarget -= dt;
            if (!this.cpuTarget || this.cpuRetarget <= 0) {
                this.cpuTarget = this.findEmptyNear(this.p2.x, this.p2.y);
                this.cpuRetarget = 0.35 + Math.random() * 0.45;
            }
            if (this.cpuTarget) {
                let dx = this.cpuTarget.x - this.p2.x;
                let dy = this.cpuTarget.y - this.p2.y;
                const d = Math.hypot(dx, dy) || 1;
                // Imperfect: occasional drift
                if (Math.random() < 0.02) {
                    dx += (Math.random() - 0.5) * 80;
                    dy += (Math.random() - 0.5) * 80;
                }
                this.p2.x += (dx / d) * speed * 0.82 * dt;
                this.p2.y += (dy / d) * speed * 0.82 * dt;
                if (d < 18) this.cpuRetarget = 0;
            }
        } else {
            let dx2 = 0, dy2 = 0;
            if (Input.isDown('ArrowLeft')) dx2 -= 1;
            if (Input.isDown('ArrowRight')) dx2 += 1;
            if (Input.isDown('ArrowUp')) dy2 -= 1;
            if (Input.isDown('ArrowDown')) dy2 += 1;
            if (dx2 !== 0 || dy2 !== 0) {
                const mag = Math.hypot(dx2, dy2);
                this.p2.x += (dx2 / mag) * speed * dt;
                this.p2.y += (dy2 / mag) * speed * dt;
            }
        }

        this.p1.x = Math.max(left, Math.min(right, this.p1.x));
        this.p1.y = Math.max(top, Math.min(bot, this.p1.y));
        this.p2.x = Math.max(left, Math.min(right, this.p2.x));
        this.p2.y = Math.max(top, Math.min(bot, this.p2.y));

        this.paintAt(this.p1.x, this.p1.y, 1);
        this.paintAt(this.p2.x, this.p2.y, 2);
        this.recount();

        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = 0;
            if (this.count1 > this.count2) {
                this.scoreP1++;
                this.roundMsg = 'P1 PAINTS MORE!';
                AudioManager.correct();
            } else if (this.count2 > this.count1) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU PAINTS MORE!' : 'P2 PAINTS MORE!';
                AudioManager.correct();
            } else {
                this.roundMsg = 'TIE ROUND!';
                AudioManager.tick();
            }
            this.roundPause = 1.3;
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floor grid
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                const px = x * this.cellW;
                const py = 60 + y * this.cellH;
                if (cell === 1) {
                    ctx.fillStyle = Theme.p1;
                    ctx.globalAlpha = 0.85;
                    ctx.fillRect(px, py, this.cellW + 0.5, this.cellH + 0.5);
                } else if (cell === 2) {
                    ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
                    ctx.globalAlpha = 0.85;
                    ctx.fillRect(px, py, this.cellW + 0.5, this.cellH + 0.5);
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.04)';
                    ctx.fillRect(px, py, this.cellW - 1, this.cellH - 1);
                }
            }
        }
        ctx.globalAlpha = 1;

        const drawRoller = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(p.x - 3, p.y - p.r - 10, 6, 12);
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + p.r + 14);
        };

        drawRoller(this.p1, Theme.p1, 'P1');
        drawRoller(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        // HUD
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, 58);
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Rounds ${this.scoreP1} — ${this.scoreP2}  |  Paint ${this.count1} — ${this.count2}  |  ${this.timer.toFixed(1)}s`,
            this.width / 2, 24
        );
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('WASD / Arrows paint floor · most tiles when time ends · first to 3 rounds', this.width / 2, 46);

        // Timer bar
        const barW = this.width * 0.5;
        const t = this.timer / this.roundTime;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(this.width / 2 - barW / 2, this.height - 14, barW, 6);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.width / 2 - barW / 2, this.height - 14, barW * t, 6);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 32px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
            ctx.font = '18px Arial';
            ctx.fillStyle = Theme.fg;
            ctx.fillText(`${this.count1} vs ${this.count2} tiles`, this.width / 2, this.height / 2 + 36);
        }
    }
}

GameManager.registerGame(new PaintRoller());
