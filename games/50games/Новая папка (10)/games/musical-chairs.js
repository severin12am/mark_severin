// musical-chairs.js
class MusicalChairs extends GameBase {
    constructor() {
        super("Musical Chairs", "Walk the circle. Sit when music stops! First to 5 wins.");
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
        this.centerX = 400;
        this.centerY = 280;
        this.radius = 155;
        this.p1 = {angle: Math.PI * 1.8, sitting: false};
        this.p2 = {angle: Math.PI * 0.2, sitting: false};
        this.chairs = [];
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            this.chairs.push({x: this.centerX + Math.cos(a) * this.radius, y: this.centerY + Math.sin(a) * (this.radius * 0.65), taken: false});
        }
        this.musicTimer = 3 + Math.random() * 4;
        this.musicPlaying = true;
        this.sitWindow = false;
        this.sitTimeout = 0;
    }

    update(dt) {
        if (this.musicPlaying) {
            this.musicTimer -= dt;
            if (this.musicTimer <= 0) {
                this.musicPlaying = false;
                this.sitWindow = true;
                this.sitTimeout = 0;
            }

            // Player 1 movement (circle)
            if (Input.isDown('KeyA')) this.p1.angle -= 3.8 * dt;
            if (Input.isDown('KeyD')) this.p1.angle += 3.8 * dt;

            // Player 2 or CPU
            if (GameManager.isSinglePlayer) {
                this.p2.angle += (2.4 + Math.sin(this.musicTimer * 5) * 0.8) * dt;
            } else {
                if (Input.isDown('ArrowLeft')) this.p2.angle -= 3.8 * dt;
                if (Input.isDown('ArrowRight')) this.p2.angle += 3.8 * dt;
            }

            // Try sit during window
        } else if (this.sitWindow) {
            this.sitTimeout += dt;

            // P1 sit
            if (Input.isDown('Space') && !this.p1.sitting) this.trySit(this.p1, 1);
            // P2 sit
            if (GameManager.isSinglePlayer) {
                if (Math.random() < 0.18 && !this.p2.sitting) this.trySit(this.p2, 2);
            } else if (Input.isDown('Enter') && !this.p2.sitting) {
                this.trySit(this.p2, 2);
            }

            if (this.sitTimeout > 2.5) this.endRound();
        }

        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    trySit(player, id) {
        let best = null;
        let dist = 999;
        for (let c of this.chairs) {
            if (c.taken) continue;
            const dx = this.centerX + Math.cos(player.angle) * this.radius - c.x;
            const dy = this.centerY + Math.sin(player.angle) * this.radius * 0.65 - c.y;
            const d = Math.hypot(dx, dy);
            if (d < dist && d < 48) {
                dist = d;
                best = c;
            }
        }
        if (best) {
            best.taken = true;
            player.sitting = true;
            if (id === 1) this.scoreP1++;
            else this.scoreP2++;
            this.endRound();
        }
    }

    endRound() {
        if (this.scoreP1 >= 5 || this.scoreP2 >= 5) return;
        this.resetRound();
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floor circle
        ctx.fillStyle = "#24212e";
        ctx.beginPath();
        ctx.ellipse(this.centerX, this.centerY + 30, 210, 125, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chairs
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 7;
        for (let c of this.chairs) {
            if (!c.taken) {
                ctx.fillStyle = Theme.accent;
                ctx.fillRect(c.x - 19, c.y - 6, 38, 14);
                ctx.strokeRect(c.x - 19, c.y - 6, 38, 14);
            }
        }

        // Players
        const p1x = this.centerX + Math.cos(this.p1.angle) * this.radius;
        const p1y = this.centerY + Math.sin(this.p1.angle) * this.radius * 0.65;
        const p2x = this.centerX + Math.cos(this.p2.angle) * this.radius;
        const p2y = this.centerY + Math.sin(this.p2.angle) * this.radius * 0.65;

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(p1x - 19, p1y - 34, 38, 52);
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(p2x - 19, p2y - 34, 38, 52);

        // Status
        ctx.fillStyle = this.musicPlaying ? Theme.fg : Theme.accent;
        ctx.font = "bold 52px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.musicPlaying ? "MUSIC!" : "SIT!!!", 400, 110);

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 46px sans-serif";
        ctx.fillText(this.scoreP1, 200, 80);
        ctx.fillText(this.scoreP2, 600, 80);
        ctx.font = "20px sans-serif";
        ctx.fillText(GameManager.isSinglePlayer ? "CPU" : "P2", 600, 115);
    }
}

GameManager.registerGame(new MusicalChairs());