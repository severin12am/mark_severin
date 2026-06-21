class SkyJoust extends GameBase {
    constructor() {
        super("Sky Joust", "Flap high and strike from above! First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.platforms = [
            { x: 120, y: 420, w: 160, h: 14 },
            { x: 520, y: 420, w: 160, h: 14 },
            { x: 300, y: 300, w: 200, h: 14 },
            { x: 80, y: 200, w: 140, h: 14 },
            { x: 580, y: 200, w: 140, h: 14 },
            { x: 340, y: 130, w: 120, h: 14 }
        ];
        this.spawnPlayers();
        this.particles = [];
        this.hitMsg = '';
        this.hitTimer = 0;
    }

    spawnPlayers() {
        this.p1 = { x: 180, y: 380, vx: 0, vy: 0, w: 28, h: 28, cd: 0 };
        this.p2 = { x: 620, y: 380, vx: 0, vy: 0, w: 28, h: 28, cd: 0 };
    }

    onPlatform(p) {
        for (const pl of this.platforms) {
            if (p.x + p.w > pl.x && p.x < pl.x + pl.w &&
                p.y + p.h >= pl.y && p.y + p.h <= pl.y + pl.h + 8 && p.vy >= 0) {
                p.y = pl.y - p.h;
                p.vy = 0;
                return true;
            }
        }
        return false;
    }

    update(dt) {
        if (this.hitTimer > 0) {
            this.hitTimer -= dt;
            return;
        }

        const gravity = 780;
        const flap = -340;
        const move = 260;

        if (Input.isDown('KeyW') || Input.isDown('Space')) this.p1.vy = flap;
        if (Input.isDown('KeyA')) this.p1.vx = -move;
        else if (Input.isDown('KeyD')) this.p1.vx = move;
        else this.p1.vx *= 0.85;

        if (GameManager.isSinglePlayer) {
            if (this.p2.y > this.p1.y - 15 || this.p2.y > 250) this.p2.vy = flap * 0.92;
            if (this.p2.x > this.p1.x + 20) this.p2.vx = -move * 0.85;
            else if (this.p2.x < this.p1.x - 20) this.p2.vx = move * 0.85;
            else this.p2.vx *= 0.85;
        } else {
            if (Input.isDown('ArrowUp') || Input.isDown('Enter')) this.p2.vy = flap;
            if (Input.isDown('ArrowLeft')) this.p2.vx = -move;
            else if (Input.isDown('ArrowRight')) this.p2.vx = move;
            else this.p2.vx *= 0.85;
        }

        [this.p1, this.p2].forEach(p => {
            p.vy += gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 20) p.x = 20;
            if (p.x > this.width - 20 - p.w) p.x = this.width - 20 - p.w;
            if (!this.onPlatform(p) && p.y > this.height - 60) {
                p.y = this.height - 60;
                p.vy = 0;
            }
            if (p.y < 20) { p.y = 20; p.vy = 0; }
        });

        if (this.checkCollision(this.p1, this.p2)) {
            const p1Higher = this.p1.y + this.p1.h * 0.5 < this.p2.y + this.p2.h * 0.5 - 6;
            const p2Higher = this.p2.y + this.p2.h * 0.5 < this.p1.y + this.p1.h * 0.5 - 6;

            if (p1Higher) {
                this.scoreP1++;
                this.hitMsg = 'P1 JOUST!';
                this.burst(this.p2.x + this.p2.w / 2, this.p2.y + this.p2.h / 2,
                    GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
                AudioManager.correct();
                this.spawnPlayers();
                this.hitTimer = 0.6;
            } else if (p2Higher) {
                this.scoreP2++;
                this.hitMsg = GameManager.isSinglePlayer ? 'CPU JOUST!' : 'P2 JOUST!';
                this.burst(this.p1.x + this.p1.w / 2, this.p1.y + this.p1.h / 2, Theme.p1);
                AudioManager.correct();
                this.spawnPlayers();
                this.hitTimer = 0.6;
            } else {
                this.p1.vx *= -1.2;
                this.p2.vx *= -1.2;
                this.p1.vy = -120;
                this.p2.vy = -120;
                AudioManager.tick();
            }
        }

        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    checkCollision(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    burst(x, y, color) {
        for (let i = 0; i < 16; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 320,
                vy: (Math.random() - 0.5) * 320,
                life: 0.45,
                color
            });
        }
    }

    drawRider(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(p.x + p.w / 2 - 2, p.y - 10, 4, 12);
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x + p.w / 2, p.y + p.h + 14);
    }

    render(ctx) {
        ctx.fillStyle = '#120818';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = 'rgba(255,42,84,0.25)';
        ctx.fillRect(0, this.height - 50, this.width, 50);

        this.platforms.forEach(pl => {
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(pl.x, pl.y, pl.w, 4);
        });

        this.particles.forEach(p => {
            ctx.globalAlpha = p.life / 0.45;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 5, 5);
        });
        ctx.globalAlpha = 1;

        this.drawRider(ctx, this.p1, Theme.p1, 'P1');
        this.drawRider(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Jousts: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 32);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Higher rider wins the clash — equal height bounces!', this.width / 2, 54);

        if (this.hitTimer > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 30px Impact';
            ctx.fillText(this.hitMsg, this.width / 2, 90);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('W/SPACE flap · A/D move  |  ↑/ENTER flap · ←/→ move', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new SkyJoust());
