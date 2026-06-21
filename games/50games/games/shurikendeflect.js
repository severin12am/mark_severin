class ShurikenDeflect extends GameBase {
    constructor() {
        super("Shuriken Deflect", "Parry bouncing stars — miss and you're out! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startRound() {
        this.p1 = { x: this.width * 0.3, y: this.height / 2, parry: 0, alive: true };
        this.p2 = { x: this.width * 0.7, y: this.height / 2, parry: 0, alive: true };
        this.stars = [];
        this.time = 0;
        this.spawnTimer = 0.8;
        this.ramp = 1;
    }

    spawnStar() {
        const a = Math.random() * Math.PI * 2;
        const spd = 200 * this.ramp;
        this.stars.push({
            x: this.width / 2 + Math.cos(a) * 40,
            y: this.height / 2 + Math.sin(a) * 40,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            size: 16
        });
    }

    movePlayer(p, left, right, up, down, parryKey, isCpu, dt) {
        if (!p.alive) return;
        const speed = 230 * dt;
        if (isCpu) {
            let fx = 0, fy = 0;
            for (const s of this.stars) {
                const d = Math.hypot(s.x - p.x, s.y - p.y);
                if (d < 100) {
                    fx += (p.x - s.x) / d;
                    fy += (p.y - s.y) / d;
                }
            }
            p.x += fx * speed * 0.9;
            p.y += fy * speed * 0.9;
            const nearest = this.stars.reduce((best, s) =>
                Math.hypot(s.x - p.x, s.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? s : best, this.stars[0]);
            if (nearest && Math.hypot(nearest.x - p.x, nearest.y - p.y) < 50) {
                p.parry = 0.25;
            }
        } else {
            if (Input.isDown(left)) p.x -= speed;
            if (Input.isDown(right)) p.x += speed;
            if (Input.isDown(up)) p.y -= speed;
            if (Input.isDown(down)) p.y += speed;
            if (this.justPressed(parryKey)) p.parry = 0.3;
        }
        if (p.parry > 0) p.parry -= dt;
        p.x = Math.max(35, Math.min(this.width - 35, p.x));
        p.y = Math.max(70, Math.min(this.height - 35, p.y));
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        this.time += dt;
        this.ramp = 1 + this.time * 0.08;
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.stars.length < 6) {
            this.spawnStar();
            this.spawnTimer = Math.max(0.25, 0.7 - this.time * 0.03);
        }

        this.movePlayer(this.p1, 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', false, dt);
        this.movePlayer(this.p2, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', GameManager.isSinglePlayer, dt);

        for (const s of this.stars) {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            if (s.x < 30) { s.x = 30; s.vx = Math.abs(s.vx); }
            if (s.x > this.width - 30) { s.x = this.width - 30; s.vx = -Math.abs(s.vx); }
            if (s.y < 60) { s.y = 60; s.vy = Math.abs(s.vy); }
            if (s.y > this.height - 30) { s.y = this.height - 30; s.vy = -Math.abs(s.vy); }

            const hit = (p, idx) => {
                if (!p.alive) return;
                if (Math.hypot(p.x - s.x, p.y - s.y) >= 38) return;
                if (p.parry > 0) {
                    const dx = p.x - s.x, dy = p.y - s.y;
                    const len = Math.hypot(dx, dy) || 1;
                    s.vx = (dx / len) * 520 * this.ramp;
                    s.vy = (dy / len) * 520 * this.ramp;
                    AudioManager.move();
                    return;
                }
                p.alive = false;
                if (idx === 0) {
                    this.scoreP2++;
                    this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 WINS ROUND!';
                    AudioManager.wrong();
                } else {
                    this.scoreP1++;
                    this.roundMsg = 'P1 WINS ROUND!';
                    AudioManager.correct();
                }
                if (this.scoreP1 >= 3) GameManager.gameOver(1);
                else if (this.scoreP2 >= 3) GameManager.gameOver(2);
                else {
                    this.msgTimer = 1.1;
                    this.startRound();
                }
            };
            hit(this.p1, 0);
            if (this.msgTimer > 0) return;
            hit(this.p2, 1);
            if (this.msgTimer > 0) return;
        }
    }

    drawStar(ctx, s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -s.size);
            ctx.lineTo(0, -s.size * 0.4);
            ctx.stroke();
        }
        ctx.restore();
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 32);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('SPACE / ENTER parry when star hits you', this.width / 2, 50);

        this.stars.forEach(s => this.drawStar(ctx, s));

        const drawNinja = (p, color, label) => {
            if (!p.alive) return;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
            ctx.fill();
            if (p.parry > 0) {
                ctx.strokeStyle = Theme.accent;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 36, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 9px Arial';
            ctx.fillText(label, p.x, p.y + 38);
        };

        drawNinja(this.p1, Theme.p1, 'P1');
        drawNinja(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD move · SPACE parry  |  Arrows · ENTER (2P)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new ShurikenDeflect());
