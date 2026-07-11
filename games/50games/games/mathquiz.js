class MathQuiz extends GameBase {
    constructor() {
        super("Math Quiz", "Pick the correct answer fastest! First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: 0, moveCd: 0, actCd: 0, actHeld: false, lockout: 0 };
        this.p2 = { x: 0, moveCd: 0, actCd: 0, actHeld: false, lockout: 0 };
        this.roundMsg = '';
        this.roundPause = 0;
        this.flash = 0;
        this.generateQuestion();
    }

    generateQuestion() {
        const roll = Math.random();
        let a, b;

        if (roll < 0.35) {
            a = Math.floor(Math.random() * 28) + 6;
            b = Math.floor(Math.random() * 24) + 5;
            this.question = `${a} + ${b}`;
            this.correct = a + b;
        } else if (roll < 0.60) {
            a = Math.floor(Math.random() * 35) + 15;
            b = Math.floor(Math.random() * 18) + 6;
            if (b > a) [a, b] = [b, a];
            this.question = `${a} − ${b}`;
            this.correct = a - b;
        } else if (roll < 0.80) {
            a = Math.floor(Math.random() * 9) + 3;
            b = Math.floor(Math.random() * 7) + 3;
            this.question = `${a} × ${b}`;
            this.correct = a * b;
        } else if (roll < 0.93) {
            b = Math.floor(Math.random() * 8) + 3;
            const quotient = Math.floor(Math.random() * 9) + 4;
            a = b * quotient;
            this.question = `${a} ÷ ${b}`;
            this.correct = quotient;
        } else {
            a = Math.floor(Math.random() * 12) + 5;
            b = Math.floor(Math.random() * 11) + 4;
            const c = Math.floor(Math.random() * 10) + 3;
            this.question = `${a} + ${b} + ${c}`;
            this.correct = a + b + c;
        }

        this.answers = [this.correct];
        while (this.answers.length < 4) {
            let offset = Math.floor(Math.random() * 13) + 3;
            if (Math.random() > 0.5) offset = -offset;
            const wrong = this.correct + offset;
            if (wrong > 0 && !this.answers.includes(wrong)) {
                this.answers.push(wrong);
            }
        }
        // Shuffle
        for (let i = this.answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.answers[i], this.answers[j]] = [this.answers[j], this.answers[i]];
        }

        this.p1.x = 0;
        this.p2.x = 0;
        this.p1.lockout = 0;
        this.p2.lockout = 0;
        // CPU thinks for a bit then navigates
        this.aiTimer = 1.1 + Math.random() * 1.4;
        this.aiState = 'think';
    }

    handleAnswer(player) {
        if (this.roundPause > 0) return;
        const pos = player === 1 ? this.p1 : this.p2;
        if (pos.lockout > 0) return;

        if (this.answers[pos.x] === this.correct) {
            if (player === 1) {
                this.scoreP1++;
                this.roundMsg = 'P1 CORRECT!';
            } else {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU CORRECT!' : 'P2 CORRECT!';
            }
            AudioManager.correct();
            this.flash = 0.4;
            this.roundPause = 0.95;
        } else {
            AudioManager.wrong();
            pos.lockout = 0.85;
            this.wrongT = 0.35;
        }
    }

    updateCursor(p, left, right, action, dt) {
        p.moveCd = Math.max(0, p.moveCd - dt);
        p.actCd = Math.max(0, p.actCd - dt);
        p.lockout = Math.max(0, p.lockout - dt);

        if (p.lockout > 0) return;

        if (p.moveCd <= 0) {
            let moved = false;
            if (Input.isDown(left)) {
                p.x = (p.x - 1 + 4) % 4;
                moved = true;
            } else if (Input.isDown(right)) {
                p.x = (p.x + 1) % 4;
                moved = true;
            }
            if (moved) {
                p.moveCd = 0.16;
                AudioManager.move();
            }
        }

        const down = Input.isDown(action);
        if (down && !p.actHeld && p.actCd <= 0) {
            p.actCd = 0.25;
            return true; // submit
        }
        p.actHeld = down;
        return false;
    }

    update(dt) {
        if (this.wrongT > 0) this.wrongT -= dt;
        if (this.flash > 0) this.flash -= dt;

        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.generateQuestion();
                }
            }
            return;
        }

        if (this.updateCursor(this.p1, 'KeyA', 'KeyD', 'Space', dt)) {
            this.handleAnswer(1);
        }

        if (GameManager.isSinglePlayer) {
            this.p2.lockout = Math.max(0, this.p2.lockout - dt);
            if (this.p2.lockout > 0) return;

            this.aiTimer -= dt;
            const correctIdx = this.answers.indexOf(this.correct);

            if (this.aiState === 'think') {
                if (this.aiTimer <= 0) {
                    this.aiState = 'move';
                    this.aiTimer = 0.12 + Math.random() * 0.1;
                }
            } else if (this.aiState === 'move') {
                if (this.aiTimer <= 0) {
                    // Occasional wrong answer pick
                    let target = correctIdx;
                    if (Math.random() < 0.18) {
                        target = Math.floor(Math.random() * 4);
                    }
                    if (this.p2.x !== target) {
                        this.p2.x += this.p2.x < target ? 1 : -1;
                        this.p2.x = (this.p2.x + 4) % 4;
                        AudioManager.move();
                        this.aiTimer = 0.14 + Math.random() * 0.12;
                    } else {
                        this.aiState = 'answer';
                        this.aiTimer = 0.15 + Math.random() * 0.35;
                    }
                }
            } else if (this.aiState === 'answer') {
                if (this.aiTimer <= 0) {
                    this.handleAnswer(2);
                    this.aiState = 'think';
                    this.aiTimer = 99;
                }
            }
        } else {
            if (this.updateCursor(this.p2, 'ArrowLeft', 'ArrowRight', 'Enter', dt)) {
                this.handleAnswer(2);
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Score header
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Score: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 32);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('A/D or ←/→ select · Space / Enter answer', this.width / 2, 54);

        // Question panel
        const qx = 70;
        const qy = 90;
        const qw = this.width - 140;
        const qh = 120;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(qx, qy, qw, qh);
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(qx, qy, qw, qh);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 52px Arial';
        ctx.fillText(this.question + ' = ?', this.width / 2, qy + 78);

        // Answer boxes
        const boxW = Math.min(150, (this.width - 100) / 4 - 12);
        const boxH = 90;
        const gap = 16;
        const totalW = 4 * boxW + 3 * gap;
        const startX = (this.width - totalW) / 2;
        const y = 280;

        for (let i = 0; i < 4; i++) {
            const x = startX + i * (boxW + gap);

            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(x, y, boxW, boxH);
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, boxW, boxH);

            // Labels A B C D
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(String.fromCharCode(65 + i), x + 8, y + 18);

            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(String(this.answers[i]), x + boxW / 2, y + boxH / 2 + 12);

            if (this.p1.x === i) {
                ctx.strokeStyle = Theme.p1;
                ctx.lineWidth = 5;
                ctx.strokeRect(x - 6, y - 6, boxW + 12, boxH + 12);
                ctx.fillStyle = Theme.p1;
                ctx.font = 'bold 11px Arial';
                ctx.fillText('P1', x + boxW / 2, y - 12);
            }
            if (this.p2.x === i) {
                ctx.strokeStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
                ctx.lineWidth = 4;
                ctx.strokeRect(x - 3, y - 3, boxW + 6, boxH + 6);
                ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
                ctx.font = 'bold 11px Arial';
                ctx.fillText(GameManager.isSinglePlayer ? 'CPU' : 'P2', x + boxW / 2, y + boxH + 16);
            }

            // Lockout tint
            if (this.p1.lockout > 0 && this.p1.x === i) {
                ctx.fillStyle = 'rgba(255,80,80,0.2)';
                ctx.fillRect(x, y, boxW, boxH);
            }
            if (this.p2.lockout > 0 && this.p2.x === i) {
                ctx.fillStyle = 'rgba(255,80,80,0.2)';
                ctx.fillRect(x, y, boxW, boxH);
            }
        }

        if (this.flash > 0) {
            ctx.fillStyle = `rgba(255,230,0,${this.flash * 0.2})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
            ctx.font = '18px Arial';
            ctx.fillStyle = Theme.fg;
            ctx.fillText(`Answer: ${this.correct}`, this.width / 2, this.height / 2 + 36);
        }
    }
}

GameManager.registerGame(new MathQuiz());
