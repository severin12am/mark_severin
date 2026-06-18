// ufo-abduction.js
class UFOAbduction extends GameBase {
    constructor() {
        super("UFO Abduction", "Fly your UFO and use tractor beam to abduct more cows! First to 10 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.width = w;
        this.height = h;
        this.half = w / 2;

        this.p1 = {x: 180, y: 140, size: 32};
        this.p2 = {x: 620, y: 140, size: 32};

        this.cows = [];
        for (let i = 0; i < 14; i++) {
            this.cows.push({
                x: 60 + Math.random() * (w - 120),
                y: 380 + Math.random() * 140,
                vx: (Math.random() - 0.5) * 55
            });
        }
        this.p1Beam = false;
        this.p2Beam = false;
    }

    update(dt) {
        // P1
        if (Input.isDown('KeyA')) this.p1.x -= 260 * dt;
        if (Input.isDown('KeyD')) this.p1.x += 260 * dt;
        if (Input.isDown('KeyW')) this.p1.y -= 140 * dt;
        if (Input.isDown('KeyS')) this.p1.y += 140 * dt;
        this.p1Beam = Input.isDown('Space');
        this.clamp(this.p1);

        // P2 or CPU
        if (GameManager.isSinglePlayer) {
            let target = null;
            let minD = Infinity;
            for (let c of this.cows) {
                let d = Math.abs(c.x - this.p2.x);
                if (d < minD) {
                    minD = d;
                    target = c;
                }
            }
            if (target) {
                if (this.p2.x < target.x - 12) this.p2.x += 240 * dt * 0.9;
                if (this.p2.x > target.x + 12) this.p2.x -= 240 * dt * 0.9;
                this.p2Beam = Math.abs(this.p2.x - target.x) < 28;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= 260 * dt;
            if (Input.isDown('ArrowRight')) this.p2.x += 260 * dt;
            if (Input.isDown('ArrowUp')) this.p2.y -= 140 * dt;
            if (Input.isDown('ArrowDown')) this.p2.y += 140 * dt;
            this.p2Beam = Input.isDown('Enter');
        }
        this.clamp(this.p2);

        // Cows
        for (let c of this.cows) {
            c.x += c.vx * dt;
            c.vx *= 0.96;
            c.vx += (Math.random() - 0.5) * 38 * dt;
            if (c.x < 40 || c.x > this.width - 40) c.vx *= -1;

            // Beam pull
            if (this.p1Beam && Math.abs(c.x - this.p1.x) < 26 && c.y > this.p1.y + 20) {
                c.y -= 310 * dt;
            }
            if (this.p2Beam && Math.abs(c.x - this.p2.x) < 26 && c.y > this.p2.y + 20) {
                c.y -= 310 * dt;
            }

            // Abducted
            if (c.y < this.p1.y - 22 && Math.abs(c.x - this.p1.x) < 24) {
                this.scoreP1++;
                this.respawnCow(c);
                if (this.scoreP1 >= 10) GameManager.gameOver(1);
            }
            if (c.y < this.p2.y - 22 && Math.abs(c.x - this.p2.x) < 24) {
                this.scoreP2++;
                this.respawnCow(c);
                if (this.scoreP2 >= 10) GameManager.gameOver(2);
            }
        }
    }

    clamp(ufo) {
        ufo.x = Math.max(50, Math.min(this.width - 50, ufo.x));
        ufo.y = Math.max(60, Math.min(280, ufo.y));
    }

    respawnCow(c) {
        c.x = 60 + Math.random() * (this.width - 120);
        c.y = 390 + Math.random() * 130;
        c.vx = (Math.random() - 0.5) * 55;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Ground
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, 390, this.width, this.height - 390);

        // Cows
        for (let c of this.cows) {
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(c.x - 19, c.y - 10, 38, 22);
            ctx.fillStyle = Theme.bg;
            ctx.fillRect(c.x - 13, c.y - 19, 15, 14);
        }

        // P1 UFO + beam
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.ellipse(this.p1.x, this.p1.y, this.p1.size, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y - 8, 13, Math.PI, 0, false);
        ctx.fill();
        if (this.p1Beam) this.drawBeam(ctx, this.p1.x, this.p1.y);

        // P2 UFO + beam
        ctx.fillStyle = Theme.p2;
        ctx.beginPath();
        ctx.ellipse(this.p2.x, this.p2.y, this.p2.size, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.p2.x, this.p2.y - 8, 13, Math.PI, 0, false);
        ctx.fill();
        if (this.p2Beam) this.drawBeam(ctx, this.p2.x, this.p2.y);

        // HUD
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`P1: ${this.scoreP1}`, 50, 50);
        ctx.textAlign = "right";
        ctx.fillText(`P2: ${this.scoreP2}`, this.width - 50, 50);
    }

    drawBeam(ctx, ux, uy) {
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 5;
        ctx.setLineDash([7, 9]);
        ctx.beginPath();
        ctx.moveTo(ux - 14, uy + 14);
        ctx.lineTo(ux - 14, this.height - 40);
        ctx.moveTo(ux + 14, uy + 14);
        ctx.lineTo(ux + 14, this.height - 40);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

GameManager.registerGame(new UFOAbduction());