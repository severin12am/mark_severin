class SpeedGolf extends GameBase {
    constructor() {
        super("Speed Golf", "Putt into the hole first! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.hole = { x: this.width / 2, y: this.height / 2 + 10, r: 16 };
        this.b1 = {
            x: 70, y: 90, vx: 0, vy: 0,
            charge: 0, aiming: true, angle: 0.4, actionHeld: false, r: 9
        };
        this.b2 = {
            x: this.width - 70, y: this.height - 80, vx: 0, vy: 0,
            charge: 0, aiming: true, angle: Math.PI + 0.4, actionHeld: false, r: 9
        };
        this.obs = [
            { x: this.width / 2 - 120, y: this.height * 0.28, w: 240, h: 18 },
            { x: this.width / 2 - 120, y: this.height * 0.72, w: 240, h: 18 },
            { x: this.width * 0.22, y: this.height / 2 - 50, w: 18, h: 100 },
            { x: this.width * 0.78 - 18, y: this.height / 2 - 50, w: 18, h: 100 }
        ];
        this.roundMsg = '';
        this.roundPause = 0;
        this.cpuAimT = 0.4 + Math.random() * 0.5;
    }

    scoreHole(winner) {
        if (winner === 1) {
            this.scoreP1++;
            this.roundMsg = 'P1 HOLE!';
            AudioManager.correct();
        } else {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU HOLE!' : 'P2 HOLE!';
            AudioManager.correct();
        }
        this.roundPause = 1.2;
    }

    updateBall(b, action, left, right, isCpu, dt) {
        const friction = Math.pow(0.985, dt * 60);
        const turnSp = 2.4;
        const maxCharge = 1.15;
        const powerScale = 420;

        if (b.aiming) {
            if (!isCpu) {
                if (Input.isDown(left)) b.angle -= turnSp * dt;
                if (Input.isDown(right)) b.angle += turnSp * dt;
                const holding = Input.isDown(action);
                if (holding) {
                    b.charge = Math.min(maxCharge, b.charge + dt);
                } else if (b.actionHeld && b.charge > 0.08) {
                    b.vx = Math.cos(b.angle) * b.charge * powerScale;
                    b.vy = Math.sin(b.angle) * b.charge * powerScale;
                    b.charge = 0;
                    b.aiming = false;
                    AudioManager.move();
                } else {
                    b.charge = 0;
                }
                b.actionHeld = holding;
            }
            return;
        }

        b.vx *= friction;
        b.vy *= friction;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Walls
        const pad = 18;
        if (b.x < pad) { b.x = pad; b.vx = Math.abs(b.vx); AudioManager.tick(); }
        if (b.x > this.width - pad) { b.x = this.width - pad; b.vx = -Math.abs(b.vx); AudioManager.tick(); }
        if (b.y < pad + 50) { b.y = pad + 50; b.vy = Math.abs(b.vy); AudioManager.tick(); }
        if (b.y > this.height - pad) { b.y = this.height - pad; b.vy = -Math.abs(b.vy); AudioManager.tick(); }

        // Obstacles
        this.obs.forEach(o => {
            if (b.x + b.r > o.x && b.x - b.r < o.x + o.w &&
                b.y + b.r > o.y && b.y - b.r < o.y + o.h) {
                const cx = Math.max(o.x, Math.min(b.x, o.x + o.w));
                const cy = Math.max(o.y, Math.min(b.y, o.y + o.h));
                const ox = b.x - cx;
                const oy = b.y - cy;
                if (Math.abs(ox) > Math.abs(oy)) {
                    b.vx *= -0.85;
                    b.x += Math.sign(ox || 1) * 3;
                } else {
                    b.vy *= -0.85;
                    b.y += Math.sign(oy || 1) * 3;
                }
                AudioManager.tick();
            }
        });

        if (Math.hypot(b.vx, b.vy) < 18) {
            b.vx = 0;
            b.vy = 0;
            b.aiming = true;
            b.charge = 0;
        }
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

        this.updateBall(this.b1, 'Space', 'KeyA', 'KeyD', false, dt);

        if (GameManager.isSinglePlayer) {
            const b = this.b2;
            if (b.aiming) {
                this.cpuAimT -= dt;
                const tx = this.hole.x - b.x;
                const ty = this.hole.y - b.y;
                let target = Math.atan2(ty, tx);
                // Imperfect aim + slight obstacle avoidance bias
                target += (Math.random() - 0.5) * 0.08;
                let diff = target - b.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                b.angle += Math.sign(diff) * Math.min(Math.abs(diff), 2.0 * dt);

                const dist = Math.hypot(tx, ty);
                const wantCharge = Math.min(1.1, 0.25 + dist / 520);
                b.charge = Math.min(wantCharge, b.charge + dt * 0.7);

                if (this.cpuAimT <= 0 && Math.abs(diff) < 0.25 && b.charge >= wantCharge * 0.85) {
                    // Occasional mis-hit power
                    const power = b.charge * (0.85 + Math.random() * 0.3);
                    b.vx = Math.cos(b.angle) * power * 420;
                    b.vy = Math.sin(b.angle) * power * 420;
                    b.charge = 0;
                    b.aiming = false;
                    this.cpuAimT = 0.5 + Math.random() * 0.7;
                    AudioManager.move();
                }
            } else {
                this.updateBall(b, 'Enter', 'ArrowLeft', 'ArrowRight', true, dt);
            }
        } else {
            this.updateBall(this.b2, 'Enter', 'ArrowLeft', 'ArrowRight', false, dt);
        }

        // Hole sink when slow enough
        const trySink = (b, id) => {
            const d = Math.hypot(b.x - this.hole.x, b.y - this.hole.y);
            const speed = Math.hypot(b.vx, b.vy);
            if (d < this.hole.r - 2 && speed < 160) {
                this.scoreHole(id);
                return true;
            }
            // Soft pull near hole
            if (d < this.hole.r + 10 && speed < 90) {
                b.x += (this.hole.x - b.x) * 4 * dt;
                b.y += (this.hole.y - b.y) * 4 * dt;
            }
            return false;
        };

        if (trySink(this.b1, 1)) return;
        if (trySink(this.b2, 2)) return;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Green
        ctx.fillStyle = 'rgba(40,120,60,0.18)';
        ctx.fillRect(20, 55, this.width - 40, this.height - 75);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 55, this.width - 40, this.height - 75);

        // Obstacles
        ctx.fillStyle = Theme.fg;
        this.obs.forEach(o => {
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(o.x, o.y, o.w, 3);
            ctx.fillStyle = Theme.fg;
        });

        // Hole
        ctx.fillStyle = Theme.bg;
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y, this.hole.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Flag
        ctx.strokeStyle = Theme.fg;
        ctx.beginPath();
        ctx.moveTo(this.hole.x + this.hole.r - 2, this.hole.y);
        ctx.lineTo(this.hole.x + this.hole.r - 2, this.hole.y - 36);
        ctx.stroke();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.moveTo(this.hole.x + this.hole.r - 2, this.hole.y - 36);
        ctx.lineTo(this.hole.x + this.hole.r + 16, this.hole.y - 28);
        ctx.lineTo(this.hole.x + this.hole.r - 2, this.hole.y - 20);
        ctx.fill();

        const drawBall = (b, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, b.x, b.y + b.r + 12);

            if (b.aiming) {
                const len = 28 + b.charge * 50;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(b.x + Math.cos(b.angle) * len, b.y + Math.sin(b.angle) * len);
                ctx.stroke();
                if (b.charge > 0) {
                    ctx.fillStyle = Theme.accent;
                    ctx.fillRect(b.x - 18, b.y - b.r - 16, 36 * (b.charge / 1.15), 5);
                    ctx.strokeStyle = Theme.fg;
                    ctx.strokeRect(b.x - 18, b.y - b.r - 16, 36, 5);
                }
            }
        };

        drawBall(this.b1, Theme.p1, 'P1');
        drawBall(this.b2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Holes: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 28);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('A/D or ←/→ aim · hold Space/Enter power · release putt', this.width / 2, 50);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new SpeedGolf());
