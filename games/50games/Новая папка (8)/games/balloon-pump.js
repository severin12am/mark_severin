// balloon-pump.js
class BalloonPump extends GameBase {
    constructor() {
        super("Balloon Pump", "Mash alternating keys! First to pop wins.");
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
        this.p1Pump = 0;
        this.p2Pump = 0;
        this.p1LastKey = '';
        this.p2LastKey = '';
        this.p1Popped = false;
        this.p2Popped = false;
    }

    update(dt) {
        // P1: alternate A/D
        const p1Key = Input.isDown('KeyA') ? 'A' : Input.isDown('KeyD') ? 'D' : '';
        if (p1Key && p1Key !== this.p1LastKey) {
            this.p1Pump += 9;
            this.p1LastKey = p1Key;
        }

        // P2 or CPU
        if (GameManager.isSinglePlayer) {
            if (Math.random() < 0.38) this.p2Pump += 8.5;
        } else {
            const p2Key = Input.isDown('ArrowLeft') ? 'L' : Input.isDown('ArrowRight') ? 'R' : '';
            if (p2Key && p2Key !== this.p2LastKey) {
                this.p2Pump += 9;
                this.p2LastKey = p2Key;
            }
        }

        if (this.p1Pump > 280 && !this.p1Popped) {
            this.p1Popped = true;
            this.scoreP1++;
        }
        if (this.p2Pump > 280 && !this.p2Popped) {
            this.p2Popped = true;
            this.scoreP2++;
        }

        if (this.p1Popped || this.p2Popped) {
            if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
            } else {
                this.resetRound();
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Balloons
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.ellipse(200, 260, 62 + this.p1Pump / 3.5, 82 + this.p1Pump / 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.p2;
        ctx.beginPath();
        ctx.ellipse(600, 260, 62 + this.p2Pump / 3.5, 82 + this.p2Pump / 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Strings
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(200, 340); ctx.lineTo(200, 420); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(600, 340); ctx.lineTo(600, 420); ctx.stroke();

        ctx.fillStyle = Theme.accent;
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("MASH A / D", 200, 480);
        ctx.fillText(GameManager.isSinglePlayer ? "CPU MASHING" : "← / →", 600, 480);

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 52px sans-serif";
        ctx.fillText(this.scoreP1, 200, 100);
        ctx.fillText(this.scoreP2, 600, 100);
    }
}

GameManager.registerGame(new BalloonPump());