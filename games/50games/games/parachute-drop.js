class ParachuteDrop extends GameBase {
    constructor() {
        super("Parachute Drop", "Open chute late for max points! First to 2 round wins.");
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
        this.groundY = this.height - 70;
        this.p1 = { x: this.width * 0.3, y: 60, vy: 0, chuteOpen: false, landed: false, openAlt: 0, landScore: 0 };
        this.p2 = { x: this.width * 0.7, y: 60, vy: 0, chuteOpen: false, landed: false, openAlt: 0, landScore: 0 };
        this.state = 'falling';
        this.resultTimer = 0;
        this.roundResult = '';
        this.cpuOpenAlt = 90 + Math.random() * 80;
    }

    openChute(p) {
        if (p.chuteOpen) return;
        p.chuteOpen = true;
        p.openAlt = this.groundY - p.y;
        AudioManager.select();
    }

    landPlayer(p) {
        p.landed = true;
        p.y = this.groundY - 20;
        p.vy = 0;
        if (!p.chuteOpen) {
            p.landScore = 0;
        } else {
            // Sweet spot: open between 60-140px above ground
            const alt = p.openAlt;
            if (alt < 40) p.landScore = Math.max(10, 60 - (40 - alt));
            else if (alt <= 140) p.landScore = 100 - Math.abs(alt - 90) * 0.6;
            else p.landScore = Math.max(0, 80 - (alt - 140) * 0.5);
        }
        p.landScore = Math.round(p.landScore);
    }

    update(dt) {
        if (this.state === 'result') {
            this.resultTimer += dt;
            if (this.resultTimer > 2) {
                if (this.scoreP1 >= 2 || this.scoreP2 >= 2) {
                    GameManager.gameOver(this.scoreP1 >= 2 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        const grav = 420;
        const drag = 0.12;

        const step = (p, openKey) => {
            if (p.landed) return;
            if (!p.chuteOpen && this.justPressed(openKey)) this.openChute(p);
            p.vy += grav * (p.chuteOpen ? drag : 1) * dt;
            p.y += p.vy * dt;
            if (p.y >= this.groundY - 20) this.landPlayer(p);
        };

        step(this.p1, 'Space');

        if (GameManager.isSinglePlayer) {
            if (!this.p2.chuteOpen && (this.groundY - this.p2.y) <= this.cpuOpenAlt) {
                this.openChute(this.p2);
            }
        } else if (!this.p2.chuteOpen && this.justPressed('Enter')) {
            this.openChute(this.p2);
        }
        if (!this.p2.landed) {
            this.p2.vy += grav * (this.p2.chuteOpen ? drag : 1) * dt;
            this.p2.y += this.p2.vy * dt;
            if (this.p2.y >= this.groundY - 20) this.landPlayer(this.p2);
        }

        if (this.p1.landed && this.p2.landed) {
            this.state = 'result';
            this.resultTimer = 0;
            if (this.p1.landScore > this.p2.landScore) {
                this.scoreP1++;
                this.roundResult = 'P1 WINS ROUND';
                AudioManager.correct();
            } else if (this.p2.landScore > this.p1.landScore) {
                this.scoreP2++;
                this.roundResult = GameManager.isSinglePlayer ? 'CPU WINS ROUND' : 'P2 WINS ROUND';
                AudioManager.correct();
            } else {
                this.roundResult = 'TIE ROUND';
                AudioManager.wrong();
            }
        }
    }

    render(ctx) {
        const sky = ctx.createLinearGradient(0, 0, 0, this.height);
        sky.addColorStop(0, '#1a3a5c');
        sky.addColorStop(0.7, '#87ceeb');
        sky.addColorStop(1, '#c2a36b');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#5a8f3c';
        ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

        this.drawSkydiver(ctx, this.p1, Theme.p1);
        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        this.drawSkydiver(ctx, this.p2, p2Color);

        // Altitude markers
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (let y = 100; y < this.groundY; y += 80) {
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(this.width - 40, y);
            ctx.stroke();
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 2)`, this.width / 2, 30);

        if (this.state === 'falling') {
            ctx.fillText("SPACE / ENTER — open parachute!", this.width / 2, 55);
            if (this.p1.chuteOpen) {
                ctx.fillStyle = Theme.p1;
                ctx.fillText(`P1 opened at ${Math.round(this.p1.openAlt)}px`, 200, this.height - 20);
            }
            if (this.p2.chuteOpen) {
                ctx.fillStyle = p2Color;
                ctx.fillText(`${GameManager.isSinglePlayer ? 'CPU' : 'P2'} opened at ${Math.round(this.p2.openAlt)}px`, 600, this.height - 20);
            }
        }

        if (this.state === 'result') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 36px Impact";
            ctx.fillText(this.roundResult, this.width / 2, this.height / 2 - 20);
            ctx.font = "24px Arial";
            ctx.fillStyle = Theme.fg;
            ctx.fillText(`P1: ${this.p1.landScore} pts  |  ${GameManager.isSinglePlayer ? 'CPU' : 'P2'}: ${this.p2.landScore} pts`, this.width / 2, this.height / 2 + 25);
            if (!this.p1.chuteOpen) ctx.fillText("P1 CRASHED!", 200, this.height / 2 + 60);
            if (!this.p2.chuteOpen) ctx.fillText(`${GameManager.isSinglePlayer ? 'CPU' : 'P2'} CRASHED!`, 600, this.height / 2 + 60);
        }
    }

    drawSkydiver(ctx, p, color) {
        ctx.fillStyle = color;
        ctx.fillRect(p.x - 12, p.y - 18, 24, 36);
        if (p.chuteOpen) {
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - 45, 35, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x - 20, p.y - 35);
            ctx.lineTo(p.x, p.y - 18);
            ctx.lineTo(p.x + 20, p.y - 35);
            ctx.stroke();
        }
        if (p.landed && p.landScore === 0) {
            ctx.fillStyle = '#ff4444';
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("SPLAT", p.x, p.y + 40);
        }
    }
}

GameManager.registerGame(new ParachuteDrop());
