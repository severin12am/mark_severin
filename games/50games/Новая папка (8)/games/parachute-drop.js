class ParachuteDrop extends GameBase {
    constructor() {
        super("Parachute Drop", "Open parachute as close to ground as possible without crashing.");
    }

    init(w, h) {
        super.init(w, h);
        this.resetRound();
    }

    resetRound() {
        this.groundY = this.height - 60;
        this.gravity = 0.38;
        this.chuteDrag = 0.04;

        this.p1 = { x: this.width * 0.3, y: 80, vy: 0, chuteOpen: false, crashed: false };
        this.p2 = { x: this.width * 0.7, y: 80, vy: 0, chuteOpen: false, crashed: false };

        this.time = 0;
        this.gameActive = true;
    }

    update(dt) {
        if (!this.gameActive) return;
        this.time += dt;

        // ──────────────── Player 1 ────────────────
        if (!this.p1.crashed) {
            if (!this.p1.chuteOpen && Input.isJustPressed('Space')) {
                this.p1.chuteOpen = true;
            }

            this.p1.vy += this.gravity * (this.p1.chuteOpen ? this.chuteDrag : 1) * dt / 16;
            this.p1.y += this.p1.vy * dt / 16;

            if (this.p1.y >= this.groundY) {
                this.p1.crashed = true;
                this.p1.y = this.groundY;
                this.p1.vy = 0;
            }
        }

        // ──────────────── Player 2 or CPU ────────────────
        if (GameManager.isSinglePlayer) {
            // CPU opens chute at semi-random safe-ish height
            if (!this.p2.chuteOpen && this.p2.y > this.groundY - 140 - Math.random() * 60) {
                this.p2.chuteOpen = true;
            }
        } else {
            if (!this.p2.chuteOpen && Input.isJustPressed('Enter')) {
                this.p2.chuteOpen = true;
            }
        }

        if (!this.p2.crashed) {
            this.p2.vy += this.gravity * (this.p2.chuteOpen ? this.chuteDrag : 1) * dt / 16;
            this.p2.y += this.p2.vy * dt / 16;

            if (this.p2.y >= this.groundY) {
                this.p2.crashed = true;
                this.p2.y = this.groundY;
                this.p2.vy = 0;
            }
        }

        // Both landed → decide winner
        if (this.p1.crashed && this.p2.crashed) {
            this.gameActive = false;
            const p1Dist = this.groundY - this.p1.y + (this.p1.chuteOpen ? 0 : 1000);
            const p2Dist = this.groundY - this.p2.y + (this.p2.chuteOpen ? 0 : 1000);

            if (Math.abs(p1Dist - p2Dist) < 3) {
                GameManager.gameOver(0); // draw
            } else if (p1Dist > p2Dist) {
                GameManager.gameOver(1);
            } else {
                GameManager.gameOver(2);
            }
        }
    }

    render(ctx) {
        // Ground
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

        // Players
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x - 14, this.p1.y - 20, 28, 40);
        if (this.p1.chuteOpen) {
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(this.p1.x - 30, this.p1.y - 50, 60, 8);
        }

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x - 14, this.p2.y - 20, 28, 40);
        if (this.p2.chuteOpen) {
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(this.p2.x - 30, this.p2.y - 50, 60, 8);
        }

        // Status
        ctx.fillStyle = Theme.fg;
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SPACE / ENTER to open chute", this.width / 2, 50);
    }
}

GameManager.registerGame(new ParachuteDrop());