class BulletHellDuel extends GameBase {
    constructor() {
        super("Bullet Hell Duel", "Dodge bouncing bullets — last standing wins the round! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    startRound() {
        this.p1 = { x: this.width * 0.3, y: this.height / 2, alive: true };
        this.p2 = { x: this.width * 0.7, y: this.height / 2, alive: true };
        this.bullets = [];
        this.time = 0;
        this.spawnTimer = 0.4;
    }

    spawnBullet() {
        const angle = Math.random() * Math.PI * 2;
        const spd = 160 + this.time * 15;
        this.bullets.push({
            x: Math.random() * this.width,
            y: 60 + Math.random() * (this.height - 80),
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            r: 7
        });
    }

    movePlayer(p, left, right, up, down, isCpu, dt) {
        if (!p.alive) return;
        const speed = 240;
        let dx = 0, dy = 0;

        if (isCpu) {
            let fx = 0, fy = 0;
            for (const b of this.bullets) {
                const d = Math.hypot(b.x - p.x, b.y - p.y);
                if (d < 140) {
                    const w = 1 / Math.max(d, 20);
                    fx += (p.x - b.x) * w * 2;
                    fy += (p.y - b.y) * w * 2;
                }
            }
            fx += (this.width * 0.7 - p.x) * 0.002;
            fy += (this.height / 2 - p.y) * 0.002;
            const len = Math.hypot(fx, fy) || 1;
            dx = fx / len;
            dy = fy / len;
        } else {
            if (Input.isDown(left)) dx -= 1;
            if (Input.isDown(right)) dx += 1;
            if (Input.isDown(up)) dy -= 1;
            if (Input.isDown(down)) dy += 1;
            const len = Math.hypot(dx, dy) || 1;
            dx /= len;
            dy /= len;
        }

        p.x += dx * speed * dt;
        p.y += dy * speed * dt;
        p.x = Math.max(30, Math.min(this.width - 30, p.x));
        p.y = Math.max(70, Math.min(this.height - 30, p.y));
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        this.time += dt;
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.bullets.length < 22) {
            this.spawnBullet();
            this.spawnTimer = Math.max(0.12, 0.45 - this.time * 0.02);
        }

        this.movePlayer(this.p1, 'KeyA', 'KeyD', 'KeyW', 'KeyS', false, dt);
        this.movePlayer(this.p2, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', GameManager.isSinglePlayer, dt);

        for (const b of this.bullets) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
            if (b.x > this.width - b.r) { b.x = this.width - b.r; b.vx = -Math.abs(b.vx); }
            if (b.y < b.r + 50) { b.y = b.r + 50; b.vy = Math.abs(b.vy); }
            if (b.y > this.height - b.r) { b.y = this.height - b.r; b.vy = -Math.abs(b.vy); }
        }

        const checkHit = (p, idx) => {
            if (!p.alive) return;
            for (const b of this.bullets) {
                if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + 22) {
                    p.alive = false;
                    if (idx === 0) {
                        this.scoreP2++;
                        this.roundMsg = GameManager.isSinglePlayer ? 'CPU SURVIVES!' : 'P2 WINS ROUND!';
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
                    return;
                }
            }
        };
        checkHit(this.p1, 0);
        if (this.msgTimer > 0) return;
        checkHit(this.p2, 1);
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
        ctx.fillText(`bullet speed ${Math.floor(160 + this.time * 15)}`, this.width / 2, 50);

        ctx.fillStyle = Theme.accent;
        this.bullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        });

        if (this.p1.alive) {
            ctx.fillStyle = Theme.p1;
            ctx.beginPath();
            ctx.arc(this.p1.x, this.p1.y, 22, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.p2.alive) {
            ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
            ctx.beginPath();
            ctx.arc(this.p2.x, this.p2.y, 22, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD dodge · Arrows dodge (2P)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new BulletHellDuel());
