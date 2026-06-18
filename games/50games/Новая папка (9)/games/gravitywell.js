class GravityWell extends GameBase {
    constructor() { super("Gravity Well", "Collect 10 stars! Avoid the center."); }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = this.scoreP1 || 0;
        this.scoreP2 = this.scoreP2 || 0;
        this.resetMatch();
    }

    resetMatch() {
        this.p1 = { x: 100, y: this.height / 2, vx: 0, vy: 0, angle: 0, r: 15 };
        this.p2 = { x: this.width - 100, y: this.height / 2, vx: 0, vy: 0, angle: Math.PI, r: 15 };
        this.hole = { x: this.width / 2, y: this.height / 2, r: 30 };
        this.spawnStar();
    }

    spawnStar() {
        // Ensure star doesn't spawn inside the hole
        do {
            this.star = { x: 50 + Math.random() * (this.width - 100), y: 50 + Math.random() * (this.height - 100), r: 10 };
        } while (Math.hypot(this.star.x - this.hole.x, this.star.y - this.hole.y) < 100);
    }

    update(dt) {
        let delta = dt > 0.5 ? dt / 1000 : dt;
        const thrust = 400, rotSpeed = 4, pullStrength = 150;

        // P1 Input
        if (Input.isDown('KeyA')) this.p1.angle -= rotSpeed * delta;
        if (Input.isDown('KeyD')) this.p1.angle += rotSpeed * delta;
        if (Input.isDown('KeyW') || Input.isDown('Space')) {
            this.p1.vx += Math.cos(this.p1.angle) * thrust * delta;
            this.p1.vy += Math.sin(this.p1.angle) * thrust * delta;
        }

        // P2 Input / AI
        if (GameManager.isSinglePlayer) {
            // AI Logic: Aim at star and thrust. If getting too close to hole, thrust outwards.
            let distToHole = Math.hypot(this.hole.x - this.p2.x, this.hole.y - this.p2.y);
            let targetAngle;
            if (distToHole < 120) targetAngle = Math.atan2(this.p2.y - this.hole.y, this.p2.x - this.hole.x); // Escape
            else targetAngle = Math.atan2(this.star.y - this.p2.y, this.star.x - this.p2.x); // Seek
            
            // Normalize angle matching
            let diff = Math.atan2(Math.sin(targetAngle - this.p2.angle), Math.cos(targetAngle - this.p2.angle));
            if (diff < -0.1) this.p2.angle -= rotSpeed * delta;
            else if (diff > 0.1) this.p2.angle += rotSpeed * delta;
            else {
                this.p2.vx += Math.cos(this.p2.angle) * thrust * delta;
                this.p2.vy += Math.sin(this.p2.angle) * thrust * delta;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.angle -= rotSpeed * delta;
            if (Input.isDown('ArrowRight')) this.p2.angle += rotSpeed * delta;
            if (Input.isDown('ArrowUp') || Input.isDown('Enter')) {
                this.p2.vx += Math.cos(this.p2.angle) * thrust * delta;
                this.p2.vy += Math.sin(this.p2.angle) * thrust * delta;
            }
        }

        // Physics & Gravity hole
        [this.p1, this.p2].forEach((p, idx) => {
            let hAngle = Math.atan2(this.hole.y - p.y, this.hole.x - p.x);
            p.vx += Math.cos(hAngle) * pullStrength * delta;
            p.vy += Math.sin(hAngle) * pullStrength * delta;
            p.x += p.vx * delta;
            p.y += p.vy * delta;

            // Screen wrap
            if (p.x < 0) p.x = this.width; if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height; if (p.y > this.height) p.y = 0;

            // Hole death detection
            if (Math.hypot(p.x - this.hole.x, p.y - this.hole.y) < p.r + this.hole.r) {
                if (idx === 0) this.scoreP2 += 3; // Penalty
                else this.scoreP1 += 3;
                this.resetMatch();
            }

            // Star collection
            if (Math.hypot(p.x - this.star.x, p.y - this.star.y) < p.r + this.star.r) {
                if (idx === 0) this.scoreP1++; else this.scoreP2++;
                this.spawnStar();
            }
        });

        if (this.scoreP1 >= 10) GameManager.gameOver(1);
        if (this.scoreP2 >= 10) GameManager.gameOver(2);
    }

    renderShip(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p.r, 0);
        ctx.lineTo(-p.r, p.r * 0.8);
        ctx.lineTo(-p.r * 0.5, 0);
        ctx.lineTo(-p.r, -p.r * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Black Hole
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y, this.hole.r, 0, Math.PI * 2);
        ctx.fill();

        // Star
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.star.x, this.star.y, this.star.r, 0, Math.PI * 2);
        ctx.fill();

        // Ships
        this.renderShip(ctx, this.p1, Theme.p1);
        this.renderShip(ctx, this.p2, Theme.p2);
    }
}
GameManager.registerGame(new GravityWell());