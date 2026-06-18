class BalloonPump extends GameBase {
    constructor() {
        super("Balloon Pump", "Alternate A/D and ←/→ to inflate! First to pop 3 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1Pump = 0;
        this.p2Pump = 0;
        this.p1LastKey = '';
        this.p2LastKey = '';
        this.p1Popped = false;
        this.p2Popped = false;
        this.popTimer = 0;
        this.particles = [];
        this.cpuKeyToggle = false;
        this.cpuKeyTimer = 0;
    }

    popBalloon(player) {
        if (player === 1) {
            this.p1Popped = true;
            this.scoreP1++;
            this.spawnParticles(200, 260, Theme.p1);
        } else {
            this.p2Popped = true;
            this.scoreP2++;
            this.spawnParticles(600, 260, Theme.p2);
        }
        this.popTimer = 0.6;
        AudioManager.correct();
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 160;
            this.particles.push({
                x, y, color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.4,
                r: 3 + Math.random() * 5
            });
        }
    }

    update(dt) {
        if (this.popTimer > 0) {
            this.popTimer -= dt;
            this.particles.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 200 * dt;
                p.life -= dt;
            });
            this.particles = this.particles.filter(p => p.life > 0);

            if (this.popTimer <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        const POP_THRESHOLD = 100;

        // Slight deflation when idle
        this.p1Pump = Math.max(0, this.p1Pump - dt * 3);
        this.p2Pump = Math.max(0, this.p2Pump - dt * 3);

        const p1Key = Input.isDown('KeyA') ? 'A' : Input.isDown('KeyD') ? 'D' : '';
        if (p1Key && p1Key !== this.p1LastKey) {
            this.p1Pump += 7;
            this.p1LastKey = p1Key;
            AudioManager.tick();
        } else if (!p1Key) {
            this.p1LastKey = '';
        }

        if (GameManager.isSinglePlayer) {
            this.cpuKeyTimer -= dt;
            if (this.cpuKeyTimer <= 0) {
                this.cpuKeyToggle = !this.cpuKeyToggle;
                this.p2Pump += 6.5;
                this.cpuKeyTimer = 0.1 + Math.random() * 0.08;
                AudioManager.tick();
            }
        } else {
            const p2Key = Input.isDown('ArrowLeft') ? 'L' : Input.isDown('ArrowRight') ? 'R' : '';
            if (p2Key && p2Key !== this.p2LastKey) {
                this.p2Pump += 7;
                this.p2LastKey = p2Key;
                AudioManager.tick();
            } else if (!p2Key) {
                this.p2LastKey = '';
            }
        }

        if (!this.p1Popped && this.p1Pump >= POP_THRESHOLD) this.popBalloon(1);
        if (!this.p2Popped && this.p2Pump >= POP_THRESHOLD) this.popBalloon(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floor
        ctx.fillStyle = '#2a2835';
        ctx.fillRect(0, 440, this.width, 160);

        const drawBalloon = (cx, pump, color, popped) => {
            if (popped) return;
            const rx = 40 + pump * 0.55;
            const ry = 55 + pump * 0.65;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(cx, 260, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath();
            ctx.ellipse(cx - rx * 0.3, 240, rx * 0.15, ry * 0.2, -0.4, 0, Math.PI * 2);
            ctx.fill();
            // Knot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(cx - 6, 260 + ry);
            ctx.lineTo(cx + 6, 260 + ry);
            ctx.lineTo(cx, 260 + ry + 12);
            ctx.fill();
            // String
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, 260 + ry + 12);
            ctx.lineTo(cx, 420);
            ctx.stroke();
            // Pressure bar
            const barW = 120;
            ctx.fillStyle = '#333';
            ctx.fillRect(cx - barW / 2, 90, barW, 14);
            ctx.fillStyle = pump > 80 ? '#ff4444' : Theme.accent;
            ctx.fillRect(cx - barW / 2, 90, barW * (pump / 100), 14);
        };

        drawBalloon(200, this.p1Pump, Theme.p1, this.p1Popped);
        drawBalloon(600, this.p2Pump, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, this.p2Popped);

        // Pop particles
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life * 2;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        if (this.popTimer > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 56px Impact";
            ctx.textAlign = "center";
            ctx.fillText("POP!", this.width / 2, 180);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("ALT: A ↔ D", 200, 500);
        ctx.fillText(GameManager.isSinglePlayer ? "CPU PUMPING" : "ALT: ← ↔ →", 600, 500);
    }
}

GameManager.registerGame(new BalloonPump());
