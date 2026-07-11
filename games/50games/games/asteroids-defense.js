class AsteroidsDefense extends GameBase {
    constructor() {
        super("Asteroids Defense", "Shoot falling rocks! Missed ones score for the other side. First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.half = w / 2;
        this.shipY = h - 58;
        this.p1 = { x: w * 0.25, cd: 0 };
        this.p2 = { x: w * 0.75, cd: 0 };
        this.bullets = [];
        this.asteroids = [];
        this.particles = [];
        this.spawnTimer = 0.4;
        this.flashTimer = 0;
        this.roundMsg = '';
        this.stars = Array.from({ length: 48 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: 0.6 + Math.random() * 1.8
        }));
    }

    spawnAsteroid() {
        const left = Math.random() < 0.5;
        this.asteroids.push({
            x: left
                ? 50 + Math.random() * (this.half - 100)
                : this.half + 50 + Math.random() * (this.half - 100),
            y: -20,
            size: 3,
            vx: (Math.random() - 0.5) * 70,
            vy: 95 + Math.random() * 55,
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 2.5
        });
    }

    fire(owner) {
        const ship = owner === 1 ? this.p1 : this.p2;
        if (ship.cd > 0) return;
        this.bullets.push({
            x: ship.x,
            y: this.shipY - 18,
            vy: -640,
            owner
        });
        ship.cd = 0.28;
        AudioManager.select();
    }

    burst(x, y, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 40 + Math.random() * 140;
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0.25 + Math.random() * 0.35
            });
        }
    }

    splitAsteroid(idx) {
        const a = this.asteroids[idx];
        this.asteroids.splice(idx, 1);
        this.burst(a.x, a.y, 6 + a.size * 2);
        AudioManager.tick();
        if (a.size <= 1) return;
        const push = a.x < this.half ? 1 : -1;
        for (let k = 0; k < 2; k++) {
            this.asteroids.push({
                x: a.x + (k ? 10 : -10),
                y: a.y,
                size: a.size - 1,
                vx: a.vx * 1.15 + (k ? 70 : -70) + push * 25,
                vy: a.vy * 0.75 + 20 + Math.random() * 30,
                rot: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 3.5
            });
        }
    }

    scoreLeak(a) {
        if (a.x < this.half) {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU SCORES!' : 'P2 SCORES!';
            AudioManager.wrong();
        } else {
            this.scoreP1++;
            this.roundMsg = 'P1 SCORES!';
            AudioManager.correct();
        }
        this.flashTimer = 0.45;
        this.burst(a.x, a.y, 10);
    }

    checkWin() {
        if (this.scoreP1 >= 5) {
            GameManager.gameOver(1);
            return true;
        }
        if (this.scoreP2 >= 5) {
            GameManager.gameOver(2);
            return true;
        }
        return false;
    }

    update(dt) {
        if (this.flashTimer > 0) this.flashTimer -= dt;

        this.stars.forEach(s => {
            s.y += s.s * 18 * dt;
            if (s.y > this.height) { s.y = 0; s.x = Math.random() * this.width; }
        });

        const move = 300 * dt;
        if (Input.isDown('KeyA')) this.p1.x -= move;
        if (Input.isDown('KeyD')) this.p1.x += move;
        if (Input.isDown('Space')) this.fire(1);
        this.p1.x = Math.max(36, Math.min(this.half - 36, this.p1.x));
        if (this.p1.cd > 0) this.p1.cd -= dt;

        if (GameManager.isSinglePlayer) {
            let target = null;
            let best = Infinity;
            for (const a of this.asteroids) {
                if (a.x < this.half + 10) continue;
                const threat = a.y + a.vy * 0.4;
                const d = Math.abs(a.x - this.p2.x) + Math.max(0, this.height - threat) * 0.15;
                if (d < best) { best = d; target = a; }
            }
            if (target) {
                const dx = target.x - this.p2.x + (Math.random() - 0.5) * 18;
                if (Math.abs(dx) > 10) this.p2.x += Math.sign(dx) * move * 0.82;
                if (Math.abs(dx) < 40 && this.p2.cd <= 0 && Math.random() < 0.12) this.fire(2);
            } else if (Math.random() < 0.02) {
                this.p2.x += (Math.random() - 0.5) * move;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= move;
            if (Input.isDown('ArrowRight')) this.p2.x += move;
            if (Input.isDown('Enter')) this.fire(2);
        }
        this.p2.x = Math.max(this.half + 36, Math.min(this.width - 36, this.p2.x));
        if (this.p2.cd > 0) this.p2.cd -= dt;

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnAsteroid();
            this.spawnTimer = Math.max(0.45, 0.95 - (this.scoreP1 + this.scoreP2) * 0.04);
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.y += b.vy * dt;
            if (b.y < -20) { this.bullets.splice(i, 1); continue; }

            let hit = false;
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const a = this.asteroids[j];
                if (Math.hypot(b.x - a.x, b.y - a.y) < a.size * 11 + 4) {
                    this.bullets.splice(i, 1);
                    this.splitAsteroid(j);
                    hit = true;
                    break;
                }
            }
            if (hit) continue;
        }

        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const a = this.asteroids[i];
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            a.rot += a.spin * dt;
            if (a.x < 20) { a.x = 20; a.vx = Math.abs(a.vx); }
            if (a.x > this.width - 20) { a.x = this.width - 20; a.vx = -Math.abs(a.vx); }
            if (a.y > this.height - 30) {
                this.scoreLeak(a);
                this.asteroids.splice(i, 1);
                if (this.checkWin()) return;
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawShip(ctx, x, color, label) {
        ctx.save();
        ctx.translate(x, this.shipY);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(18, 14);
        ctx.lineTo(0, 8);
        ctx.lineTo(-18, 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, this.shipY + 28);
    }

    drawAsteroid(ctx, a) {
        const r = a.size * 11;
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
            const ang = (i / 7) * Math.PI * 2;
            const rr = r * (0.75 + ((i * 3) % 5) * 0.05);
            const px = Math.cos(ang) * rr;
            const py = Math.sin(ang) * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        this.stars.forEach(s => {
            ctx.globalAlpha = 0.25 + s.s * 0.2;
            ctx.fillRect(s.x, s.y, s.s, s.s);
        });
        ctx.globalAlpha = 1;

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.moveTo(this.half, 50);
        ctx.lineTo(this.half, this.height - 40);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(0, this.height - 40, this.width, 40);

        this.asteroids.forEach(a => this.drawAsteroid(ctx, a));

        for (const b of this.bullets) {
            ctx.fillStyle = b.owner === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
            ctx.fillRect(b.x - 2, b.y - 10, 4, 16);
        }

        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life * 2);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        this.drawShip(ctx, this.p1.x, Theme.p1, 'P1');
        this.drawShip(ctx, this.p2.x, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hits: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 34);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('A/D or ←/→ move · SPACE / ENTER shoot · don\'t let rocks land on your side', this.width / 2, 56);

        if (this.flashTimer > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 0.2})`;
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 28px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, 90);
        }
    }
}

GameManager.registerGame(new AsteroidsDefense());
