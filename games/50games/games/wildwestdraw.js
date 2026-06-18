class WildWestDraw extends GameBase {
    constructor() {
        super("Wild West Draw", "Wait for DRAW!, then shoot! First to 3 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.startRound();
    }

    startRound() {
        this.state = "waiting";
        this.timer = 0;
        this.drawTime = 0;
        this.p1Shot = false;
        this.p2Shot = false;
        this.p1ShotTime = 0;
        this.p2ShotTime = 0;
        this.p1FalseStart = false;
        this.p2FalseStart = false;
        this.roundWinner = 0;
        this.resultTimer = 0;
        this.cpuReactDelay = 0.08 + Math.random() * 0.45;
        this.cpuFalseStartChance = Math.random() < 0.08;
    }

    endRound(winner) {
        this.state = "result";
        this.roundWinner = winner;
        this.resultTimer = 0;
        if (winner === 1) this.scoreP1++;
        else if (winner === 2) this.scoreP2++;
        if (winner === 1 || winner === 2) AudioManager.correct();
        else AudioManager.wrong();
    }

    update(dt) {
        this.timer += dt;

        if (this.state === "result") {
            this.resultTimer += dt;
            if (this.resultTimer > 1.4) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        if (this.state === "waiting" && this.timer > 1.5) {
            this.state = "ready";
            this.drawTime = this.timer + 1.2 + Math.random() * 2.2;
        }

        if (this.state === "ready") {
            // CPU occasional false start
            if (GameManager.isSinglePlayer && this.cpuFalseStartChance && this.timer > this.drawTime - 0.5 && !this.p2Shot) {
                this.p2Shot = true;
                this.p2FalseStart = true;
                this.endRound(1);
                return;
            }

            if (!this.p1Shot && Input.isDown('Space')) {
                this.p1Shot = true;
                this.p1FalseStart = true;
                this.endRound(2);
                return;
            }
            if (!this.p2Shot && !GameManager.isSinglePlayer && Input.isDown('Enter')) {
                this.p2Shot = true;
                this.p2FalseStart = true;
                this.endRound(1);
                return;
            }

            if (this.timer >= this.drawTime) {
                this.state = "draw";
                AudioManager.tick();
            }
        }

        if (this.state === "draw") {
            const drawElapsed = this.timer - this.drawTime;

            if (!this.p1Shot && Input.isDown('Space')) {
                this.p1Shot = true;
                this.p1ShotTime = drawElapsed;
                AudioManager.select();
            }

            if (!this.p2Shot) {
                if (GameManager.isSinglePlayer) {
                    if (drawElapsed >= this.cpuReactDelay) {
                        this.p2Shot = true;
                        this.p2ShotTime = this.cpuReactDelay;
                    }
                } else if (Input.isDown('Enter')) {
                    this.p2Shot = true;
                    this.p2ShotTime = drawElapsed;
                    AudioManager.select();
                }
            }

            if (this.p1Shot && this.p2Shot) {
                if (Math.abs(this.p1ShotTime - this.p2ShotTime) < 0.05) {
                    this.endRound(0);
                } else {
                    this.endRound(this.p1ShotTime < this.p2ShotTime ? 1 : 2);
                }
            } else if (this.p1Shot) {
                this.endRound(1);
            } else if (this.p2Shot) {
                this.endRound(2);
            } else if (drawElapsed > 2.5) {
                this.endRound(0);
            }
        }
    }

    render(ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#2a1f3d');
        grad.addColorStop(0.6, '#4a3020');
        grad.addColorStop(1, '#6b4423');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#8b6914';
        ctx.fillRect(0, 420, this.width, 180);

        ctx.fillStyle = '#e8d5a3';
        ctx.fillRect(270, 80, 260, 200);
        ctx.strokeStyle = '#3a2a1f';
        ctx.lineWidth = 6;
        ctx.strokeRect(270, 80, 260, 200);

        ctx.fillStyle = '#3a2a1f';
        ctx.font = "bold 22px Impact, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("WANTED", 400, 115);
        ctx.font = "bold 18px Arial";
        ctx.fillText("FASTEST GUN", 400, 145);
        ctx.fillText("IN THE WEST", 400, 168);

        ctx.font = "bold 48px Impact, sans-serif";
        if (this.state === "waiting") {
            ctx.fillStyle = Theme.fg;
            ctx.fillText("STEADY...", 400, 320);
            ctx.font = "20px Arial";
            ctx.fillStyle = '#aaa';
            ctx.fillText("Don't shoot early!", 400, 360);
        } else if (this.state === "ready") {
            const pulse = 0.7 + Math.sin(this.timer * 12) * 0.3;
            ctx.fillStyle = `rgba(255, 230, 0, ${pulse})`;
            ctx.fillText("WAIT...", 400, 320);
        } else if (this.state === "draw") {
            ctx.fillStyle = '#ff4444';
            ctx.fillText("DRAW!", 400, 320);
        } else if (this.state === "result") {
            ctx.fillStyle = Theme.accent;
            if (this.p1FalseStart) ctx.fillText("P1 FALSE START!", 400, 310);
            else if (this.p2FalseStart) ctx.fillText((GameManager.isSinglePlayer ? "CPU" : "P2") + " FALSE START!", 400, 310);
            else if (this.roundWinner === 1) ctx.fillText("P1 WINS ROUND!", 400, 310);
            else if (this.roundWinner === 2) ctx.fillText((GameManager.isSinglePlayer ? "CPU" : "P2") + " WINS ROUND!", 400, 310);
            else ctx.fillText("TIE!", 400, 310);
        }

        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        this.drawCowboy(ctx, 120, 380, Theme.p1, this.p1Shot, this.p1FalseStart);
        this.drawCowboy(ctx, 600, 380, p2Color, this.p2Shot, this.p2FalseStart);

        if (this.p1Shot && this.state !== "waiting") {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 36px Impact";
            ctx.fillText("BANG!", 120, 340);
        }
        if (this.p2Shot && this.state !== "waiting") {
            ctx.fillStyle = Theme.accent;
            ctx.fillText("BANG!", 600, 340);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "16px Arial";
        ctx.fillText("P1: SPACE", 120, 560);
        ctx.fillText(GameManager.isSinglePlayer ? "CPU opponent" : "P2: ENTER", 600, 560);
    }

    drawCowboy(ctx, x, y, color, shot, falseStart) {
        ctx.fillStyle = color;
        ctx.fillRect(x - 30, y, 60, 90);
        ctx.fillStyle = '#ffcc99';
        ctx.beginPath();
        ctx.arc(x, y - 10, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a2a1f';
        ctx.fillRect(x - 35, y - 35, 70, 12);
        ctx.fillRect(x - 22, y - 50, 44, 18);
        if (shot) {
            ctx.fillStyle = '#555';
            ctx.fillRect(x + (x < 400 ? 25 : -45), y + 30, 30, 8);
        }
        if (falseStart) {
            ctx.fillStyle = '#ff0000';
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("TOO EARLY!", x, y + 120);
        }
    }
}

GameManager.registerGame(new WildWestDraw());
