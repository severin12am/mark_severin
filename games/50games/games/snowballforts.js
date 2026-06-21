class SnowballForts extends GameBase {
    constructor() {
        super("Snowball Forts", "Build ice walls and lob snowballs! First to 5 hits.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.walls = [];
        this.snowballs = [];
        this.hitFlash = 0;
        this.p1 = { x: 140, y: h / 2, dir: 1 };
        this.p2 = { x: w - 140, y: h / 2, dir: -1 };
        this.cpuThrow = 0;
        this.cpuBuild = 0;
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    buildWall(p, dir) {
        this.walls.push({
            x: p.x + dir * 40 - 45,
            y: p.y + 20,
            w: 90,
            h: 22
        });
        if (this.walls.length > 10) this.walls.shift();
        AudioManager.move();
    }

    throwBall(p, owner) {
        this.snowballs.push({
            x: p.x + p.dir * 20,
            y: p.y - 10,
            vx: p.dir * (380 + Math.random() * 60),
            vy: -120 - Math.random() * 80,
            owner
        });
        AudioManager.select();
    }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt;

        const move = 200 * dt;
        if (Input.isDown('KeyA')) this.p1.x -= move;
        if (Input.isDown('KeyD')) this.p1.x += move;
        this.p1.x = Math.max(60, Math.min(this.width / 2 - 40, this.p1.x));
        if (this.justPressed('KeyS')) this.buildWall(this.p1, this.p1.dir);
        if (this.justPressed('Space')) this.throwBall(this.p1, 0);

        if (GameManager.isSinglePlayer) {
            this.p2.x += Math.sin(Date.now() * 0.003) * move * 0.6;
            this.p2.x = Math.max(this.width / 2 + 40, Math.min(this.width - 60, this.p2.x));
            this.cpuThrow -= dt;
            this.cpuBuild -= dt;
            if (this.cpuThrow <= 0 && Math.abs(this.p2.x - this.p1.x) < 420) {
                this.throwBall(this.p2, 1);
                this.cpuThrow = 0.7 + Math.random() * 0.5;
            }
            if (this.cpuBuild <= 0) {
                this.buildWall(this.p2, this.p2.dir);
                this.cpuBuild = 1.5 + Math.random();
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= move;
            if (Input.isDown('ArrowRight')) this.p2.x += move;
            this.p2.x = Math.max(this.width / 2 + 40, Math.min(this.width - 60, this.p2.x));
            if (this.justPressed('ArrowDown')) this.buildWall(this.p2, this.p2.dir);
            if (this.justPressed('Enter')) this.throwBall(this.p2, 1);
        }

        for (let i = this.snowballs.length - 1; i >= 0; i--) {
            const s = this.snowballs[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 320 * dt;

            let blocked = false;
            for (const w of this.walls) {
                if (s.x > w.x && s.x < w.x + w.w && s.y > w.y && s.y < w.y + w.h) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) {
                this.snowballs.splice(i, 1);
                AudioManager.tick();
                continue;
            }

            const targets = [
                { p: this.p1, idx: 0 },
                { p: this.p2, idx: 1 }
            ];
            for (const t of targets) {
                if (s.owner === t.idx) continue;
                if (Math.hypot(s.x - t.p.x, s.y - t.p.y) < 36) {
                    if (t.idx === 0) this.scoreP2++;
                    else this.scoreP1++;
                    this.snowballs.splice(i, 1);
                    this.hitFlash = 0.35;
                    AudioManager.correct();
                    if (this.scoreP1 >= 5) GameManager.gameOver(1);
                    if (this.scoreP2 >= 5) GameManager.gameOver(2);
                    break;
                }
            }

            if (s.y > this.height + 40 || s.x < -40 || s.x > this.width + 40) {
                this.snowballs.splice(i, 1);
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#c8e8f8';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hits: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 32);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 50);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();

        this.walls.forEach(w => {
            ctx.fillStyle = '#a0f0ff';
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 3;
            ctx.strokeRect(w.x, w.y, w.w, w.h);
        });

        ctx.fillStyle = '#fff';
        this.snowballs.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
            ctx.fill();
        });

        const drawPlayer = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.fillRect(p.x - 24, p.y - 36, 48, 60);
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(p.x - 16, p.y - 50, 32, 18);
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + 36);
        };

        drawPlayer(this.p1, Theme.p1, 'P1');
        drawPlayer(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.hitFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.hitFlash * 0.4})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('A/D move · S build wall · SPACE throw  |  ←/→ · ↓ build · ENTER throw', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new SnowballForts());
