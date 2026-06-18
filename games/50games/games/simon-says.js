class SimonSays extends GameBase {
    constructor() {
        super("Simon Says", "Race to repeat the sequence! First to 5 levels wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.sequence = [];
        this.directions = ['up', 'right', 'down', 'left'];
        this.dirMap = {
            up:    { keyP1: 'KeyW',    keyP2: 'ArrowUp',    color: '#00ccff', label: 'W / ↑' },
            right: { keyP1: 'KeyD',    keyP2: 'ArrowRight', color: '#ff3366', label: 'D / →' },
            down:  { keyP1: 'KeyS',    keyP2: 'ArrowDown',  color: '#ffcc00', label: 'S / ↓' },
            left:  { keyP1: 'KeyA',    keyP2: 'ArrowLeft',  color: '#33ff99', label: 'A / ←' }
        };
        this.startLevel();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startLevel() {
        this.sequence.push(this.directions[Math.floor(Math.random() * 4)]);
        this.p1Input = [];
        this.p2Input = [];
        this.p1Done = false;
        this.p2Done = false;
        this.p1Failed = false;
        this.p2Failed = false;
        this.state = 'showing';
        this.showIndex = 0;
        this.showTimer = 0;
        this.flashDuration = 0.45;
        this.pauseBetween = 0.15;
        this.cpuStepTimer = 0;
        this.lastFlash = null;
    }

    checkInput(playerInput, dir) {
        playerInput.push(dir);
        const idx = playerInput.length - 1;
        if (playerInput[idx] !== this.sequence[idx]) return 'fail';
        if (playerInput.length === this.sequence.length) return 'done';
        return 'ok';
    }

    update(dt) {
        if (this.state === 'showing') {
            this.showTimer += dt;
            const stepTime = this.flashDuration + this.pauseBetween;
            if (this.showTimer >= stepTime) {
                this.showTimer = 0;
                this.showIndex++;
                if (this.showIndex >= this.sequence.length) {
                    this.state = 'playing';
                    this.cpuStepTimer = 0.4 + Math.random() * 0.3;
                }
            }
            return;
        }

        if (this.state === 'playing') {
            // P1 input
            if (!this.p1Done && !this.p1Failed) {
                for (const dir of this.directions) {
                    if (this.justPressed(this.dirMap[dir].keyP1)) {
                        const result = this.checkInput(this.p1Input, dir);
                        this.lastFlash = { dir, player: 1, timer: 0.2 };
                        AudioManager.select();
                        if (result === 'fail') { this.p1Failed = true; AudioManager.wrong(); }
                        else if (result === 'done') { this.p1Done = true; AudioManager.correct(); }
                        break;
                    }
                }
            }

            // P2 input
            if (!this.p2Done && !this.p2Failed) {
                if (GameManager.isSinglePlayer) {
                    this.cpuStepTimer -= dt;
                    if (this.cpuStepTimer <= 0 && this.p2Input.length < this.sequence.length) {
                        const idx = this.p2Input.length;
                        let dir = this.sequence[idx];
                        if (Math.random() < 0.12) {
                            dir = this.directions[Math.floor(Math.random() * 4)];
                        }
                        const result = this.checkInput(this.p2Input, dir);
                        this.lastFlash = { dir, player: 2, timer: 0.2 };
                        if (result === 'fail') { this.p2Failed = true; }
                        else if (result === 'done') { this.p2Done = true; }
                        this.cpuStepTimer = 0.25 + Math.random() * 0.35;
                    }
                } else {
                    for (const dir of this.directions) {
                        if (this.justPressed(this.dirMap[dir].keyP2)) {
                            const result = this.checkInput(this.p2Input, dir);
                            this.lastFlash = { dir, player: 2, timer: 0.2 };
                            AudioManager.select();
                            if (result === 'fail') { this.p2Failed = true; AudioManager.wrong(); }
                            else if (result === 'done') { this.p2Done = true; AudioManager.correct(); }
                            break;
                        }
                    }
                }
            }

            if (this.lastFlash) {
                this.lastFlash.timer -= dt;
                if (this.lastFlash.timer <= 0) this.lastFlash = null;
            }

            const p1Alive = !this.p1Failed;
            const p2Alive = !this.p2Failed;
            const p1Win = this.p1Done && p2Alive;
            const p2Win = this.p2Done && p1Alive;

            if (this.p1Failed && this.p2Failed) {
                this.state = 'roundEnd';
                this.roundWinner = 0;
            } else if (this.p1Failed && this.p2Done) {
                this.state = 'roundEnd';
                this.roundWinner = 2;
            } else if (this.p2Failed && this.p1Done) {
                this.state = 'roundEnd';
                this.roundWinner = 1;
            } else if (p1Win && !this.p2Done) {
                this.state = 'roundEnd';
                this.roundWinner = 1;
            } else if (p2Win && !this.p1Done) {
                this.state = 'roundEnd';
                this.roundWinner = 2;
            } else if (this.p1Done && this.p2Done) {
                this.state = 'roundEnd';
                this.roundWinner = 0;
            }

            if (this.state === 'roundEnd') {
                if (this.roundWinner === 1) this.scoreP1++;
                else if (this.roundWinner === 2) this.scoreP2++;
                this.resultTimer = 0;
                this.state = 'result';
            }
        }

        if (this.state === 'result') {
            this.resultTimer += dt;
            if (this.resultTimer > 1.4) {
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.startLevel();
                    this.state = 'showing';
                }
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        const radius = 72;
        const pads = [
            { dir: 'up',    x: cx,              y: cy - radius * 1.55 },
            { dir: 'right', x: cx + radius * 1.55, y: cy },
            { dir: 'down',  x: cx,              y: cy + radius * 1.55 },
            { dir: 'left',  x: cx - radius * 1.55, y: cy }
        ];

        pads.forEach(p => {
            const info = this.dirMap[p.dir];
            let alpha = 0.2;

            if (this.state === 'showing' && this.showIndex < this.sequence.length) {
                if (this.sequence[this.showIndex] === p.dir && this.showTimer < this.flashDuration) {
                    alpha = 1;
                }
            }
            if (this.lastFlash && this.lastFlash.dir === p.dir) {
                alpha = 0.9;
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.fillText(info.label, p.x, p.y + 5);
        });

        // Center hub
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 26px Impact";
        ctx.textAlign = "center";
        ctx.fillText(`LEVEL ${this.sequence ? this.sequence.length : 0}`, cx, cy + 8);
        ctx.font = "18px Arial";
        ctx.fillText(`P1: ${this.scoreP1}  —  ${this.scoreP2} ${GameManager.isSinglePlayer ? 'CPU' : 'P2'}`, cx, 40);

        if (this.state === 'showing') {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 24px Arial";
            ctx.fillText("WATCH THE SEQUENCE", cx, this.height - 50);
        } else if (this.state === 'playing') {
            ctx.fillText("REPEAT IT — RACE!", cx, this.height - 50);
            const p1Status = this.p1Done ? '✓' : this.p1Failed ? '✗' : `${this.p1Input.length}/${this.sequence.length}`;
            const p2Status = this.p2Done ? '✓' : this.p2Failed ? '✗' : `${this.p2Input.length}/${this.sequence.length}`;
            ctx.fillStyle = Theme.p1;
            ctx.fillText(`P1: ${p1Status}`, 150, this.height - 25);
            ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
            ctx.fillText(`${GameManager.isSinglePlayer ? 'CPU' : 'P2'}: ${p2Status}`, 650, this.height - 25);
        } else if (this.state === 'result') {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 32px Impact";
            let msg = 'TIE!';
            if (this.roundWinner === 1) msg = 'P1 WINS LEVEL!';
            else if (this.roundWinner === 2) msg = (GameManager.isSinglePlayer ? 'CPU' : 'P2') + ' WINS LEVEL!';
            ctx.fillText(msg, cx, this.height - 50);
        }
    }
}

GameManager.registerGame(new SimonSays());
