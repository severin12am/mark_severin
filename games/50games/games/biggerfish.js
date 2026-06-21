class BiggerFish extends GameBase {
    constructor() {
        super("Bigger Fish", "Eat to grow — gobble the rival when you're bigger! First to 50.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: 120, y: h / 2, r: 16, vx: 0, vy: 0 };
        this.p2 = { x: w - 120, y: h / 2, r: 16, vx: 0, vy: 0 };
        this.npcs = [];
        this.food = [];
        for (let i = 0; i < 18; i++) this.spawnNpc();
        for (let i = 0; i < 25; i++) this.spawnFood();
        this.eatFlash = 0;
    }

    spawnNpc() {
        this.npcs.push({
            x: 40 + Math.random() * (this.width - 80),
            y: 60 + Math.random() * (this.height - 80),
            r: 6 + Math.random() * 22,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 80
        });
    }

    spawnFood() {
        this.food.push({
            x: 30 + Math.random() * (this.width - 60),
            y: 50 + Math.random() * (this.height - 60),
            r: 4
        });
    }

    moveFish(p, up, down, left, right, isCpu, dt) {
        const speed = Math.max(120, 520 - p.r * 6);
        if (isCpu) {
            let target = null;
            let best = Infinity;
            for (const f of this.food) {
                const d = Math.hypot(f.x - p.x, f.y - p.y);
                if (d < best) { best = d; target = f; }
            }
            for (const n of this.npcs) {
                if (n.r < p.r * 0.95) {
                    const d = Math.hypot(n.x - p.x, n.y - p.y);
                    if (d < best) { best = d; target = n; }
                }
            }
            if (this.p1.r < p.r * 0.95) {
                const d = Math.hypot(this.p1.x - p.x, this.p1.y - p.y);
                if (d < 180) { target = this.p1; }
            }
            if (target) {
                p.vx += Math.sign(target.x - p.x) * speed * dt * 0.8;
                p.vy += Math.sign(target.y - p.y) * speed * dt * 0.8;
            }
        } else {
            if (Input.isDown(up)) p.vy -= speed * dt;
            if (Input.isDown(down)) p.vy += speed * dt;
            if (Input.isDown(left)) p.vx -= speed * dt;
            if (Input.isDown(right)) p.vx += speed * dt;
        }
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.x = Math.max(p.r, Math.min(this.width - p.r, p.x));
        p.y = Math.max(p.r + 50, Math.min(this.height - p.r, p.y));
    }

    canEat(eater, prey, food) {
        if (food) return Math.hypot(eater.x - prey.x, eater.y - prey.y) < eater.r;
        return eater.r > prey.r * 1.08 && Math.hypot(eater.x - prey.x, eater.y - prey.y) < eater.r * 0.85;
    }

    update(dt) {
        if (this.eatFlash > 0) this.eatFlash -= dt;

        this.moveFish(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', false, dt);
        this.moveFish(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', GameManager.isSinglePlayer, dt);

        this.npcs.forEach(n => {
            n.x += n.vx * dt;
            n.y += n.vy * dt;
            if (n.x < n.r || n.x > this.width - n.r) n.vx *= -1;
            if (n.y < n.r + 50 || n.y > this.height - n.r) n.vy *= -1;
        });

        this.food = this.food.filter(f => {
            if (this.canEat(this.p1, f, true)) {
                this.p1.r += 0.4;
                this.scoreP1++;
                this.eatFlash = 0.15;
                AudioManager.tick();
                return false;
            }
            if (this.canEat(this.p2, f, true)) {
                this.p2.r += 0.4;
                this.scoreP2++;
                AudioManager.tick();
                return false;
            }
            return true;
        });
        while (this.food.length < 25) this.spawnFood();

        this.npcs = this.npcs.filter(n => {
            if (this.canEat(this.p1, n, false)) {
                this.p1.r += n.r * 0.15;
                this.scoreP1 += 5;
                AudioManager.correct();
                return false;
            }
            if (this.canEat(this.p2, n, false)) {
                this.p2.r += n.r * 0.15;
                this.scoreP2 += 5;
                AudioManager.correct();
                return false;
            }
            return true;
        });
        while (this.npcs.length < 18) this.spawnNpc();

        if (this.canEat(this.p1, this.p2, false)) {
            this.scoreP1 += 20;
            AudioManager.correct();
            GameManager.gameOver(1);
            return;
        }
        if (this.canEat(this.p2, this.p1, false)) {
            this.scoreP2 += 20;
            AudioManager.correct();
            GameManager.gameOver(2);
            return;
        }

        if (this.scoreP1 >= 50) GameManager.gameOver(1);
        if (this.scoreP2 >= 50) GameManager.gameOver(2);
    }

    drawFish(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(p.x + p.r * 0.35, p.y - p.r * 0.2, Math.max(2, p.r * 0.12), 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + p.r + 12);
    }

    render(ctx) {
        ctx.fillStyle = '#0a1830';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Points: ${this.scoreP1} — ${this.scoreP2}  (first to 50 · eat rival = win)`, this.width / 2, 32);

        ctx.fillStyle = Theme.accent;
        this.food.forEach(f => {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
        });

        this.npcs.forEach(n => {
            ctx.fillStyle = '#667';
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        this.drawFish(ctx, this.p1, Theme.p1, 'P1');
        this.drawFish(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.eatFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.eatFlash})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD swim · bigger fish eats smaller', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new BiggerFish());
