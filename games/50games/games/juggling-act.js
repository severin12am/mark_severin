class JugglingAct extends GameBase {
    constructor() {
        super("Juggling Act", "Keep balls in the air! Catch to score. Highest after 45s or first to 35.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.half = w / 2;
        this.timeLeft = 45;
        this.gravity = 720;
        this.p1 = { x: this.half * 0.5, y: h - 48, w: 100, h: 16 };
        this.p2 = { x: this.half * 1.5, y: h - 48, w: 100, h: 16 };
        this.p1Balls = this.createBalls(this.half * 0.5);
        this.p2Balls = this.createBalls(this.half * 1.5);
        this.popups = [];
    }

    createBalls(cx) {
        const balls = [];
        for (let i = 0; i < 3; i++) {
            balls.push({
                x: cx + (i - 1) * 36,
                y: 100 + i * 50,
                vx: (Math.random() - 0.5) * 40,
                vy: 40 + Math.random() * 50,
                r: 12,
                active: true,
                respawn: 0
            });
        }
        return balls;
    }

    checkWin() {
        if (this.scoreP1 >= 35) {
            GameManager.gameOver(1);
            return true;
        }
        if (this.scoreP2 >= 35) {
            GameManager.gameOver(2);
            return true;
        }
        return false;
    }

    updateBalls(balls, paddle, isP1, leftBound, rightBound, dt) {
        for (const b of balls) {
            if (!b.active) {
                b.respawn -= dt;
                if (b.respawn <= 0) {
                    b.active = true;
                    b.x = (leftBound + rightBound) / 2 + (Math.random() - 0.5) * 50;
                    b.y = 70 + Math.random() * 40;
                    b.vx = (Math.random() - 0.5) * 60;
                    b.vy = 50 + Math.random() * 40;
                }
                continue;
            }

            b.vy += this.gravity * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // soft side bounce within lane
            if (b.x - b.r < leftBound + 8) {
                b.x = leftBound + 8 + b.r;
                b.vx = Math.abs(b.vx) * 0.8;
            }
            if (b.x + b.r > rightBound - 8) {
                b.x = rightBound - 8 - b.r;
                b.vx = -Math.abs(b.vx) * 0.8;
            }

            // paddle bounce
            if (b.vy > 0 &&
                b.y + b.r >= paddle.y &&
                b.y - b.r <= paddle.y + paddle.h &&
                b.x >= paddle.x - paddle.w / 2 &&
                b.x <= paddle.x + paddle.w / 2) {
                const rel = (b.x - paddle.x) / (paddle.w / 2);
                b.vy = -(320 + Math.random() * 90);
                b.vx = rel * 180 + (Math.random() - 0.5) * 30;
                b.y = paddle.y - b.r;
                if (isP1) this.scoreP1 += 1;
                else this.scoreP2 += 1;
                this.popups.push({
                    x: b.x,
                    y: paddle.y - 20,
                    text: '+1',
                    life: 0.45,
                    color: Theme.accent
                });
                AudioManager.tick();
            }

            // ceiling soft
            if (b.y - b.r < 40) {
                b.y = 40 + b.r;
                b.vy = Math.abs(b.vy) * 0.4;
            }

            // drop
            if (b.y > this.height + 20) {
                b.active = false;
                b.respawn = 0.85;
                if (isP1) this.scoreP1 = Math.max(0, this.scoreP1 - 2);
                else this.scoreP2 = Math.max(0, this.scoreP2 - 2);
                this.popups.push({
                    x: paddle.x,
                    y: paddle.y - 30,
                    text: '-2',
                    life: 0.55,
                    color: Theme.p1
                });
                AudioManager.wrong();
            }
        }
    }

    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            if (this.scoreP1 > this.scoreP2) GameManager.gameOver(1);
            else if (this.scoreP2 > this.scoreP1) GameManager.gameOver(2);
            else GameManager.gameOver(0);
            return;
        }

        const move = 360 * dt;
        if (Input.isDown('KeyA')) this.p1.x -= move;
        if (Input.isDown('KeyD')) this.p1.x += move;
        // Space = slight upward flick boost on nearest falling ball
        if (Input.isDown('Space')) {
            for (const b of this.p1Balls) {
                if (!b.active || b.vy < 0) continue;
                if (Math.abs(b.x - this.p1.x) < this.p1.w * 0.55 && b.y > this.p1.y - 70 && b.y < this.p1.y) {
                    b.vy -= 900 * dt;
                }
            }
        }
        this.p1.x = Math.max(this.p1.w / 2 + 16, Math.min(this.half - this.p1.w / 2 - 16, this.p1.x));

        if (GameManager.isSinglePlayer) {
            // track lowest falling ball with lag
            let target = null;
            let best = -1;
            for (const b of this.p2Balls) {
                if (!b.active || b.vy <= 0) continue;
                if (b.y > best) { best = b.y; target = b; }
            }
            if (target) {
                const aim = target.x + (Math.random() - 0.5) * 20;
                const dx = aim - this.p2.x;
                if (Math.abs(dx) > 6) this.p2.x += Math.sign(dx) * Math.min(Math.abs(dx), move * 0.85);
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= move;
            if (Input.isDown('ArrowRight')) this.p2.x += move;
            if (Input.isDown('Enter')) {
                for (const b of this.p2Balls) {
                    if (!b.active || b.vy < 0) continue;
                    if (Math.abs(b.x - this.p2.x) < this.p2.w * 0.55 && b.y > this.p2.y - 70 && b.y < this.p2.y) {
                        b.vy -= 900 * dt;
                    }
                }
            }
        }
        this.p2.x = Math.max(this.half + this.p2.w / 2 + 16, Math.min(this.width - this.p2.w / 2 - 16, this.p2.x));

        this.updateBalls(this.p1Balls, this.p1, true, 0, this.half, dt);
        this.updateBalls(this.p2Balls, this.p2, false, this.half, this.width, dt);

        for (let i = this.popups.length - 1; i >= 0; i--) {
            this.popups[i].y -= 40 * dt;
            this.popups[i].life -= dt;
            if (this.popups[i].life <= 0) this.popups.splice(i, 1);
        }

        if (this.checkWin()) return;
    }

    drawSide(ctx, paddle, balls, color, label, ox, sideW) {
        // floor
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox + 10, this.height - 36, sideW - 20, 20);

        // paddle
        ctx.fillStyle = color;
        ctx.fillRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h);
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, paddle.x, paddle.y + 30);

        for (const b of balls) {
            if (!b.active) {
                // faint ghost while waiting
                ctx.globalAlpha = 0.15;
                ctx.strokeStyle = Theme.fg;
                ctx.beginPath();
                ctx.arc((ox + ox + sideW) / 2, 90, b.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                continue;
            }
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.half, 0);
        ctx.lineTo(this.half, this.height);
        ctx.stroke();

        // arena frames
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 40, this.half - 24, this.height - 56);
        ctx.strokeRect(this.half + 12, 40, this.half - 24, this.height - 56);

        this.drawSide(ctx, this.p1, this.p1Balls, Theme.p1, 'P1', 0, this.half);
        this.drawSide(ctx, this.p2, this.p2Balls,
            GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2',
            this.half, this.half);

        for (const p of this.popups) {
            ctx.globalAlpha = Math.max(0, p.life * 1.5);
            ctx.fillStyle = p.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.half * 0.5, 30);
        ctx.fillText(`${this.scoreP2}`, this.half * 1.5, 30);
        ctx.fillStyle = Theme.accent;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`${Math.ceil(this.timeLeft)}s`, this.width / 2, 30);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.fg;
        ctx.fillText('A/D or ←/→ move · SPACE / ENTER boost · drop = −2 · first to 35', this.width / 2, this.height - 10);
    }
}

GameManager.registerGame(new JugglingAct());
