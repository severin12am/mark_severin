class GameTanks extends GameBase {
    constructor() {
        super("Tank Duel", "WASD drive · Space fire. First to 5 kills.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.obstacles = [
            { x: 320, y: 180, w: 160, h: 24 },
            { x: 120, y: 320, w: 24, h: 140 },
            { x: 556, y: 320, w: 24, h: 140 },
            { x: 320, y: 420, w: 160, h: 24 }
        ];
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
        this.t1 = { x: 90, y: this.height / 2, a: 0, cd: 0 };
        this.t2 = { x: this.width - 90, y: this.height / 2, a: Math.PI, cd: 0 };
        this.bullets = [];
        this.respawn = 0;
    }

    tankBlocked(x, y) {
        for (const o of this.obstacles) {
            if (x > o.x - 22 && x < o.x + o.w + 22 && y > o.y - 22 && y < o.y + o.h + 22) return true;
        }
        return x < 30 || x > this.width - 30 || y < 70 || y > this.height - 30;
    }

    fire(tank, owner) {
        this.bullets.push({
            x: tank.x + Math.cos(tank.a) * 28,
            y: tank.y + Math.sin(tank.a) * 28,
            vx: Math.cos(tank.a) * 420,
            vy: Math.sin(tank.a) * 420,
            owner
        });
        tank.cd = 0.55;
        AudioManager.select();
    }

    updateTank(tank, fwd, back, left, right, fireKey, owner, isCpu, dt) {
        const move = 130 * dt;
        const turn = 2.8 * dt;

        if (isCpu) {
            const target = this.t1;
            const desired = Math.atan2(target.y - tank.y, target.x - tank.x);
            let diff = desired - tank.a;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) > 0.08) tank.a += Math.sign(diff) * turn;
            else {
                const nx = tank.x + Math.cos(tank.a) * move;
                const ny = tank.y + Math.sin(tank.a) * move;
                if (!this.tankBlocked(nx, ny)) { tank.x = nx; tank.y = ny; }
            }
            if (tank.cd <= 0 && Math.abs(diff) < 0.25 && Math.hypot(target.x - tank.x, target.y - tank.y) < 360) {
                this.fire(tank, owner);
            }
        } else {
            if (Input.isDown(fwd)) {
                const nx = tank.x + Math.cos(tank.a) * move;
                const ny = tank.y + Math.sin(tank.a) * move;
                if (!this.tankBlocked(nx, ny)) { tank.x = nx; tank.y = ny; }
            }
            if (Input.isDown(back)) {
                const nx = tank.x - Math.cos(tank.a) * move * 0.7;
                const ny = tank.y - Math.sin(tank.a) * move * 0.7;
                if (!this.tankBlocked(nx, ny)) { tank.x = nx; tank.y = ny; }
            }
            if (Input.isDown(left)) tank.a -= turn;
            if (Input.isDown(right)) tank.a += turn;
            if (tank.cd <= 0 && this.justPressed(fireKey)) this.fire(tank, owner);
        }
        if (tank.cd > 0) tank.cd -= dt;
    }

    update(dt) {
        if (this.respawn > 0) {
            this.respawn -= dt;
            return;
        }
        if (this.hitFlash > 0) this.hitFlash -= dt;

        this.updateTank(this.t1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 1, false, dt);

        if (GameManager.isSinglePlayer) {
            this.updateTank(this.t2, null, null, null, null, null, 2, true, dt);
        } else {
            this.updateTank(this.t2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 2, false, dt);
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            let hitWall = false;
            for (const o of this.obstacles) {
                if (b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) hitWall = true;
            }
            if (b.x < 0 || b.x > this.width || b.y < 60 || b.y > this.height || hitWall) {
                this.bullets.splice(i, 1);
                continue;
            }

            const target = b.owner === 1 ? this.t2 : this.t1;
            if (Math.hypot(b.x - target.x, b.y - target.y) < 24) {
                if (b.owner === 1) this.scoreP1++;
                else this.scoreP2++;
                this.bullets.splice(i, 1);
                this.hitFlash = 0.35;
                AudioManager.correct();
                if (this.scoreP1 >= 5) GameManager.gameOver(1);
                else if (this.scoreP2 >= 5) GameManager.gameOver(2);
                else {
                    this.startRound();
                    this.respawn = 0.5;
                }
                return;
            }
        }
    }

    drawTank(ctx, t, color, label) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.a);
        ctx.fillStyle = color;
        ctx.fillRect(-22, -16, 44, 32);
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, -5, 30, 10);
        ctx.restore();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, t.x, t.y + 32);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Kills: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 32);

        ctx.fillStyle = Theme.fg;
        this.obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));

        this.drawTank(ctx, this.t1, Theme.p1, 'P1');
        this.drawTank(ctx, this.t2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.accent;
        this.bullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        if (this.respawn > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 24px Impact';
            ctx.fillText('RESPAWN', this.width / 2, this.height / 2);
        }

        if (this.hitFlash > 0) {
            ctx.fillStyle = `rgba(255,42,84,${this.hitFlash})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD drive · SPACE fire  |  ↑↓←→ drive · ENTER fire', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GameTanks());
