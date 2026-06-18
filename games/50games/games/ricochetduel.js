class RicochetDuel extends GameBase {
    constructor() {
        super("Ricochet Duel", "Shoot bouncing bullets! First to 5 hits.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: 120, y: this.height / 2, size: 20, cd: 0, lastDx: 1, lastDy: 0 };
        this.p2 = { x: this.width - 120, y: this.height / 2, size: 20, cd: 0, lastDx: -1, lastDy: 0 };
        this.bullets = [];
        this.hitFlash = 0;
        this.keys = {};
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    clampPlayer(p) {
        p.x = Math.max(p.size, Math.min(this.width - p.size, p.x));
        p.y = Math.max(p.size, Math.min(this.height - p.size, p.y));
    }

    shoot(p, owner) {
        const spd = 9;
        const mag = Math.hypot(p.lastDx, p.lastDy) || 1;
        this.bullets.push({
            x: p.x, y: p.y,
            vx: (p.lastDx / mag) * spd,
            vy: (p.lastDy / mag) * spd,
            bounces: 4,
            owner,
            trail: []
        });
        p.cd = 22;
        AudioManager.select();
    }

    update(dt) {
        const speed = 200 * dt;
        if (this.p1.cd > 0) this.p1.cd--;
        if (this.p2.cd > 0) this.p2.cd--;

        if (Input.isDown('KeyW')) { this.p1.y -= speed; this.p1.lastDy = -1; this.p1.lastDx = 0; }
        if (Input.isDown('KeyS')) { this.p1.y += speed; this.p1.lastDy = 1; this.p1.lastDx = 0; }
        if (Input.isDown('KeyA')) { this.p1.x -= speed; this.p1.lastDx = -1; this.p1.lastDy = 0; }
        if (Input.isDown('KeyD')) { this.p1.x += speed; this.p1.lastDx = 1; this.p1.lastDy = 0; }
        if (this.justPressed('Space') && this.p1.cd <= 0) this.shoot(this.p1, 1);

        if (GameManager.isSinglePlayer) {
            const dy = this.p1.y - this.p2.y;
            if (Math.abs(dy) > 15) {
                this.p2.y += (dy > 0 ? 1 : -1) * speed * 0.75;
                this.p2.lastDy = dy > 0 ? 1 : -1;
                this.p2.lastDx = 0;
            } else {
                this.p2.lastDx = -1;
                this.p2.lastDy = 0;
            }
            if (this.p2.cd <= 0 && Math.abs(dy) < 50) this.shoot(this.p2, 2);
        } else {
            if (Input.isDown('ArrowUp')) { this.p2.y -= speed; this.p2.lastDy = -1; this.p2.lastDx = 0; }
            if (Input.isDown('ArrowDown')) { this.p2.y += speed; this.p2.lastDy = 1; this.p2.lastDx = 0; }
            if (Input.isDown('ArrowLeft')) { this.p2.x -= speed; this.p2.lastDx = -1; this.p2.lastDy = 0; }
            if (Input.isDown('ArrowRight')) { this.p2.x += speed; this.p2.lastDx = 1; this.p2.lastDy = 0; }
            if (this.justPressed('Enter') && this.p2.cd <= 0) this.shoot(this.p2, 2);
        }

        this.clampPlayer(this.p1);
        this.clampPlayer(this.p2);

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > 8) b.trail.shift();

            b.x += b.vx;
            b.y += b.vy;

            if (b.x < 8 || b.x > this.width - 8) { b.vx *= -1; b.bounces--; b.x = Math.max(8, Math.min(this.width - 8, b.x)); }
            if (b.y < 8 || b.y > this.height - 8) { b.vy *= -1; b.bounces--; b.y = Math.max(8, Math.min(this.height - 8, b.y)); }

            if (b.bounces < 0) {
                this.bullets.splice(i, 1);
                continue;
            }

            if (b.owner !== 1 && Math.hypot(b.x - this.p1.x, b.y - this.p1.y) < this.p1.size + 6) {
                this.scoreP2++;
                this.hitFlash = 0.4;
                AudioManager.correct();
                if (this.scoreP2 >= 5) GameManager.gameOver(2);
                else this.resetRound();
                return;
            }
            if (b.owner !== 2 && Math.hypot(b.x - this.p2.x, b.y - this.p2.y) < this.p2.size + 6) {
                this.scoreP1++;
                this.hitFlash = 0.4;
                AudioManager.correct();
                if (this.scoreP1 >= 5) GameManager.gameOver(1);
                else this.resetRound();
                return;
            }
        }

        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

        this.bullets.forEach(b => {
            b.trail.forEach((t, i) => {
                ctx.globalAlpha = (i + 1) / b.trail.length * 0.4;
                ctx.fillStyle = b.owner === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
                ctx.beginPath();
                ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x - this.p1.size / 2, this.p1.y - this.p1.size / 2, this.p1.size, this.p1.size);
        ctx.fillStyle = p2Color;
        ctx.fillRect(this.p2.x - this.p2.size / 2, this.p2.y - this.p2.size / 2, this.p2.size, this.p2.size);

        if (this.hitFlash > 0) {
            ctx.fillStyle = `rgba(255,50,50,${this.hitFlash * 2})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Move to aim direction  |  SPACE / ENTER shoot", this.width / 2, this.height - 14);
    }
}

GameManager.registerGame(new RicochetDuel());
