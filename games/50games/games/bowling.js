class GameBowling extends GameBase {
    constructor() {
        super("Bowling", "Time the swing! Highest pins after 3 frames wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.framesP1 = 0;
        this.framesP2 = 0;
        this.turn = 1;
        this.roundMsg = '';
        this.roundPause = 0;
        this.resetFrame();
    }

    resetFrame() {
        this.power = 0.5;
        this.powerDir = 1;
        this.angle = 0;
        this.angleDir = 1;
        this.state = 'power';
        this.ballX = this.width / 2;
        this.ballY = this.height - 70;
        this.ballVx = 0;
        this.ballVy = 0;
        this.ballR = 16;
        this.pins = [];
        const baseX = this.width / 2;
        const baseY = 95;
        const rows = [[0], [-0.5, 0.5], [-1, 0, 1], [-1.5, -0.5, 0.5, 1.5]];
        for (let r = 0; r < rows.length; r++) {
            for (const c of rows[r]) {
                this.pins.push({
                    x: baseX + c * 34,
                    y: baseY + r * 32,
                    standing: true,
                    fallT: 0
                });
            }
        }
        this.knocked = 0;
        this.laneLeft = this.width * 0.22;
        this.laneRight = this.width * 0.78;
        this.cpuThink = 0.15 + Math.random() * 0.25;
        this.cpuPowerTarget = 0.55 + Math.random() * 0.35;
        this.cpuAngleTarget = (Math.random() - 0.5) * 18;
        this.resultFlash = 0;
        this.actionArmed = true; // require key up between stages (isDown-only edge)
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.framesP1 >= 3 && this.framesP2 >= 3) {
                    const winner = this.scoreP1 > this.scoreP2 ? 1
                        : this.scoreP2 > this.scoreP1 ? 2 : 0;
                    GameManager.gameOver(winner);
                } else {
                    this.resetFrame();
                }
            }
            return;
        }

        const actionKey = this.turn === 1 ? 'Space' : 'Enter';
        const isCpu = GameManager.isSinglePlayer && this.turn === 2;
        const actionDown = !isCpu && Input.isDown(actionKey);
        if (!actionDown) this.actionArmed = true;
        const actionHit = actionDown && this.actionArmed;

        if (this.state === 'power') {
            this.power += this.powerDir * 1.4 * dt;
            if (this.power > 1) { this.power = 1; this.powerDir = -1; }
            if (this.power < 0) { this.power = 0; this.powerDir = 1; }

            if (isCpu) {
                this.cpuThink -= dt;
                if (this.cpuThink <= 0 && Math.abs(this.power - this.cpuPowerTarget) < 0.08) {
                    this.state = 'angle';
                    this.cpuThink = 0.2 + Math.random() * 0.2;
                    AudioManager.tick();
                }
            } else if (actionHit) {
                this.state = 'angle';
                this.actionArmed = false;
                AudioManager.tick();
            }
        } else if (this.state === 'angle') {
            this.angle += this.angleDir * 70 * dt;
            if (this.angle > 32) { this.angle = 32; this.angleDir = -1; }
            if (this.angle < -32) { this.angle = -32; this.angleDir = 1; }

            if (isCpu) {
                this.cpuThink -= dt;
                if (this.cpuThink <= 0 && Math.abs(this.angle - this.cpuAngleTarget) < 4) {
                    this.launch();
                }
            } else if (actionHit) {
                this.actionArmed = false;
                this.launch();
            }
        } else if (this.state === 'rolling') {
            this.ballX += this.ballVx * dt;
            this.ballY += this.ballVy * dt;
            this.ballVx *= Math.pow(0.988, dt * 60);
            this.ballVy *= Math.pow(0.995, dt * 60);

            if (this.ballX < this.laneLeft + this.ballR) {
                this.ballX = this.laneLeft + this.ballR;
                this.ballVx = Math.abs(this.ballVx) * 0.4;
            }
            if (this.ballX > this.laneRight - this.ballR) {
                this.ballX = this.laneRight - this.ballR;
                this.ballVx = -Math.abs(this.ballVx) * 0.4;
            }

            for (const pin of this.pins) {
                if (!pin.standing) {
                    if (pin.fallT > 0) pin.fallT -= dt;
                    continue;
                }
                const d = Math.hypot(this.ballX - pin.x, this.ballY - pin.y);
                if (d < this.ballR + 11) {
                    this.dropPin(pin);
                    this.ballVx += (this.ballX - pin.x) * 3;
                    // cascade nearby pins from impact
                    this.cascadePins(pin.x, pin.y, 0.55 + this.power * 0.4);
                }
            }

            if (this.ballY < 55 || Math.hypot(this.ballVx, this.ballVy) < 14) {
                // residual scatter if ball reached the pocket with good line
                if (this.ballY < 160 && this.knocked > 0 && this.knocked < 10) {
                    const pocket = Math.abs(this.ballX - this.width / 2) < 50 && this.power > 0.45;
                    if (pocket) this.cascadePins(this.ballX, 110, 0.35 + this.power * 0.25);
                }
                this.finishRoll();
            }
        }

        if (this.resultFlash > 0) this.resultFlash -= dt;
    }

    launch() {
        const speed = 280 + this.power * 420;
        const rad = (this.angle * Math.PI) / 180;
        this.ballVx = Math.sin(rad) * speed * 0.55;
        this.ballVy = -speed;
        this.state = 'rolling';
        AudioManager.move();
    }

    dropPin(pin) {
        if (!pin.standing) return;
        pin.standing = false;
        pin.fallT = 0.35;
        this.knocked++;
        AudioManager.tick();
    }

    cascadePins(x, y, chance) {
        for (const pin of this.pins) {
            if (!pin.standing) continue;
            const d = Math.hypot(pin.x - x, pin.y - y);
            if (d < 55 && Math.random() < chance * (1 - d / 55)) {
                this.dropPin(pin);
            }
        }
    }

    finishRoll() {
        this.state = 'done';
        if (this.turn === 1) {
            this.scoreP1 += this.knocked;
            this.framesP1++;
            this.roundMsg = this.knocked === 10 ? 'STRIKE! P1' : `P1: ${this.knocked} pins`;
            this.turn = 2;
        } else {
            this.scoreP2 += this.knocked;
            this.framesP2++;
            this.roundMsg = this.knocked === 10
                ? (GameManager.isSinglePlayer ? 'STRIKE! CPU' : 'STRIKE! P2')
                : `${GameManager.isSinglePlayer ? 'CPU' : 'P2'}: ${this.knocked} pins`;
            this.turn = 1;
        }
        this.resultFlash = 0.5;
        this.roundPause = 1.15;
        if (this.knocked >= 8) AudioManager.correct();
        else if (this.knocked <= 2) AudioManager.wrong();
        else AudioManager.tick();
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Lane
        ctx.fillStyle = 'rgba(255,230,0,0.06)';
        ctx.fillRect(this.laneLeft, 60, this.laneRight - this.laneLeft, this.height - 100);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.laneLeft, 60, this.laneRight - this.laneLeft, this.height - 100);

        // Gutters
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(this.laneLeft - 18, 60, 18, this.height - 100);
        ctx.fillRect(this.laneRight, 60, 18, this.height - 100);

        // Approach line
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(this.laneLeft + 8, this.height - 110);
        ctx.lineTo(this.laneRight - 8, this.height - 110);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pins
        for (const pin of this.pins) {
            if (!pin.standing && pin.fallT <= 0) continue;
            ctx.save();
            ctx.translate(pin.x, pin.y);
            if (!pin.standing) {
                ctx.rotate((1 - pin.fallT / 0.35) * 1.2);
                ctx.globalAlpha = Math.max(0.2, pin.fallT / 0.35);
            }
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.ellipse(0, 4, 7, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(-5, -2, 10, 4);
            ctx.restore();
        }

        // Ball
        if (this.state === 'rolling' || this.state === 'power' || this.state === 'angle') {
            ctx.fillStyle = this.turn === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
            ctx.beginPath();
            ctx.arc(this.ballX, this.ballY, this.ballR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(this.ballX - 4, this.ballY - 4, 3, 0, Math.PI * 2);
            ctx.arc(this.ballX + 3, this.ballY - 5, 2.5, 0, Math.PI * 2);
            ctx.arc(this.ballX + 1, this.ballY + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Aim arrow
        if (this.state === 'power' || this.state === 'angle') {
            const rad = (this.angle * Math.PI) / 180;
            const len = 50 + this.power * 70;
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.ballX, this.ballY);
            ctx.lineTo(this.ballX + Math.sin(rad) * len, this.ballY - Math.cos(rad) * len);
            ctx.stroke();
        }

        // Meters
        if (this.state === 'power' || this.state === 'angle') {
            const mx = this.turn === 1 ? 36 : this.width - 70;
            ctx.fillStyle = Theme.fg;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.state === 'power' ? 'POWER' : 'ANGLE', mx + 16, 150);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(mx, 160, 32, 220);
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 2;
            ctx.strokeRect(mx, 160, 32, 220);

            if (this.state === 'power') {
                const h = this.power * 200;
                ctx.fillStyle = Theme.accent;
                ctx.fillRect(mx + 4, 370 - h, 24, h);
                // sweet spot
                ctx.fillStyle = 'rgba(255,230,0,0.25)';
                ctx.fillRect(mx + 2, 250, 28, 40);
            } else {
                const ay = 270 + this.angle * 3;
                ctx.fillStyle = Theme.accent;
                ctx.fillRect(mx + 4, ay - 6, 24, 12);
                ctx.fillStyle = 'rgba(255,230,0,0.25)';
                ctx.fillRect(mx + 2, 262, 28, 16);
            }
        }

        // HUD
        const p2Label = GameManager.isSinglePlayer ? 'CPU' : 'P2';
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.28, 40);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.72, 40);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.p1;
        ctx.fillText(`P1  F${this.framesP1}/3`, this.width * 0.28, 58);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillText(`${p2Label}  F${this.framesP2}/3`, this.width * 0.72, 58);

        ctx.fillStyle = Theme.accent;
        ctx.font = '14px Arial';
        const turnLabel = this.turn === 1 ? 'P1 bowling' : `${p2Label} bowling`;
        ctx.fillText(`${turnLabel} · Space / Enter to lock`, this.width / 2, this.height - 18);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 32px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new GameBowling());
