class BumperCars extends GameBase {
    constructor() {
        super("Bumper Cars", "Knock opponent into hazards on slippery ice.");
    }

    init(w, h) {
        super.init(w, h);
        this.resetRound();
    }

    resetRound() {
        this.cx = this.width / 2;
        this.cy = this.height / 2;
        this.arenaRadius = 220;

        this.p1 = {x: this.cx - 80, y: this.cy, vx:0, vy:0};
        this.p2 = {x: this.cx + 80, y: this.cy, vx:0, vy:0};

        this.friction = 0.978;
        this.accel = 0.28;
        this.maxSpeed = 5.2;
        this.bumpPower = 4.8;

        this.hazards = [];
        for (let i=0; i<5; i++) {
            let a = Math.random() * Math.PI * 2;
            let r = this.arenaRadius * (0.5 + Math.random() * 0.4);
            this.hazards.push({
                x: this.cx + Math.cos(a) * r,
                y: this.cy + Math.sin(a) * r,
                r: 28
            });
        }
    }

    update(dt) {
        const delta = dt / 16;

        // Player 1
        let ax1 = 0, ay1 = 0;
        if (Input.isDown('KeyW')) ay1 -= 1;
        if (Input.isDown('KeyS')) ay1 += 1;
        if (Input.isDown('KeyA')) ax1 -= 1;
        if (Input.isDown('KeyD')) ax1 += 1;
        this.applyAccel(this.p1, ax1, ay1, delta);

        // Player 2 or CPU
        let ax2 = 0, ay2 = 0;
        if (GameManager.isSinglePlayer) {
            // Simple chase + random wobble
            const dx = this.p1.x - this.p2.x;
            const dy = this.p1.y - this.p2.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 40) {
                ax2 = dx / dist * 0.9;
                ay2 = dy / dist * 0.9;
            }
            ax2 += Math.sin(Date.now()*0.003) * 0.3;
            ay2 += Math.cos(Date.now()*0.004) * 0.3;
        } else {
            if (Input.isDown('ArrowUp'))    ay2 -= 1;
            if (Input.isDown('ArrowDown'))  ay2 += 1;
            if (Input.isDown('ArrowLeft'))  ax2 -= 1;
            if (Input.isDown('ArrowRight')) ax2 += 1;
        }
        this.applyAccel(this.p2, ax2, ay2, delta);

        // Move
        this.p1.x += this.p1.vx * delta;
        this.p1.y += this.p1.vy * delta;
        this.p2.x += this.p2.vx * delta;
        this.p2.y += this.p2.vy * delta;

        // Friction
        this.p1.vx *= this.friction;
        this.p1.vy *= this.friction;
        this.p2.vx *= this.friction;
        this.p2.vy *= this.friction;

        // Arena bounds (bounce)
        this.constrainToArena(this.p1);
        this.constrainToArena(this.p2);

        // Collision between players
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 48) {
            const nx = dx / dist;
            const ny = dy / dist;
            const relVx = this.p2.vx - this.p1.vx;
            const relVy = this.p2.vy - this.p1.vy;
            const dot = relVx * nx + relVy * ny;

            if (dot > 0) {
                this.p1.vx += nx * dot * this.bumpPower;
                this.p1.vy += ny * dot * this.bumpPower;
                this.p2.vx -= nx * dot * this.bumpPower;
                this.p2.vy -= ny * dot * this.bumpPower;
            }
        }

        // Hazard collision
        for (let h of this.hazards) {
            if (this.distTo(this.p1, h) < h.r + 24) GameManager.gameOver(2);
            if (this.distTo(this.p2, h) < h.r + 24) GameManager.gameOver(1);
        }
    }

    applyAccel(p, ax, ay, delta) {
        const len = Math.sqrt(ax*ax + ay*ay);
        if (len > 0) {
            ax /= len; ay /= len;
            p.vx += ax * this.accel * delta;
            p.vy += ay * this.accel * delta;
            const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
            if (speed > this.maxSpeed) {
                p.vx *= this.maxSpeed / speed;
                p.vy *= this.maxSpeed / speed;
            }
        }
    }

    constrainToArena(p) {
        const dx = p.x - this.cx;
        const dy = p.y - this.cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.arenaRadius - 24) {
            const nx = dx / dist;
            const ny = dy / dist;
            p.x = this.cx + nx * (this.arenaRadius - 24);
            p.y = this.cy + ny * (this.arenaRadius - 24);

            // Bounce
            const dot = p.vx * nx + p.vy * ny;
            p.vx -= 2 * dot * nx * 0.7;
            p.vy -= 2 * dot * ny * 0.7;
        }
    }

    distTo(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    render(ctx) {
        // Arena
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.arenaRadius, 0, Math.PI*2);
        ctx.stroke();

        // Hazards
        for (let h of this.hazards) {
            ctx.fillStyle = "#ff2a54";
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Players (cars)
        ctx.fillStyle = Theme.p1;
        ctx.save();
        ctx.translate(this.p1.x, this.p1.y);
        ctx.rotate(Math.atan2(this.p1.vy, this.p1.vx));
        ctx.fillRect(-24, -16, 48, 32);
        ctx.restore();

        ctx.fillStyle = Theme.p2;
        ctx.save();
        ctx.translate(this.p2.x, this.p2.y);
        ctx.rotate(Math.atan2(this.p2.vy, this.p2.vx));
        ctx.fillRect(-24, -16, 48, 32);
        ctx.restore();

        ctx.fillStyle = Theme.fg;
        ctx.font = "22px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Drive + bump opponent into spikes", this.width/2, this.height - 30);
    }
}

GameManager.registerGame(new BumperCars());