class GameTugOfWar extends GameBase {
    constructor() {
        super("Tug of War", "Mash W (P1) vs Up Arrow (P2)! First to 3 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.ropeX = this.width / 2;
        this.lastW = false;
        this.lastUp = false;
        this.p1MashFlash = 0;
        this.p2MashFlash = 0;
        this.roundOver = false;
        this.roundTimer = 0;
        this.cpuMashTimer = 0;
    }

    update(dt) {
        if (this.roundOver) {
            this.roundTimer += dt;
            if (this.roundTimer > 1.2) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        const isW = Input.isDown('KeyW');
        const isUp = Input.isDown('ArrowUp');

        if (isW && !this.lastW) {
            this.ropeX -= 18;
            this.p1MashFlash = 8;
            AudioManager.move();
        }
        if (!GameManager.isSinglePlayer && isUp && !this.lastUp) {
            this.ropeX += 18;
            this.p2MashFlash = 8;
            AudioManager.move();
        }

        this.lastW = isW;
        this.lastUp = isUp;

        if (GameManager.isSinglePlayer) {
            this.cpuMashTimer -= dt;
            if (this.cpuMashTimer <= 0) {
                this.ropeX += 14 + Math.random() * 8;
                this.p2MashFlash = 8;
                this.cpuMashTimer = 0.12 + Math.random() * 0.18;
            }
        }

        // Rope drifts slightly toward center
        const center = this.width / 2;
        this.ropeX += (center - this.ropeX) * 0.008;

        if (this.p1MashFlash > 0) this.p1MashFlash--;
        if (this.p2MashFlash > 0) this.p2MashFlash--;

        if (this.ropeX <= 60) {
            this.scoreP1++;
            this.roundOver = true;
            this.roundTimer = 0;
            AudioManager.correct();
        } else if (this.ropeX >= this.width - 60) {
            this.scoreP2++;
            this.roundOver = true;
            this.roundTimer = 0;
            AudioManager.correct();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Mud pit
        ctx.fillStyle = '#3d2b1f';
        ctx.fillRect(0, this.height / 2 + 40, this.width, this.height / 2 - 40);

        // Danger zones
        ctx.fillStyle = 'rgba(255, 42, 84, 0.25)';
        ctx.fillRect(0, 0, 60, this.height);
        ctx.fillStyle = 'rgba(0, 229, 155, 0.25)';
        ctx.fillRect(this.width - 60, 0, 60, this.height);

        // Center line
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 80);
        ctx.lineTo(this.width / 2, this.height - 80);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rope
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(50, this.height / 2);
        ctx.lineTo(this.width - 50, this.height / 2);
        ctx.stroke();

        // Knot detail
        for (let i = 0; i < 8; i++) {
            const kx = 80 + i * ((this.width - 160) / 7);
            ctx.fillStyle = '#6b3a1f';
            ctx.beginPath();
            ctx.arc(kx, this.height / 2, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Flag marker
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.ropeX - 12, this.height / 2 - 35, 24, 70);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.ropeX - 12, this.height / 2 - 35, 24, 70);

        // Pullers
        const p1X = Math.min(this.ropeX - 50, this.width / 2 - 50);
        const p2X = Math.max(this.ropeX + 50, this.width / 2 + 50);
        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;

        this.drawPuller(ctx, p1X, this.height / 2, Theme.p1, this.p1MashFlash, 'W');
        this.drawPuller(ctx, p2X, this.height / 2, p2Color, this.p2MashFlash, GameManager.isSinglePlayer ? 'CPU' : '↑');

        // Round result overlay
        if (this.roundOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 42px Impact";
            ctx.textAlign = "center";
            const lastWinner = this.ropeX <= 60 ? "P1 PULLS IT!" : (GameManager.isSinglePlayer ? "CPU PULLS IT!" : "P2 PULLS IT!");
            ctx.fillText(lastWinner, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MASH W", p1X, this.height - 40);
        ctx.fillText(GameManager.isSinglePlayer ? "CPU MASHING" : "MASH ↑", p2X, this.height - 40);
    }

    drawPuller(ctx, x, y, color, flash, label) {
        const scale = flash > 0 ? 1.15 : 1.0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 28 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, x, y + 6);
    }
}

GameManager.registerGame(new GameTugOfWar());
