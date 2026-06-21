class HovercraftDrift extends GameBase {
    constructor() {
        super("Hovercraft Drift", "Race 3 laps on the oval! First to 2 round wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.lapsNeeded = 3;
        this.cx = w / 2;
        this.cy = h / 2;
        this.rx = Math.min(w, h) * 0.38;
        this.ry = this.rx * 0.62;
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRace();
    }

    startRace() {
        const a = -Math.PI / 2;
        this.p1 = this.makeRacer(a, -0.15);
        this.p2 = this.makeRacer(a, 0.15);
    }

    makeRacer(angleOffset, spread) {
        const a = -Math.PI / 2 + angleOffset + spread;
        return {
            x: this.cx + Math.cos(a) * this.rx,
            y: this.cy + Math.sin(a) * this.ry,
            angle: a + Math.PI / 2,
            speed: 0,
            lap: 0,
            progress: 0,
            lastProg: 0
        };
    }

    updateRacer(r, accel, turn, dt) {
        r.angle += turn * 2.8 * dt * (0.5 + r.speed * 0.15);
        r.speed += accel * 180 * dt;
        r.speed *= 0.985;
        r.speed = Math.max(-60, Math.min(220, r.speed));
        r.x += Math.cos(r.angle) * r.speed * dt;
        r.y += Math.sin(r.angle) * r.speed * dt;

        const dx = r.x - this.cx;
        const dy = r.y - this.cy;
        const dist = Math.hypot(dx / this.rx, dy / this.ry);
        if (dist > 1.08) {
            const nx = dx / dist;
            const ny = dy / dist;
            r.x = this.cx + nx * this.rx * 1.02;
            r.y = this.cy + ny * this.ry * 1.02;
            const dot = r.speed > 0 ? Math.cos(r.angle) * nx + Math.sin(r.angle) * ny : 0;
            if (dot > 0) r.speed *= 0.7;
        }

        const ang = Math.atan2(dy, dx);
        r.progress = (ang + Math.PI * 2) % (Math.PI * 2);
        if (r.lastProg > 5.5 && r.progress < 1) r.lap++;
        r.lastProg = r.progress;
    }

    cpuSteer(r) {
        const target = -Math.PI / 2 + Math.PI * 2 * 0.02;
        let diff = target - r.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return Math.sign(diff) * Math.min(Math.abs(diff), 1) * 0.9;
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        let a1 = 0, t1 = 0;
        if (Input.isDown('KeyW')) a1 = 1;
        if (Input.isDown('KeyS')) a1 = -0.4;
        if (Input.isDown('KeyA')) t1 = -1;
        if (Input.isDown('KeyD')) t1 = 1;
        this.updateRacer(this.p1, a1, t1, dt);

        if (GameManager.isSinglePlayer) {
            this.updateRacer(this.p2, 0.92, this.cpuSteer(this.p2), dt);
        } else {
            let a2 = 0, t2 = 0;
            if (Input.isDown('ArrowUp')) a2 = 1;
            if (Input.isDown('ArrowDown')) a2 = -0.4;
            if (Input.isDown('ArrowLeft')) t2 = -1;
            if (Input.isDown('ArrowRight')) t2 = 1;
            this.updateRacer(this.p2, a2, t2, dt);
        }

        if (this.p1.lap >= this.lapsNeeded) {
            this.scoreP1++;
            this.roundMsg = 'P1 WINS RACE!';
            AudioManager.correct();
            if (this.scoreP1 >= 2) GameManager.gameOver(1);
            else { this.msgTimer = 1.2; this.startRace(); }
        } else if (this.p2.lap >= this.lapsNeeded) {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS RACE!' : 'P2 WINS RACE!';
            AudioManager.wrong();
            if (this.scoreP2 >= 2) GameManager.gameOver(2);
            else { this.msgTimer = 1.2; this.startRace(); }
        }
    }

    drawCraft(ctx, r, color, label) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.angle);
        ctx.fillStyle = color;
        ctx.fillRect(-14, -22, 28, 44);
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(-6, -18, 12, 10);
        ctx.restore();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} L${r.lap}`, r.x, r.y - 30);
    }

    render(ctx) {
        ctx.fillStyle = '#0a1828';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Races: ${this.scoreP1} — ${this.scoreP2}  (first to 2 · 3 laps each)`, this.width / 2, 28);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = Theme.accent;
        ctx.setLineDash([10, 16]);
        ctx.beginPath();
        ctx.ellipse(this.cx, this.cy, this.rx - 24, this.ry - 16, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.cx + this.rx, this.cy, 8, 0, Math.PI * 2);
        ctx.fill();

        this.drawCraft(ctx, this.p1, Theme.p1, 'P1');
        this.drawCraft(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('W/S throttle · A/D steer  |  Arrows (2P)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new HovercraftDrift());
