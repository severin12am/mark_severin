class CentipedeDefense extends GameBase {
    constructor() {
        super("Centipede Defense", "Blast the centipede segments! Head hits score more. First to 30.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.half = w / 2;
        this.p1 = { x: w * 0.25, y: h - 52, cd: 0 };
        this.p2 = { x: w * 0.75, y: h - 52, cd: 0 };
        this.bullets = [];
        this.mushrooms = [];
        this.particles = [];
        this.speedMul = 1;
        this.wave = 1;
        this.flashTimer = 0;
        this.spawnMushrooms();
        this.spawnCentipede();
    }

    spawnMushrooms() {
        this.mushrooms = [];
        for (let i = 0; i < 14; i++) {
            this.mushrooms.push({
                x: 40 + Math.random() * (this.width - 80),
                y: 90 + Math.random() * (this.height * 0.45),
                hp: 2 + (Math.random() < 0.3 ? 1 : 0)
            });
        }
    }

    spawnCentipede() {
        this.centipede = [];
        const n = 10 + Math.min(6, this.wave);
        const startLeft = Math.random() < 0.5;
        for (let i = 0; i < n; i++) {
            this.centipede.push({
                x: startLeft ? 80 + i * 26 : this.width - 80 - i * 26,
                y: 70,
                vx: (startLeft ? 1 : -1) * (95 + this.wave * 8) * this.speedMul,
                alive: true,
                isHead: i === 0,
                r: 12
            });
        }
    }

    fire(owner) {
        const p = owner === 1 ? this.p1 : this.p2;
        if (p.cd > 0) return;
        this.bullets.push({
            x: p.x,
            y: p.y - 10,
            vy: -560,
            owner
        });
        p.cd = 0.22;
        AudioManager.select();
    }

    burst(x, y, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 40 + Math.random() * 130;
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0.25 + Math.random() * 0.3
            });
        }
    }

    checkWin() {
        if (this.scoreP1 >= 30) {
            GameManager.gameOver(1);
            return true;
        }
        if (this.scoreP2 >= 30) {
            GameManager.gameOver(2);
            return true;
        }
        return false;
    }

    update(dt) {
        if (this.flashTimer > 0) this.flashTimer -= dt;

        const move = 290 * dt;
        if (Input.isDown('KeyA')) this.p1.x -= move;
        if (Input.isDown('KeyD')) this.p1.x += move;
        if (Input.isDown('Space')) this.fire(1);
        this.p1.x = Math.max(24, Math.min(this.half - 24, this.p1.x));
        if (this.p1.cd > 0) this.p1.cd -= dt;

        if (GameManager.isSinglePlayer) {
            let target = this.centipede.find(s => s.alive && s.isHead);
            if (!target) target = this.centipede.find(s => s.alive);
            if (target) {
                const aim = target.x + (Math.random() - 0.5) * 30;
                const dx = aim - this.p2.x;
                if (Math.abs(dx) > 8) this.p2.x += Math.sign(dx) * move * 0.8;
                if (Math.abs(this.p2.x - target.x) < 48 && this.p2.cd <= 0 && Math.random() < 0.14) {
                    this.fire(2);
                }
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= move;
            if (Input.isDown('ArrowRight')) this.p2.x += move;
            if (Input.isDown('Enter')) this.fire(2);
        }
        this.p2.x = Math.max(this.half + 24, Math.min(this.width - 24, this.p2.x));
        if (this.p2.cd > 0) this.p2.cd -= dt;

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.y += b.vy * dt;
            if (b.y < 20) {
                this.bullets.splice(i, 1);
                continue;
            }

            let hit = false;
            for (const m of this.mushrooms) {
                if (m.hp <= 0) continue;
                if (Math.abs(b.x - m.x) < 14 && Math.abs(b.y - m.y) < 14) {
                    m.hp--;
                    this.bullets.splice(i, 1);
                    this.burst(m.x, m.y, 4);
                    AudioManager.tick();
                    hit = true;
                    break;
                }
            }
            if (hit) continue;

            for (const s of this.centipede) {
                if (!s.alive) continue;
                if (Math.hypot(b.x - s.x, b.y - s.y) < s.r + 4) {
                    s.alive = false;
                    const pts = s.isHead ? 5 : 2;
                    if (b.owner === 1) this.scoreP1 += pts;
                    else this.scoreP2 += pts;
                    this.bullets.splice(i, 1);
                    this.burst(s.x, s.y, 8);
                    this.speedMul = Math.min(2.2, this.speedMul + 0.04);
                    AudioManager.correct();
                    // promote next alive as head
                    if (s.isHead) {
                        const next = this.centipede.find(seg => seg.alive);
                        if (next) next.isHead = true;
                    }
                    // leave a mushroom
                    this.mushrooms.push({ x: s.x, y: s.y, hp: 2 });
                    hit = true;
                    if (this.checkWin()) return;
                    break;
                }
            }
            if (hit) continue;
        }

        let alive = 0;
        for (const s of this.centipede) {
            if (!s.alive) continue;
            alive++;
            s.x += s.vx * dt;

            // mushroom collisions reverse
            for (const m of this.mushrooms) {
                if (m.hp <= 0) continue;
                if (Math.abs(s.x - m.x) < 18 && Math.abs(s.y - m.y) < 16) {
                    s.vx = -s.vx;
                    s.y += 28;
                    s.x += Math.sign(s.vx) * 6;
                    break;
                }
            }

            if ((s.vx > 0 && s.x > this.width - 28) || (s.vx < 0 && s.x < 28)) {
                s.vx = -s.vx;
                s.y += 30;
            }

            // reached player line — pressure: small score to neither, just reset wave threat
            if (s.y > this.height - 90) {
                s.y = 70;
                s.vx = Math.sign(s.vx || 1) * Math.abs(s.vx) * 1.05;
            }
        }

        if (alive === 0) {
            this.wave++;
            this.speedMul = Math.min(2.4, this.speedMul + 0.12);
            this.flashTimer = 0.5;
            this.spawnCentipede();
            AudioManager.move();
        }

        this.mushrooms = this.mushrooms.filter(m => m.hp > 0);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawCannon(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 16);
        ctx.lineTo(p.x + 16, p.y + 10);
        ctx.lineTo(p.x - 16, p.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(p.x - 3, p.y - 22, 6, 12);
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + 24);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // subtle ground grid
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let y = 60; y < this.height; y += 28) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.moveTo(this.half, 50);
        ctx.lineTo(this.half, this.height - 30);
        ctx.stroke();
        ctx.setLineDash([]);

        for (const m of this.mushrooms) {
            ctx.fillStyle = Theme.accent;
            ctx.globalAlpha = 0.4 + m.hp * 0.25;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(m.x - 4, m.y + 2, 8, 8);
        }

        for (const s of this.centipede) {
            if (!s.alive) continue;
            ctx.fillStyle = s.isHead ? Theme.accent : Theme.fg;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            if (s.isHead) {
                ctx.fillStyle = Theme.bg;
                ctx.beginPath();
                ctx.arc(s.x + (s.vx > 0 ? 4 : -4), s.y - 3, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (const b of this.bullets) {
            ctx.fillStyle = b.owner === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
            ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
        }

        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life * 2.5);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(p.x - 2, p.y - 2, 3, 3);
        }
        ctx.globalAlpha = 1;

        this.drawCannon(ctx, this.p1, Theme.p1, 'P1');
        this.drawCannon(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Score: ${this.scoreP1} — ${this.scoreP2}  (first to 30)  · Wave ${this.wave}`, this.width / 2, 30);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('A/D or ←/→ move · SPACE / ENTER shoot · head = 5 pts, body = 2', this.width / 2, 50);

        if (this.flashTimer > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 26px Impact';
            ctx.fillText(`WAVE ${this.wave}!`, this.width / 2, 88);
        }
    }
}

GameManager.registerGame(new CentipedeDefense());
