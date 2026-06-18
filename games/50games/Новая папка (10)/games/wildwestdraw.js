// games/wildwestdraw.js
class WildWestDraw extends GameBase {
    constructor() {
        super("Wild West Draw", "Fastest draw wins! Wait for the signal.");
        this.reset();
    }

    reset() {
        this.state = "waiting"; // waiting, ready, over
        this.timer = 0;
        this.readyTime = 0;
        this.p1Shot = false;
        this.p2Shot = false;
        this.scoreP1 = 0;
        this.scoreP2 = 0;
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        this.timer += dt;

        if (this.state === "waiting" && this.timer > 1.2) {
            this.state = "ready";
            this.readyTime = this.timer + 0.8 + Math.random() * 1.8;
        }

        if (this.state === "ready" && this.timer > this.readyTime) {
            this.state = "draw";
        }

        // P1 shoot
        if (!this.p1Shot && ((this.state === "draw" && Input.isDown('Space')) || 
            (this.state === "ready" && Input.isDown('Space')))) {
            this.p1Shot = true;
            if (this.state === "ready") {
                // false start
                this.scoreP2++;
                GameManager.gameOver(2);
                return;
            }
        }

        // P2 shoot
        let p2Key = GameManager.isSinglePlayer ? null : 'Enter';
        if (!this.p2Shot && this.state === "draw" && 
            ((!GameManager.isSinglePlayer && Input.isDown(p2Key)) || 
             (GameManager.isSinglePlayer && Math.random() < 0.035))) {
            this.p2Shot = true;
        }

        if (this.p1Shot && this.p2Shot) {
            if (this.timer < this.readyTime + 0.3) {
                // simultaneous — draw
                GameManager.gameOver(0);
            } else {
                GameManager.gameOver(this.p1Shot ? 1 : 2);
                if (this.p1Shot) this.scoreP1++; else this.scoreP2++;
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // wanted poster style background
        ctx.fillStyle = "#3a2a1f";
        ctx.fillRect(180, 120, 440, 360);

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 42px Bungee";
        ctx.textAlign = "center";

        if (this.state === "waiting") {
            ctx.fillText("WAIT FOR IT...", 400, 280);
        } else if (this.state === "ready") {
            ctx.fillStyle = Theme.accent;
            ctx.fillText("DRAW!", 400, 280);
        } else if (this.state === "draw") {
            ctx.fillStyle = "#ff0";
            ctx.fillText("SHOOT!!!", 400, 280);
        }

        // players (cowboys)
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(180, 380, 80, 120); // P1
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(540, 380, 80, 120); // P2

        if (this.p1Shot) {
            ctx.fillStyle = Theme.accent;
            ctx.fillText("BANG!", 220, 340);
        }
        if (this.p2Shot) {
            ctx.fillStyle = Theme.accent;
            ctx.fillText("BANG!", 580, 340);
        }
    }
}

GameManager.registerGame(new WildWestDraw());