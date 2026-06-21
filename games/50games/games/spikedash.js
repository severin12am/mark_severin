class SpikeDash extends GameBase {
    constructor() {
        super("Spike Dash", "Fly through spike gaps — crash and you lose the round! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    startRound() {
        this.time = 0;
        this.speed = 260;
        this.p1 = { x: this.width * 0.32, y: this.height / 2, vy: 0, dead: false };
        this.p2 = { x: this.width * 0.68, y: this.height / 2, vy: 0, dead: false };
        this.obstacles = [];
        this.spawnX = 0;
        this.gravity = 520;
        this.flap = -320;
    }

    spawnObstacle() {
        const gapH = 130 + Math.random() * 50;
        const gapY = 90 + Math.random() * (this.height - gapH - 180);
        this.obstacles.push({ x: this.width + 40, gapY, gapH, w: 50 });
    }

    updatePlayer(p, flapKey, isCpu, dt) {
        if (p.dead) return;
        p.vy += this.gravity * dt;

        if (isCpu) {
            const ahead = this.obstacles.find(o => o.x > p.x - 30 && o.x < p.x + 220);
            if (ahead) {
                const gapCenter = ahead.gapY + ahead.gapH / 2;
                if (p.y > gapCenter + 10) p.vy = this.flap * 0.95;
                else if (p.y < gapCenter - 30) p.vy += this.gravity * dt * 0.5;
            } else if (p.y > this.height / 2) {
                p.vy = this.flap * 0.9;
            }
        } else if (Input.isDown(flapKey)) {
            p.vy = this.flap;
            AudioManager.move();
        }

        p.y += p.vy * dt;
        p.y = Math.max(40, Math.min(this.height - 40, p.y));

        for (const o of this.obstacles) {
            if (o.x + o.w < p.x - 22 || o.x > p.x + 22) continue;
            if (p.y - 20 < o.gapY || p.y + 20 > o.gapY + o.gapH) {
                p.dead = true;
            }
        }
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        this.time += dt;
        this.speed = 260 + this.time * 90;

        this.spawnX -= this.speed * dt;
        if (this.spawnX <= -280) {
            this.spawnObstacle();
            this.spawnX = 0;
        }

        this.obstacles.forEach(o => { o.x -= this.speed * dt; });
        this.obstacles = this.obstacles.filter(o => o.x > -80);

        this.updatePlayer(this.p1, 'KeyW', false, dt);
        this.updatePlayer(this.p2, 'ArrowUp', GameManager.isSinglePlayer, dt);

        if (this.p1.dead || this.p2.dead) {
            if (this.p1.dead && !this.p2.dead) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU SURVIVES!' : 'P2 WINS ROUND!';
                AudioManager.wrong();
            } else if (this.p2.dead && !this.p1.dead) {
                this.scoreP1++;
                this.roundMsg = 'P1 WINS ROUND!';
                AudioManager.correct();
            } else {
                this.roundMsg = 'BOTH CRASHED — no point';
                AudioManager.tick();
            }

            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else {
                this.msgTimer = 1.0;
                this.startRound();
            }
        }
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
        ctx.fillText(`speed ${Math.floor(this.speed)}`, this.width / 2, 50);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 60);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();

        ctx.fillStyle = '#933';
        this.obstacles.forEach(o => {
            ctx.fillRect(o.x, 60, o.w, o.gapY - 60);
            ctx.fillRect(o.x, o.gapY + o.gapH, o.w, this.height - o.gapY - o.gapH);
        });

        const drawP = (p, color, label) => {
            if (p.dead) return;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 9px Arial';
            ctx.fillText(label, p.x, p.y + 32);
        };

        drawP(this.p1, Theme.p1, 'P1');
        drawP(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('W/↑ flap · dodge spikes in your lane', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new SpikeDash());
