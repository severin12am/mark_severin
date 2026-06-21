class GameSpaceDuel extends GameBase {
    constructor() {
        super("Space Duel", "Dodge and shoot — first to 5 hits.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.stars = Array.from({ length: 40 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: 1 + Math.random() * 2
        }));
        this.hitFlash = 0;
        this.startRound();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startRound() {
        this.s1 = { x: this.width / 2, y: this.height - 70, vx: 0, vy: 0, cd: 0, inv: 0.8 };
        this.s2 = { x: this.width / 2, y: 70, vx: 0, vy: 0, cd: 0, inv: 0.8 };
        this.bullets = [];
        this.respawn = 0.6;
    }

    fire(ship, owner, vy) {
        this.bullets.push({
            x: ship.x,
            y: ship.y + (owner === 1 ? -22 : 22),
            vx: ship.vx * 0.4,
            vy,
            owner
        });
        ship.cd = 0.35;
        AudioManager.select();
    }

    updateShip(ship, left, right, up, down, fireKey, owner, shootVy, isCpu, dt) {
        const thrust = 520;
        const drag = 0.92;

        if (isCpu) {
            const target = this.s1;
            const dx = target.x - ship.x;
            const dy = target.y - ship.y;
            if (Math.abs(dx) > 30) ship.vx += Math.sign(dx) * thrust * dt * 0.7;
            if (Math.abs(dy) > 80) ship.vy += Math.sign(dy) * thrust * dt * 0.5;
            if (ship.cd <= 0 && Math.abs(dx) < 60 && dy > 40) {
                this.fire(ship, owner, shootVy);
            }
        } else {
            if (Input.isDown(left)) ship.vx -= thrust * dt;
            if (Input.isDown(right)) ship.vx += thrust * dt;
            if (Input.isDown(up)) ship.vy -= thrust * dt;
            if (Input.isDown(down)) ship.vy += thrust * dt;
            if (ship.cd <= 0 && this.justPressed(fireKey)) this.fire(ship, owner, shootVy);
        }

        ship.vx *= drag;
        ship.vy *= drag;
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        ship.x = Math.max(30, Math.min(this.width - 30, ship.x));
        ship.y = owner === 1
            ? Math.max(this.height * 0.55, Math.min(this.height - 40, ship.y))
            : Math.max(40, Math.min(this.height * 0.45, ship.y));
        if (ship.cd > 0) ship.cd -= dt;
        if (ship.inv > 0) ship.inv -= dt;
    }

    update(dt) {
        if (this.respawn > 0) {
            this.respawn -= dt;
            return;
        }
        if (this.hitFlash > 0) this.hitFlash -= dt;

        this.stars.forEach(s => {
            s.y += s.s * 20 * dt;
            if (s.y > this.height) s.y = 0;
        });

        this.updateShip(this.s1, 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 1, -620, false, dt);
        this.updateShip(this.s2, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 2, 620,
            GameManager.isSinglePlayer, dt);

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < -20 || b.x > this.width + 20 || b.y < -20 || b.y > this.height + 20) {
                this.bullets.splice(i, 1);
                continue;
            }

            const target = b.owner === 1 ? this.s2 : this.s1;
            if (target.inv <= 0 &&
                Math.abs(b.x - target.x) < 28 && Math.abs(b.y - target.y) < 22) {
                if (b.owner === 1) this.scoreP1++;
                else this.scoreP2++;
                this.bullets = [];
                this.hitFlash = 0.4;
                AudioManager.correct();
                if (this.scoreP1 >= 5) GameManager.gameOver(1);
                else if (this.scoreP2 >= 5) GameManager.gameOver(2);
                else this.startRound();
                return;
            }
        }
    }

    drawShip(ctx, s, color, flip) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.fillStyle = color;
        ctx.globalAlpha = s.inv > 0 ? 0.45 + Math.sin(Date.now() * 0.02) * 0.25 : 1;
        ctx.beginPath();
        if (flip) {
            ctx.moveTo(0, 16);
            ctx.lineTo(-18, -12);
            ctx.lineTo(18, -12);
        } else {
            ctx.moveTo(0, -16);
            ctx.lineTo(-18, 12);
            ctx.lineTo(18, 12);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    render(ctx) {
        ctx.fillStyle = '#060612';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        this.stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

        ctx.strokeStyle = Theme.accent;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(this.width, this.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hits: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 32);

        this.drawShip(ctx, this.s1, Theme.p1, false);
        this.drawShip(ctx, this.s2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, true);

        ctx.fillStyle = Theme.accent;
        this.bullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        if (this.respawn > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText('FIGHT!', this.width / 2, this.height / 2);
        }

        if (this.hitFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.hitFlash * 0.2})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD move · SPACE shoot  |  Arrows move · ENTER shoot', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GameSpaceDuel());
