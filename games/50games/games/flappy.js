class GameFlappyDuel extends GameBase {
    constructor() {
        super("Flappy Duel", "Flap through pipes! First to 3 round wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.startRound();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startRound() {
        this.p1 = { y: h / 2, vy: 0, dead: false, x: this.width * 0.28 };
        this.p2 = { y: h / 2, vy: 0, dead: false, x: this.width * 0.72 };
        this.pipes = [];
        this.pipeTimer = 0;
        this.pipeGap = 145;
        this.scroll = 180;
        this.roundMsg = '';
        this.roundPause = 0;
    }

    spawnPipe() {
        const gapY = 120 + Math.random() * (this.height - 240);
        this.pipes.push({ x: this.width + 40, gapY, scored: false });
    }

    hitPipe(bird, pipe, laneX) {
        if (Math.abs(pipe.x - laneX) > 55) return false;
        return bird.y - 14 < pipe.gapY - this.pipeGap / 2 || bird.y + 14 > pipe.gapY + this.pipeGap / 2;
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        const gravity = 920;
        const flap = -320;

        if (!this.p1.dead) {
            this.p1.vy += gravity * dt;
            if (this.justPressed('KeyW') || this.justPressed('Space')) {
                this.p1.vy = flap;
                AudioManager.move();
            }
            this.p1.y += this.p1.vy * dt;
            if (this.p1.y < 30 || this.p1.y > this.height - 30) this.p1.dead = true;
        }

        if (!this.p2.dead) {
            this.p2.vy += gravity * dt;
            if (GameManager.isSinglePlayer) {
                const next = this.pipes.find(p => p.x > this.p2.x - 20 && p.x < this.p2.x + 120);
                if (next) {
                    const target = next.gapY;
                    if (this.p2.y > target + 10) this.p2.vy = flap * 0.95;
                    else if (this.p2.y < target - 40) this.p2.vy += gravity * dt * 0.5;
                } else if (this.p2.vy > 0) {
                    this.p2.vy = flap * 0.9;
                }
            } else if (this.justPressed('ArrowUp') || this.justPressed('Enter')) {
                this.p2.vy = flap;
                AudioManager.move();
            }
            this.p2.y += this.p2.vy * dt;
            if (this.p2.y < 30 || this.p2.y > this.height - 30) this.p2.dead = true;
        }

        this.pipeTimer -= dt;
        if (this.pipeTimer <= 0) {
            this.spawnPipe();
            this.pipeTimer = 1.6;
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.scroll * dt;
            if (!this.p1.dead && this.hitPipe(this.p1, p, this.p1.x)) this.p1.dead = true;
            if (!this.p2.dead && this.hitPipe(this.p2, p, this.p2.x)) this.p2.dead = true;
            if (p.x < -60) this.pipes.splice(i, 1);
        }

        if (this.p1.dead || this.p2.dead) {
            if (this.p1.dead && !this.p2.dead) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 WINS ROUND!';
            } else if (this.p2.dead && !this.p1.dead) {
                this.scoreP1++;
                this.roundMsg = 'P1 WINS ROUND!';
            } else {
                this.roundMsg = 'BOTH CRASHED!';
            }
            AudioManager.wrong();
            this.roundPause = 1.2;
        }
    }

    drawBird(ctx, b, color, label, dead) {
        if (dead) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(b.x + 4, b.y - 4, 8, 8);
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, b.x, b.y + 28);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 70);
        ctx.lineTo(this.width / 2, this.height - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        this.pipes.forEach(p => {
            ctx.fillStyle = Theme.p2;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(p.x - 28, 70, 56, p.gapY - this.pipeGap / 2 - 70);
            ctx.fillRect(p.x - 28, p.gapY + this.pipeGap / 2, 56, this.height);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 3;
            ctx.strokeRect(p.x - 28, 70, 56, p.gapY - this.pipeGap / 2 - 70);
            ctx.strokeRect(p.x - 28, p.gapY + this.pipeGap / 2, 56, this.height);
        });

        this.drawBird(ctx, this.p1, Theme.p1, 'P1', this.p1.dead);
        this.drawBird(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2', this.p2.dead);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 36);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('W/SPACE flap · ↑/ENTER flap', this.width / 2, 58);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 32px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new GameFlappyDuel());
