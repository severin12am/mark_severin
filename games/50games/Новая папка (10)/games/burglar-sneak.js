// burglar-sneak.js
class BurglarSneak extends GameBase {
    constructor() {
        super("Burglar Sneak", "Sneak past the guard! First to reach the safe 5 times wins.");
    }

    init(w, h) {
        super.init(w, h);
        this.width = w;
        this.height = h;
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.resetRound();
    }

    resetRound() {
        this.p1 = {x: 140, y: 500, progress: 0};
        this.p2 = {x: 660, y: 500, progress: 0};
        this.guardAngle = 0;
        this.guardSpeed = 2.8;
        this.flashOn = false;
        this.flashTimer = 0;
        this.caughtP1 = false;
        this.caughtP2 = false;
    }

    update(dt) {
        this.guardAngle += this.guardSpeed * dt;
        if (this.guardAngle > Math.PI * 2) this.guardAngle = 0;
        this.flashOn = Math.sin(this.guardAngle * 3.5) > 0.3;

        // P1 move (only when light off)
        if (!this.caughtP1) {
            if (Input.isDown('KeyW') && !this.flashOn) this.p1.progress += 110 * dt;
            this.p1.y = 500 - this.p1.progress * 0.9;
        }
        // P2 / CPU
        if (!this.caughtP2) {
            let p2Move = GameManager.isSinglePlayer ? (Math.random() < 0.65 && !this.flashOn) : Input.isDown('ArrowUp') && !this.flashOn;
            if (p2Move) this.p2.progress += 110 * dt;
            this.p2.y = 500 - this.p2.progress * 0.9;
        }

        // Caught?
        if (this.flashOn) {
            if (this.p1.progress > 30 && Math.random() < 0.4) this.caughtP1 = true;
            if (this.p2.progress > 30 && Math.random() < 0.4) this.caughtP2 = true;
        }

        if (this.p1.progress >= 410) { this.scoreP1++; this.endRound(); }
        if (this.p2.progress >= 410) { this.scoreP2++; this.endRound(); }
        if (this.caughtP1 && this.caughtP2) this.endRound();
    }

    endRound() {
        if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
            GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
        } else {
            this.resetRound();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floor
        ctx.fillStyle = "#1f1d29";
        ctx.fillRect(50, 100, 700, 420);

        // Safe
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(380, 120, 40, 55);

        // Guard flashlight
        ctx.strokeStyle = this.flashOn ? Theme.accent : "#555";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(400, 90);
        ctx.lineTo(400 + Math.cos(this.guardAngle) * 420, 90 + Math.sin(this.guardAngle) * 220);
        ctx.stroke();

        // Players (burglars)
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x - 18, this.p1.y - 32, 36, 48);
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x - 18, this.p2.y - 32, 36, 48);

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 42px sans-serif";
        ctx.fillText(this.scoreP1, 180, 70);
        ctx.fillText(this.scoreP2, 620, 70);
        if (this.flashOn) {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 28px sans-serif";
            ctx.fillText("FREEZE!", 400, 60);
        }
    }
}

GameManager.registerGame(new BurglarSneak());