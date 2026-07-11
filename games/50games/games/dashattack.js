class DashAttack extends GameBase {
    constructor() {
        super("Dash Attack", "Hold to charge, release to dash into your rival! First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = {
            x: 120, y: this.height / 2, vx: 0, vy: 0,
            charge: 0, dashT: 0, dirX: 1, dirY: 0, r: 22,
            actionHeld: false
        };
        this.p2 = {
            x: this.width - 120, y: this.height / 2, vx: 0, vy: 0,
            charge: 0, dashT: 0, dirX: -1, dirY: 0, r: 22,
            actionHeld: false
        };
        this.roundMsg = '';
        this.roundPause = 0;
        this.cpuState = 'chase';
        this.cpuTimer = 0.3;
    }

    scoreHit(winner) {
        if (winner === 1) {
            this.scoreP1++;
            this.roundMsg = 'P1 SMASH!';
            AudioManager.correct();
        } else {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU SMASH!' : 'P2 SMASH!';
            AudioManager.correct();
        }
        this.roundPause = 1.15;
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        const walkSp = 200;
        const maxCharge = 1.0;
        const minCharge = 0.22;
        const friction = 0.88;
        const dashMul = 520;

        const handlePlayer = (p, up, down, left, right, action, isCpu) => {
            if (p.dashT > 0) {
                p.dashT -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= Math.pow(friction, dt * 60);
                p.vy *= Math.pow(friction, dt * 60);
                if (p.dashT <= 0 || Math.hypot(p.vx, p.vy) < 40) {
                    p.dashT = 0;
                    p.vx = 0;
                    p.vy = 0;
                }
            } else if (!isCpu) {
                let dx = 0, dy = 0;
                if (Input.isDown(up)) dy -= 1;
                if (Input.isDown(down)) dy += 1;
                if (Input.isDown(left)) dx -= 1;
                if (Input.isDown(right)) dx += 1;
                if (dx !== 0 || dy !== 0) {
                    const mag = Math.hypot(dx, dy);
                    p.dirX = dx / mag;
                    p.dirY = dy / mag;
                }

                const holding = Input.isDown(action);
                if (holding) {
                    p.charge = Math.min(maxCharge, p.charge + dt);
                } else {
                    if (p.actionHeld && p.charge >= minCharge) {
                        const mag = Math.hypot(p.dirX, p.dirY) || 1;
                        const power = 0.45 + p.charge * 0.9;
                        p.vx = (p.dirX / mag) * dashMul * power;
                        p.vy = (p.dirY / mag) * dashMul * power;
                        p.dashT = 0.28 + p.charge * 0.35;
                        AudioManager.move();
                    } else if (dx !== 0 || dy !== 0) {
                        const mag = Math.hypot(dx, dy);
                        p.x += (dx / mag) * walkSp * dt;
                        p.y += (dy / mag) * walkSp * dt;
                    }
                    p.charge = 0;
                }
                p.actionHeld = holding;
            }

            p.x = Math.max(p.r + 10, Math.min(this.width - p.r - 10, p.x));
            p.y = Math.max(p.r + 55, Math.min(this.height - p.r - 25, p.y));
        };

        handlePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', false);

        if (GameManager.isSinglePlayer) {
            const p = this.p2;
            this.cpuTimer -= dt;
            const dx = this.p1.x - p.x;
            const dy = this.p1.y - p.y;
            const dist = Math.hypot(dx, dy) || 1;
            p.dirX = dx / dist;
            p.dirY = dy / dist;

            if (p.dashT > 0) {
                handlePlayer(p, '', '', '', '', '', true);
            } else {
                // State machine: chase -> charge -> dash
                if (this.cpuState === 'chase') {
                    p.x += p.dirX * walkSp * 0.85 * dt;
                    p.y += p.dirY * walkSp * 0.85 * dt;
                    p.charge = 0;
                    if (dist < 200 && this.cpuTimer <= 0) {
                        this.cpuState = 'charge';
                        this.cpuTimer = 0.35 + Math.random() * 0.45;
                    }
                } else if (this.cpuState === 'charge') {
                    p.charge = Math.min(maxCharge, p.charge + dt * 0.9);
                    // Slight aim error
                    if (this.cpuTimer <= 0 || p.charge >= 0.55 + Math.random() * 0.35) {
                        const jitter = (Math.random() - 0.5) * 0.4;
                        const ang = Math.atan2(p.dirY, p.dirX) + jitter;
                        const power = 0.45 + p.charge * 0.85;
                        p.vx = Math.cos(ang) * dashMul * power;
                        p.vy = Math.sin(ang) * dashMul * power;
                        p.dashT = 0.28 + p.charge * 0.3;
                        p.charge = 0;
                        this.cpuState = 'recover';
                        this.cpuTimer = 0.5 + Math.random() * 0.4;
                        AudioManager.move();
                    }
                } else {
                    // recover / circle
                    const side = Math.sin(Date.now() * 0.003) > 0 ? 1 : -1;
                    p.x += (-p.dirY * side) * walkSp * 0.7 * dt;
                    p.y += (p.dirX * side) * walkSp * 0.7 * dt;
                    if (this.cpuTimer <= 0) {
                        this.cpuState = 'chase';
                        this.cpuTimer = 0.2 + Math.random() * 0.3;
                    }
                }
                p.x = Math.max(p.r + 10, Math.min(this.width - p.r - 10, p.x));
                p.y = Math.max(p.r + 55, Math.min(this.height - p.r - 25, p.y));
            }
        } else {
            handlePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', false);
        }

        // Collision
        const dist = Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y);
        if (dist < this.p1.r + this.p2.r) {
            const p1Dash = this.p1.dashT > 0;
            const p2Dash = this.p2.dashT > 0;
            if (p1Dash && !p2Dash) {
                this.scoreHit(1);
            } else if (p2Dash && !p1Dash) {
                this.scoreHit(2);
            } else if (p1Dash && p2Dash) {
                // Clash bounce
                this.p1.vx *= -0.9;
                this.p1.vy *= -0.9;
                this.p2.vx *= -0.9;
                this.p2.vy *= -0.9;
                const nx = (this.p2.x - this.p1.x) / (dist || 1);
                const ny = (this.p2.y - this.p1.y) / (dist || 1);
                this.p1.x -= nx * 8;
                this.p1.y -= ny * 8;
                this.p2.x += nx * 8;
                this.p2.y += ny * 8;
                AudioManager.tick();
            } else {
                // Soft separate
                const nx = (this.p2.x - this.p1.x) / (dist || 1);
                const ny = (this.p2.y - this.p1.y) / (dist || 1);
                const sep = (this.p1.r + this.p2.r - dist) / 2;
                this.p1.x -= nx * sep;
                this.p1.y -= ny * sep;
                this.p2.x += nx * sep;
                this.p2.y += ny * sep;
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Arena ring
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(16, 60, this.width - 32, this.height - 90);
        ctx.fillStyle = 'rgba(255,230,0,0.04)';
        ctx.fillRect(16, 60, this.width - 32, this.height - 90);

        const drawP = (p, color, label) => {
            const r = p.r + p.charge * 14;
            if (p.dashT > 0) {
                ctx.fillStyle = Theme.accent;
            } else {
                ctx.fillStyle = color;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            // Direction
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.dirX * (r + 12), p.y + p.dirY * (r + 12));
            ctx.stroke();
            // Charge bar
            if (p.charge > 0) {
                ctx.fillStyle = Theme.accent;
                ctx.fillRect(p.x - 20, p.y - r - 14, 40 * (p.charge / 1.0), 5);
                ctx.strokeStyle = Theme.fg;
                ctx.strokeRect(p.x - 20, p.y - r - 14, 40, 5);
            }
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + r + 14);
        };

        drawP(this.p1, Theme.p1, 'P1');
        drawP(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hits: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 28);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('WASD / Arrows aim · hold Space/Enter charge · release dash', this.width / 2, 50);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new DashAttack());
