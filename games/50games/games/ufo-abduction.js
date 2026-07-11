class UFOAbduction extends GameBase {
    constructor() {
        super("UFO Abduction", "Tractor-beam the cattle! First to 8 abductions wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.groundY = h * 0.72;
        this.p1 = { x: w * 0.3, y: 120, beam: false, beamPower: 0 };
        this.p2 = { x: w * 0.7, y: 120, beam: false, beamPower: 0 };
        this.cows = [];
        this.particles = [];
        this.popups = [];
        this.flashTimer = 0;
        for (let i = 0; i < 12; i++) this.spawnCow();
        this.stars = Array.from({ length: 40 }, () => ({
            x: Math.random() * w,
            y: Math.random() * this.groundY,
            s: 0.5 + Math.random() * 1.5
        }));
    }

    spawnCow() {
        this.cows.push({
            x: 50 + Math.random() * (this.width - 100),
            y: this.groundY + 18 + Math.random() * 40,
            vx: (Math.random() - 0.5) * 70,
            lift: 0,
            owner: 0,
            w: 34,
            h: 18
        });
    }

    clampUfo(u) {
        u.x = Math.max(40, Math.min(this.width - 40, u.x));
        u.y = Math.max(50, Math.min(this.groundY - 80, u.y));
    }

    burst(x, y, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 30 + Math.random() * 100;
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0.3 + Math.random() * 0.3
            });
        }
    }

    checkWin() {
        if (this.scoreP1 >= 8) {
            GameManager.gameOver(1);
            return true;
        }
        if (this.scoreP2 >= 8) {
            GameManager.gameOver(2);
            return true;
        }
        return false;
    }

    update(dt) {
        if (this.flashTimer > 0) this.flashTimer -= dt;

        const moveX = 280 * dt;
        const moveY = 170 * dt;

        if (Input.isDown('KeyA')) this.p1.x -= moveX;
        if (Input.isDown('KeyD')) this.p1.x += moveX;
        if (Input.isDown('KeyW')) this.p1.y -= moveY;
        if (Input.isDown('KeyS')) this.p1.y += moveY;
        this.p1.beam = Input.isDown('Space');
        this.clampUfo(this.p1);

        if (GameManager.isSinglePlayer) {
            let target = null;
            let best = Infinity;
            for (const c of this.cows) {
                if (c.owner === 1) continue;
                // prefer cows not already lifted high by p1
                const d = Math.abs(c.x - this.p2.x) + Math.abs(c.y - this.groundY) * 0.2;
                if (d < best) { best = d; target = c; }
            }
            if (target) {
                const dx = target.x - this.p2.x + (Math.random() - 0.5) * 16;
                const dy = (target.y - 90) - this.p2.y;
                if (Math.abs(dx) > 8) this.p2.x += Math.sign(dx) * moveX * 0.82;
                if (Math.abs(dy) > 12) this.p2.y += Math.sign(dy) * moveY * 0.55;
                this.p2.beam = Math.abs(this.p2.x - target.x) < 36 && Math.random() > 0.08;
            } else {
                this.p2.beam = false;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= moveX;
            if (Input.isDown('ArrowRight')) this.p2.x += moveX;
            if (Input.isDown('ArrowUp')) this.p2.y -= moveY;
            if (Input.isDown('ArrowDown')) this.p2.y += moveY;
            this.p2.beam = Input.isDown('Enter');
        }
        this.clampUfo(this.p2);

        this.p1.beamPower = this.p1.beam ? Math.min(1, this.p1.beamPower + dt * 2) : Math.max(0, this.p1.beamPower - dt * 3);
        this.p2.beamPower = this.p2.beam ? Math.min(1, this.p2.beamPower + dt * 2) : Math.max(0, this.p2.beamPower - dt * 3);

        for (let i = this.cows.length - 1; i >= 0; i--) {
            const c = this.cows[i];
            c.owner = 0;

            // wander
            if (c.lift < 5) {
                c.x += c.vx * dt;
                c.vx += (Math.random() - 0.5) * 50 * dt;
                c.vx = Math.max(-80, Math.min(80, c.vx));
                if (c.x < 40) { c.x = 40; c.vx = Math.abs(c.vx); }
                if (c.x > this.width - 40) { c.x = this.width - 40; c.vx = -Math.abs(c.vx); }
                // settle to ground
                if (c.y < this.groundY + 10) c.y += 80 * dt;
                if (c.y > this.groundY + 50) c.y = this.groundY + 30;
            }

            const pull = (ufo, owner) => {
                if (ufo.beamPower <= 0.05) return;
                const halfW = 22 + ufo.beamPower * 10;
                if (Math.abs(c.x - ufo.x) < halfW && c.y > ufo.y + 10) {
                    c.owner = owner;
                    c.lift += 220 * ufo.beamPower * dt;
                    c.y -= 260 * ufo.beamPower * dt;
                    c.x += (ufo.x - c.x) * 2.2 * dt;
                    c.vx *= 0.9;
                }
            };
            pull(this.p1, 1);
            pull(this.p2, 2);

            // abducted
            if (c.y < this.p1.y + 8 && Math.abs(c.x - this.p1.x) < 28 && this.p1.beam) {
                this.scoreP1++;
                this.burst(c.x, c.y, 12);
                this.popups.push({ x: this.p1.x, y: this.p1.y - 20, text: '+1', life: 0.6 });
                this.cows.splice(i, 1);
                this.spawnCow();
                this.flashTimer = 0.25;
                AudioManager.correct();
                if (this.checkWin()) return;
                continue;
            }
            if (c.y < this.p2.y + 8 && Math.abs(c.x - this.p2.x) < 28 && this.p2.beam) {
                this.scoreP2++;
                this.burst(c.x, c.y, 12);
                this.popups.push({ x: this.p2.x, y: this.p2.y - 20, text: '+1', life: 0.6 });
                this.cows.splice(i, 1);
                this.spawnCow();
                this.flashTimer = 0.25;
                AudioManager.correct();
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
        for (let i = this.popups.length - 1; i >= 0; i--) {
            this.popups[i].y -= 40 * dt;
            this.popups[i].life -= dt;
            if (this.popups[i].life <= 0) this.popups.splice(i, 1);
        }
    }

    drawUfo(ctx, u, color, label) {
        if (u.beam && u.beamPower > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.globalAlpha = 0.12 + u.beamPower * 0.25;
            ctx.beginPath();
            ctx.moveTo(u.x - 10, u.y + 12);
            ctx.lineTo(u.x + 10, u.y + 12);
            ctx.lineTo(u.x + 28 + u.beamPower * 12, this.groundY + 40);
            ctx.lineTo(u.x - 28 - u.beamPower * 12, this.groundY + 40);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = Theme.accent;
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([6, 8]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(u.x, u.y + 12);
            ctx.lineTo(u.x, this.groundY + 20);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        // saucer
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y - 8, 14, 10, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y, 30, 12, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, u.x, u.y - 24);
    }

    drawCow(ctx, c) {
        ctx.fillStyle = c.owner === 1 ? Theme.p1 : (c.owner === 2
            ? (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2)
            : Theme.fg);
        ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
        // head
        ctx.fillRect(c.x + c.w / 2 - 4, c.y - c.h / 2 - 10, 12, 12);
        // legs
        ctx.fillRect(c.x - 12, c.y + c.h / 2, 5, 8);
        ctx.fillRect(c.x + 6, c.y + c.h / 2, 5, 8);
        // spots
        ctx.fillStyle = Theme.bg;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(c.x - 6, c.y, 4, 0, Math.PI * 2);
        ctx.arc(c.x + 5, c.y + 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        this.stars.forEach(s => {
            ctx.globalAlpha = 0.2 + s.s * 0.2;
            ctx.fillRect(s.x, s.y, s.s, s.s);
        });
        ctx.globalAlpha = 1;

        // ground
        ctx.fillStyle = Theme.fg;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(this.width, this.groundY);
        ctx.stroke();

        // hills
        ctx.fillStyle = Theme.fg;
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        for (let x = 0; x <= this.width; x += 40) {
            ctx.lineTo(x, this.groundY - 12 - Math.sin(x * 0.02) * 10);
        }
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.fill();
        ctx.globalAlpha = 1;

        for (const c of this.cows) this.drawCow(ctx, c);

        this.drawUfo(ctx, this.p1, Theme.p1, 'P1');
        this.drawUfo(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life * 2);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        for (const p of this.popups) {
            ctx.globalAlpha = Math.max(0, p.life * 1.5);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Abducted: ${this.scoreP1} — ${this.scoreP2}  (first to 8)`, this.width / 2, 28);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('WASD / arrows move · hold SPACE / ENTER tractor beam', this.width / 2, 50);

        if (this.flashTimer > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 0.2})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}

GameManager.registerGame(new UFOAbduction());
