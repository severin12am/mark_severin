class BrickBreakerDuel extends GameBase {
    constructor() {
        super("Brick Breaker Duel", "Pong with a brick wall mid-court. Break through & score! First to 7 goals.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.half = w / 2;
        this.paddleH = 96;
        this.paddleW = 14;
        this.p1Y = h / 2 - this.paddleH / 2;
        this.p2Y = h / 2 - this.paddleH / 2;
        this.top = 52;
        this.bottom = h - 28;
        this.serveDelay = 0.7;
        this.flashTimer = 0;
        this.particles = [];
        this.buildBricks();
        this.resetBall(Math.random() > 0.5 ? 1 : -1);
    }

    buildBricks() {
        this.bricks = [];
        const cols = 6;
        const rows = 6;
        const bw = 26;
        const bh = 20;
        const gap = 7;
        const totalW = cols * bw + (cols - 1) * gap;
        const startX = this.half - totalW / 2;
        const startY = this.height * 0.22;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                this.bricks.push({
                    x: startX + c * (bw + gap),
                    y: startY + r * (bh + gap),
                    w: bw,
                    h: bh,
                    hp: r < 2 ? 2 : 1,
                    maxHp: r < 2 ? 2 : 1
                });
            }
        }
    }

    resetBall(dirX) {
        this.ball = {
            x: this.width / 2,
            y: this.height / 2 + (Math.random() - 0.5) * 80,
            vx: (dirX || 1) * (300 + Math.random() * 40),
            vy: (Math.random() - 0.5) * 220,
            r: 9
        };
        this.serveDelay = 0.65;
    }

    burst(x, y, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 50 + Math.random() * 120;
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0.3 + Math.random() * 0.3
            });
        }
    }

    checkWin() {
        if (this.scoreP1 >= 7) {
            GameManager.gameOver(1);
            return true;
        }
        if (this.scoreP2 >= 7) {
            GameManager.gameOver(2);
            return true;
        }
        return false;
    }

    update(dt) {
        if (this.flashTimer > 0) this.flashTimer -= dt;

        const move = 400 * dt;
        if (Input.isDown('KeyW')) this.p1Y -= move;
        if (Input.isDown('KeyS')) this.p1Y += move;

        if (GameManager.isSinglePlayer) {
            const target = this.ball.y - this.paddleH / 2 + (Math.random() - 0.5) * 24;
            const diff = target - this.p2Y;
            // lag a bit when ball moves away from CPU
            const factor = this.ball.vx > 0 ? 0.9 : 0.55;
            this.p2Y += Math.sign(diff) * Math.min(Math.abs(diff), move * factor);
        } else {
            if (Input.isDown('ArrowUp')) this.p2Y -= move;
            if (Input.isDown('ArrowDown')) this.p2Y += move;
        }

        const minY = this.top;
        const maxY = this.bottom - this.paddleH;
        this.p1Y = Math.max(minY, Math.min(maxY, this.p1Y));
        this.p2Y = Math.max(minY, Math.min(maxY, this.p2Y));

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        if (this.serveDelay > 0) {
            this.serveDelay -= dt;
            return;
        }

        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;

        if (this.ball.y - this.ball.r < this.top) {
            this.ball.y = this.top + this.ball.r;
            this.ball.vy = Math.abs(this.ball.vy);
            AudioManager.tick();
        }
        if (this.ball.y + this.ball.r > this.bottom) {
            this.ball.y = this.bottom - this.ball.r;
            this.ball.vy = -Math.abs(this.ball.vy);
            AudioManager.tick();
        }

        const p1X = 28;
        const p2X = this.width - 28 - this.paddleW;

        if (this.ball.vx < 0 &&
            this.ball.x - this.ball.r <= p1X + this.paddleW &&
            this.ball.x + this.ball.r >= p1X &&
            this.ball.y >= this.p1Y && this.ball.y <= this.p1Y + this.paddleH) {
            this.ball.x = p1X + this.paddleW + this.ball.r;
            const rel = (this.ball.y - (this.p1Y + this.paddleH / 2)) / (this.paddleH / 2);
            const speed = Math.min(Math.hypot(this.ball.vx, this.ball.vy) * 1.05, 760);
            const ang = rel * (Math.PI / 3.2);
            this.ball.vx = Math.cos(ang) * speed;
            this.ball.vy = Math.sin(ang) * speed;
            AudioManager.move();
        }

        if (this.ball.vx > 0 &&
            this.ball.x + this.ball.r >= p2X &&
            this.ball.x - this.ball.r <= p2X + this.paddleW &&
            this.ball.y >= this.p2Y && this.ball.y <= this.p2Y + this.paddleH) {
            this.ball.x = p2X - this.ball.r;
            const rel = (this.ball.y - (this.p2Y + this.paddleH / 2)) / (this.paddleH / 2);
            const speed = Math.min(Math.hypot(this.ball.vx, this.ball.vy) * 1.05, 760);
            const ang = Math.PI - rel * (Math.PI / 3.2);
            this.ball.vx = Math.cos(ang) * speed;
            this.ball.vy = Math.sin(ang) * speed;
            AudioManager.move();
        }

        for (const b of this.bricks) {
            if (b.hp <= 0) continue;
            if (this.ball.x + this.ball.r > b.x && this.ball.x - this.ball.r < b.x + b.w &&
                this.ball.y + this.ball.r > b.y && this.ball.y - this.ball.r < b.y + b.h) {
                const overlapL = this.ball.x + this.ball.r - b.x;
                const overlapR = b.x + b.w - (this.ball.x - this.ball.r);
                const overlapT = this.ball.y + this.ball.r - b.y;
                const overlapB = b.y + b.h - (this.ball.y - this.ball.r);
                const minX = Math.min(overlapL, overlapR);
                const minY = Math.min(overlapT, overlapB);
                if (minX < minY) {
                    this.ball.vx = -this.ball.vx;
                    this.ball.x += this.ball.vx > 0 ? minX : -minX;
                } else {
                    this.ball.vy = -this.ball.vy;
                    this.ball.y += this.ball.vy > 0 ? minY : -minY;
                }
                b.hp--;
                this.burst(b.x + b.w / 2, b.y + b.h / 2, b.hp <= 0 ? 8 : 3);
                AudioManager.tick();
                if (b.hp <= 0) AudioManager.select();
                break;
            }
        }

        if (this.ball.x < -this.ball.r) {
            this.scoreP2++;
            this.flashTimer = 0.4;
            AudioManager.wrong();
            if (this.checkWin()) return;
            this.resetBall(1);
        } else if (this.ball.x > this.width + this.ball.r) {
            this.scoreP1++;
            this.flashTimer = 0.4;
            AudioManager.correct();
            if (this.checkWin()) return;
            this.resetBall(-1);
        }

        // rebuild wall when fully cleared
        if (this.bricks.every(b => b.hp <= 0)) {
            this.buildBricks();
            AudioManager.correct();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(this.half, this.top);
        ctx.lineTo(this.half, this.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.strokeRect(12, this.top - 4, this.width - 24, this.bottom - this.top + 8);

        for (const b of this.bricks) {
            if (b.hp <= 0) continue;
            const t = b.hp / b.maxHp;
            ctx.fillStyle = t > 0.5 ? Theme.accent : Theme.fg;
            ctx.globalAlpha = 0.55 + t * 0.45;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = Theme.bg;
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        }

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(28, this.p1Y, this.paddleW, this.paddleH);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillRect(this.width - 28 - this.paddleW, this.p2Y, this.paddleW, this.paddleH);

        if (this.serveDelay <= 0) {
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(this.ball.x - 2, this.ball.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SERVE', this.width / 2, this.height / 2);
        }

        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life * 2.2);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.22, 36);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.78, 36);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('goals first to 7 · smash the wall', this.width / 2, 36);

        ctx.fillStyle = Theme.fg;
        ctx.font = '12px Arial';
        ctx.fillText('W/S · ↑/↓ paddles', this.width / 2, this.height - 10);

        if (this.flashTimer > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 0.18})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}

GameManager.registerGame(new BrickBreakerDuel());
