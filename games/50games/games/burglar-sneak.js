class BurglarSneak extends GameBase {
    constructor() {
        super("Burglar Sneak", "Sneak only when the light is off. Reach the safe first! First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.laneTop = 90;
        this.laneBot = this.height - 50;
        this.goalY = this.laneTop + 30;
        this.startY = this.laneBot - 20;
        this.p1 = { x: this.width * 0.32, y: this.startY, progress: 0, caught: false, freeze: 0 };
        this.p2 = { x: this.width * 0.68, y: this.startY, progress: 0, caught: false, freeze: 0 };
        this.goalProgress = 1;
        this.lightOn = false;
        this.lightTimer = 1.2 + Math.random() * 0.8;
        this.lightPhase = 'off';
        this.phaseT = 1.4 + Math.random() * 1.2;
        this.sweep = 0;
        this.roundMsg = '';
        this.roundPause = 0;
        this.cpuWait = 0;
        this.warnFlash = 0;
    }

    endRound(winner) {
        if (winner === 1) {
            this.scoreP1++;
            this.roundMsg = 'P1 LOOTS THE SAFE!';
            AudioManager.correct();
        } else if (winner === 2) {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU LOOTS THE SAFE!' : 'P2 LOOTS THE SAFE!';
            AudioManager.correct();
        } else {
            this.roundMsg = 'BOTH CAUGHT!';
            AudioManager.wrong();
        }
        this.roundPause = 1.25;
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        // Light cycle: off -> warn -> on -> off
        this.phaseT -= dt;
        this.sweep += dt;
        if (this.phaseT <= 0) {
            if (this.lightPhase === 'off') {
                this.lightPhase = 'warn';
                this.phaseT = 0.55;
                this.warnFlash = 0.55;
                AudioManager.tick();
            } else if (this.lightPhase === 'warn') {
                this.lightPhase = 'on';
                this.phaseT = 0.7 + Math.random() * 0.6;
                this.lightOn = true;
            } else {
                this.lightPhase = 'off';
                this.phaseT = 1.1 + Math.random() * 1.4;
                this.lightOn = false;
            }
        }
        this.lightOn = this.lightPhase === 'on';
        if (this.warnFlash > 0) this.warnFlash -= dt;

        const sneakSp = 0.38; // progress per second while holding up
        const maxProg = this.goalProgress;

        const tryMove = (p, key, isCpu) => {
            if (p.caught) return;
            if (p.freeze > 0) {
                p.freeze -= dt;
                return;
            }

            let moving = false;
            if (isCpu) {
                // CPU waits during warn/on, sneaks during off with lag
                if (this.lightPhase === 'off') {
                    this.cpuWait = Math.max(0, this.cpuWait - dt);
                    if (this.cpuWait <= 0) {
                        // Sometimes hesitates or moves late
                        moving = Math.random() > 0.08;
                    }
                } else if (this.lightPhase === 'warn') {
                    // Sometimes still moving (mistake)
                    moving = Math.random() < 0.12;
                    this.cpuWait = 0.15 + Math.random() * 0.35;
                } else {
                    moving = Math.random() < 0.05;
                    this.cpuWait = 0.2 + Math.random() * 0.3;
                }
            } else {
                moving = Input.isDown(key);
            }

            if (moving) {
                if (this.lightOn) {
                    // Caught moving in the light
                    p.caught = true;
                    p.freeze = 99;
                    AudioManager.wrong();
                } else {
                    p.progress = Math.min(maxProg, p.progress + sneakSp * dt);
                }
            }

            p.y = this.startY + (this.goalY - this.startY) * (p.progress / maxProg);
        };

        tryMove(this.p1, 'KeyW', false);
        if (GameManager.isSinglePlayer) {
            tryMove(this.p2, 'ArrowUp', true);
        } else {
            tryMove(this.p2, 'ArrowUp', false);
        }

        // Win by reaching safe
        if (this.p1.progress >= maxProg && !this.p1.caught) {
            this.endRound(1);
            return;
        }
        if (this.p2.progress >= maxProg && !this.p2.caught) {
            this.endRound(2);
            return;
        }
        if (this.p1.caught && this.p2.caught) {
            this.endRound(0);
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Room
        const roomX = 60;
        const roomW = this.width - 120;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(roomX, this.laneTop, roomW, this.laneBot - this.laneTop);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.strokeRect(roomX, this.laneTop, roomW, this.laneBot - this.laneTop);

        // Floor path lines
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.startY);
        ctx.lineTo(this.p1.x, this.goalY);
        ctx.moveTo(this.p2.x, this.startY);
        ctx.lineTo(this.p2.x, this.goalY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Safe
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.width / 2 - 28, this.goalY - 36, 56, 44);
        ctx.fillStyle = Theme.bg;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.goalY - 14, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SAFE', this.width / 2, this.goalY + 22);

        // Guard light cone
        const guardX = this.width / 2;
        const guardY = this.laneTop - 10;
        if (this.lightOn || this.lightPhase === 'warn') {
            const alpha = this.lightOn ? 0.22 : 0.1 + Math.sin(this.sweep * 20) * 0.05;
            ctx.fillStyle = `rgba(255,230,0,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(guardX, guardY);
            ctx.lineTo(roomX + 20, this.laneBot);
            ctx.lineTo(roomX + roomW - 20, this.laneBot);
            ctx.closePath();
            ctx.fill();
        }

        // Guard head
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(guardX, guardY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.lightOn ? Theme.accent : Theme.fg;
        ctx.globalAlpha = this.lightOn ? 1 : 0.35;
        ctx.beginPath();
        ctx.arc(guardX, guardY + 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const drawBurglar = (p, color, label) => {
            ctx.globalAlpha = p.caught ? 0.35 : 1;
            ctx.fillStyle = color;
            ctx.fillRect(p.x - 14, p.y - 24, 28, 36);
            // Cap
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(p.x - 14, p.y - 28, 28, 6);
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + 26);
            if (p.caught) {
                ctx.fillStyle = Theme.accent;
                ctx.font = 'bold 12px Arial';
                ctx.fillText('CAUGHT', p.x, p.y - 36);
            }
            ctx.globalAlpha = 1;
            // Progress pip
            ctx.fillStyle = color;
            ctx.fillRect(p.x - 20, this.laneBot + 8, 40 * p.progress, 4);
            ctx.strokeStyle = Theme.fg;
            ctx.strokeRect(p.x - 20, this.laneBot + 8, 40, 4);
        };

        drawBurglar(this.p1, Theme.p1, 'P1');
        drawBurglar(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Safes: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 28);

        if (this.lightOn) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 26px Impact';
            ctx.fillText('FREEZE!', this.width / 2, 56);
        } else if (this.lightPhase === 'warn') {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText('LIGHT COMING…', this.width / 2, 56);
        } else {
            ctx.fillStyle = Theme.accent;
            ctx.font = '13px Arial';
            ctx.fillText('W / ↑ sneak while dark · freeze when lit', this.width / 2, 52);
        }

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 32px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new BurglarSneak());
