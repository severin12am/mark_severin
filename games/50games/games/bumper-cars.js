class BumperCars extends GameBase {
    constructor() {
        super("Bumper Cars", "Bump rival into spikes on the ice! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.cx = 0;
        this.cy = 0;
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    startRound() {
        this.cx = this.width / 2;
        this.cy = this.height / 2 + 20;
        this.arenaR = Math.min(this.width, this.height) * 0.38;
        this.p1 = { x: this.cx - 90, y: this.cy, vx: 0, vy: 0 };
        this.p2 = { x: this.cx + 90, y: this.cy, vx: 0, vy: 0 };
        this.hazards = [];
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
            const r = this.arenaR * (0.55 + Math.random() * 0.3);
            this.hazards.push({ x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r, r: 26 });
        }
    }

    applyInput(p, ax, ay, dt) {
        const len = Math.hypot(ax, ay);
        if (len > 0) {
            ax /= len;
            ay /= len;
            p.vx += ax * 420 * dt;
            p.vy += ay * 420 * dt;
        }
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 340) {
            p.vx *= 340 / spd;
            p.vy *= 340 / spd;
        }
    }

    constrainArena(p) {
        const dx = p.x - this.cx;
        const dy = p.y - this.cy;
        const dist = Math.hypot(dx, dy);
        const max = this.arenaR - 26;
        if (dist > max) {
            const nx = dx / dist;
            const ny = dy / dist;
            p.x = this.cx + nx * max;
            p.y = this.cy + ny * max;
            const dot = p.vx * nx + p.vy * ny;
            p.vx -= 1.6 * dot * nx;
            p.vy -= 1.6 * dot * ny;
            AudioManager.tick();
        }
    }

    bump(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= 50 || dist === 0) return;
        const nx = dx / dist;
        const ny = dy / dist;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel <= 0) return;
        a.vx += nx * rel * 1.1;
        a.vy += ny * rel * 1.1;
        b.vx -= nx * rel * 1.1;
        b.vy -= ny * rel * 1.1;
        AudioManager.move();
    }

    hitHazard(p) {
        for (const h of this.hazards) {
            if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + 22) return true;
        }
        return false;
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        let ax1 = 0, ay1 = 0;
        if (Input.isDown('KeyW')) ay1 -= 1;
        if (Input.isDown('KeyS')) ay1 += 1;
        if (Input.isDown('KeyA')) ax1 -= 1;
        if (Input.isDown('KeyD')) ax1 += 1;
        this.applyInput(this.p1, ax1, ay1, dt);

        if (GameManager.isSinglePlayer) {
            const dx = this.p1.x - this.p2.x;
            const dy = this.p1.y - this.p2.y;
            const dist = Math.hypot(dx, dy) || 1;
            let ax2 = dx / dist;
            let ay2 = dy / dist;
            const nearest = this.hazards.reduce((best, h) =>
                Math.hypot(h.x - this.p2.x, h.y - this.p2.y) < Math.hypot(best.x - this.p2.x, best.y - this.p2.y) ? h : best);
            const hx = nearest.x - this.p1.x;
            const hy = nearest.y - this.p1.y;
            const hlen = Math.hypot(hx, hy) || 1;
            ax2 = ax2 * 0.65 + (hx / hlen) * 0.35;
            ay2 = ay2 * 0.65 + (hy / hlen) * 0.35;
            this.applyInput(this.p2, ax2, ay2, dt);
        } else {
            let ax2 = 0, ay2 = 0;
            if (Input.isDown('ArrowUp')) ay2 -= 1;
            if (Input.isDown('ArrowDown')) ay2 += 1;
            if (Input.isDown('ArrowLeft')) ax2 -= 1;
            if (Input.isDown('ArrowRight')) ax2 += 1;
            this.applyInput(this.p2, ax2, ay2, dt);
        }

        this.p1.vx *= 0.975;
        this.p1.vy *= 0.975;
        this.p2.vx *= 0.975;
        this.p2.vy *= 0.975;

        this.p1.x += this.p1.vx * dt;
        this.p1.y += this.p1.vy * dt;
        this.p2.x += this.p2.vx * dt;
        this.p2.y += this.p2.vy * dt;

        this.constrainArena(this.p1);
        this.constrainArena(this.p2);
        this.bump(this.p1, this.p2);

        if (this.hitHazard(this.p1)) {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU SCORES!' : 'P2 SCORES!';
            AudioManager.correct();
            if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else { this.msgTimer = 1; this.startRound(); }
        } else if (this.hitHazard(this.p2)) {
            this.scoreP1++;
            this.roundMsg = 'P1 SCORES!';
            AudioManager.correct();
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else { this.msgTimer = 1; this.startRound(); }
        }
    }

    drawCar(ctx, p, color, label) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx || 0.001));
        ctx.fillStyle = color;
        ctx.fillRect(-22, -14, 44, 28);
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(8, -8, 12, 16);
        ctx.restore();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + 26);
    }

    render(ctx) {
        ctx.fillStyle = '#102030';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.arenaR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.arenaR - 8, 0, Math.PI * 2);
        ctx.fill();

        this.hazards.forEach(h => {
            ctx.fillStyle = '#ff2a54';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 3;
            ctx.stroke();
        });

        this.drawCar(ctx, this.p1, Theme.p1, 'P1');
        this.drawCar(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Spike hits: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 32);

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 24px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD drive · bump rival into red spikes', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new BumperCars());
