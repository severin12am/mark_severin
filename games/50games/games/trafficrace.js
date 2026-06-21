class TrafficRace extends GameBase {
    constructor() {
        super("Traffic Race", "Weave through traffic — first to 2000m wins!");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: w * 0.32, y: h - 110, w: 36, h: 64, vy: 0, crash: 0 };
        this.p2 = { x: w * 0.68, y: h - 110, w: 36, h: 64, vy: 0, crash: 0 };
        this.traffic = [];
        this.lines = [0, 180, 360, 540];
        this.spawnTimer = 0.5;
        this.baseSpeed = 480;
    }

    steerCar(p, left, right, up, down, isCpu, dt) {
        const steer = 320 * dt;
        if (isCpu) {
            let danger = false;
            for (const t of this.traffic) {
                if (t.y < p.y && t.y > p.y - 280 && Math.abs(t.x - p.x) < 55) {
                    danger = true;
                    p.x += t.x < p.x ? steer : -steer;
                }
            }
            if (!danger) p.vy = Math.min(p.vy + 400 * dt, this.baseSpeed * 0.88);
            else p.vy = Math.max(p.vy - 200 * dt, 120);
        } else {
            if (Input.isDown(left)) p.x -= steer;
            if (Input.isDown(right)) p.x += steer;
            if (Input.isDown(up)) p.vy = Math.min(p.vy + 700 * dt, this.baseSpeed);
            else if (Input.isDown(down)) p.vy = Math.max(p.vy - 700 * dt, 0);
            else p.vy = Math.max(p.vy - 250 * dt, 80);
        }
        p.x = Math.max(40, Math.min(this.width - 40 - p.w, p.x));
        if (p.crash > 0) {
            p.crash -= dt;
            p.vy = Math.max(p.vy - 400 * dt, 0);
        }
    }

    update(dt) {
        this.steerCar(this.p1, 'KeyA', 'KeyD', 'KeyW', 'KeyS', false, dt);
        this.steerCar(this.p2, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', GameManager.isSinglePlayer, dt);

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.traffic.push({
                x: 50 + Math.random() * (this.width - 130),
                y: -90,
                w: 44 + Math.random() * 24,
                h: 70 + Math.random() * 30,
                vy: 160 + Math.random() * 140
            });
            this.spawnTimer = 0.35 + Math.random() * 0.35;
        }

        const pace = Math.max(this.p1.vy, this.p2.vy, 160);
        this.lines = this.lines.map(y => {
            y += pace * dt;
            if (y > this.height) y -= this.height + 160;
            return y;
        });

        for (let i = this.traffic.length - 1; i >= 0; i--) {
            const t = this.traffic[i];
            t.y += (pace - t.vy) * dt;
            if (t.y > this.height + 80) {
                this.traffic.splice(i, 1);
                continue;
            }
            const hit = p => p.x < t.x + t.w && p.x + p.w > t.x &&
                p.y < t.y + t.h && p.y + p.h > t.y && p.crash <= 0;
            if (hit(this.p1)) {
                this.p1.crash = 0.6;
                this.p1.vy *= 0.3;
                AudioManager.wrong();
            }
            if (hit(this.p2)) {
                this.p2.crash = 0.6;
                this.p2.vy *= 0.3;
                AudioManager.wrong();
            }
        }

        if (this.p1.vy > 0) this.scoreP1 += Math.floor(this.p1.vy * dt * 0.5);
        if (this.p2.vy > 0) this.scoreP2 += Math.floor(this.p2.vy * dt * 0.5);

        if (this.scoreP1 >= 2000) GameManager.gameOver(1);
        if (this.scoreP2 >= 2000) GameManager.gameOver(2);
    }

    drawCar(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#111';
        ctx.fillRect(p.x + 4, p.y + 12, p.w - 8, 14);
        if (p.vy > 350) {
            ctx.fillStyle = '#ff5722';
            ctx.fillRect(p.x + 6, p.y + p.h, 8, 14);
            ctx.fillRect(p.x + p.w - 14, p.y + p.h, 8, 14);
        }
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x + p.w / 2, p.y - 6);
    }

    render(ctx) {
        ctx.fillStyle = '#2c2f33';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, 0, 16, this.height);
        ctx.fillRect(this.width - 16, 0, 16, this.height);

        ctx.fillStyle = Theme.fg;
        this.lines.forEach(y => {
            ctx.fillRect(this.width / 2 - 4, y, 8, 70);
            ctx.fillRect(this.width * 0.25 - 3, y, 6, 70);
            ctx.fillRect(this.width * 0.75 - 3, y, 6, 70);
        });

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}m — ${this.scoreP2}m  (first to 2000m)`, this.width / 2, 32);

        this.traffic.forEach(t => {
            ctx.fillStyle = '#777';
            ctx.fillRect(t.x, t.y, t.w, t.h);
            ctx.fillStyle = Theme.p2;
            ctx.fillRect(t.x + 4, t.y + 4, 8, 4);
            ctx.fillRect(t.x + t.w - 12, t.y + 4, 8, 4);
        });

        this.drawCar(ctx, this.p1, Theme.p1, 'P1');
        this.drawCar(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD drive · hold W to accelerate', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new TrafficRace());
