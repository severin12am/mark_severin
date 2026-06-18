// sheep-herder.js
class SheepHerder extends GameBase {
    constructor() {
        super("Sheep Herder", "Scare wandering sheep into your pen! First to 8 wins the round.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.width = w;
        this.height = h;

        this.p1 = {x: 190, y: 370, r: 19};
        this.p2 = {x: 610, y: 370, r: 19};

        this.penP1 = {x: 30, y: h - 160, w: 150, h: 120};
        this.penP2 = {x: w - 180, y: h - 160, w: 150, h: 120};

        this.sheep = [];
        for (let i = 0; i < 14; i++) {
            this.sheep.push({
                x: 100 + Math.random() * (w - 200),
                y: 120 + Math.random() * 280,
                vx: (Math.random() - 0.5) * 70,
                vy: (Math.random() - 0.5) * 70,
                r: 15
            });
        }
    }

    update(dt) {
        // P1 herder
        if (Input.isDown('KeyW')) this.p1.y -= 245 * dt;
        if (Input.isDown('KeyS')) this.p1.y += 245 * dt;
        if (Input.isDown('KeyA')) this.p1.x -= 245 * dt;
        if (Input.isDown('KeyD')) this.p1.x += 245 * dt;
        this.clamp(this.p1);

        // P2 or CPU
        if (GameManager.isSinglePlayer) {
            let target = null;
            let minD = Infinity;
            for (let s of this.sheep) {
                if (this.inPen(s, this.penP2)) continue;
                let d = Math.hypot(s.x - this.p2.x, s.y - this.p2.y);
                if (d < minD) {
                    minD = d;
                    target = s;
                }
            }
            if (target) {
                let dx = target.x - this.p2.x;
                let dy = target.y - this.p2.y - 30;
                let d = Math.hypot(dx, dy) || 1;
                this.p2.x += (dx / d) * 215 * dt;
                this.p2.y += (dy / d) * 215 * dt;
            }
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= 245 * dt;
            if (Input.isDown('ArrowDown')) this.p2.y += 245 * dt;
            if (Input.isDown('ArrowLeft')) this.p2.x -= 245 * dt;
            if (Input.isDown('ArrowRight')) this.p2.x += 245 * dt;
        }
        this.clamp(this.p2);

        // Sheep update + scare
        for (let s of this.sheep) {
            s.vx *= 0.94;
            s.vy *= 0.94;
            s.x += s.vx * dt;
            s.y += s.vy * dt;

            // Scare P1
            let d1 = Math.hypot(s.x - this.p1.x, s.y - this.p1.y);
            if (d1 < 78 && d1 > 6) {
                let dx = s.x - this.p1.x;
                let dy = s.y - this.p1.y;
                let len = d1 || 1;
                s.vx += (dx / len) * 310;
                s.vy += (dy / len) * 310;
            }
            // Scare P2
            let d2 = Math.hypot(s.x - this.p2.x, s.y - this.p2.y);
            if (d2 < 78 && d2 > 6) {
                let dx = s.x - this.p2.x;
                let dy = s.y - this.p2.y;
                let len = d2 || 1;
                s.vx += (dx / len) * 310;
                s.vy += (dy / len) * 310;
            }

            // Walls
            if (s.x < 40) { s.x = 40; s.vx = Math.abs(s.vx); }
            if (s.x > this.width - 40) { s.x = this.width - 40; s.vx = -Math.abs(s.vx); }
            if (s.y < 80) { s.y = 80; s.vy = Math.abs(s.vy); }
            if (s.y > this.height - 60) { s.y = this.height - 60; s.vy = -Math.abs(s.vy); }

            // Pen check
            if (this.inPen(s, this.penP1)) {
                this.scoreP1++;
                s.x = 250 + Math.random() * 300;
                s.y = 100;
                s.vx = s.vy = 0;
                if (this.scoreP1 >= 8) GameManager.gameOver(1);
            }
            if (this.inPen(s, this.penP2)) {
                this.scoreP2++;
                s.x = 250 + Math.random() * 300;
                s.y = 100;
                s.vx = s.vy = 0;
                if (this.scoreP2 >= 8) GameManager.gameOver(2);
            }
        }
    }

    clamp(entity) {
        entity.x = Math.max(60, Math.min(this.width - 60, entity.x));
        entity.y = Math.max(110, Math.min(this.height - 70, entity.y));
    }

    inPen(s, pen) {
        return s.x > pen.x && s.x < pen.x + pen.w && s.y > pen.y && s.y < pen.y + pen.h;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Field
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, 70, this.width, this.height - 70);

        // Pens
        ctx.strokeStyle = Theme.p1;
        ctx.lineWidth = 9;
        ctx.strokeRect(this.penP1.x, this.penP1.y, this.penP1.w, this.penP1.h);
        ctx.fillStyle = Theme.p1;
        ctx.font = "bold 15px monospace";
        ctx.fillText("P1 PEN", this.penP1.x + 18, this.penP1.y + 28);

        ctx.strokeStyle = Theme.p2;
        ctx.strokeRect(this.penP2.x, this.penP2.y, this.penP2.w, this.penP2.h);
        ctx.fillStyle = Theme.p2;
        ctx.fillText("P2 PEN", this.penP2.x + 18, this.penP2.y + 28);

        // Sheep
        for (let s of this.sheep) {
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.r, s.r * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.bg;
            ctx.beginPath();
            ctx.arc(s.x + 9, s.y - 5, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Herders
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.p1.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.p2;
        ctx.beginPath();
        ctx.arc(this.p2.x, this.p2.y, this.p2.r, 0, Math.PI * 2);
        ctx.fill();

        // HUD
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 27px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`P1 ${this.scoreP1}/8`, 50, 48);
        ctx.textAlign = "right";
        ctx.fillText(`P2 ${this.scoreP2}/8`, this.width - 50, 48);
    }
}

GameManager.registerGame(new SheepHerder());