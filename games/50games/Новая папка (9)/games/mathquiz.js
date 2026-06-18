class MathQuiz extends GameBase {
    constructor() { super("Math Quiz", "Select the correct answer fastest! First to 5."); }
    
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: 0, cd: 0 };
        this.p2 = { x: 0, cd: 0 };
        this.generateQuestion();
    }
    
    generateQuestion() {
        let a = Math.floor(Math.random() * 20) + 1;
        let b = Math.floor(Math.random() * 20) + 1;
        this.question = `${a} + ${b}`;
        this.correct = a + b;
        
        // 4 answers now (exactly what you asked for)
        this.answers = [this.correct];
        while (this.answers.length < 4) {
            let wrong = this.correct + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 9) + 3);
            if (!this.answers.includes(wrong)) this.answers.push(wrong);
        }
        this.answers.sort(() => Math.random() - 0.5);
        
        this.aiTimer = 55 + Math.random() * 65;
    }
    
     update(dt) {
        if (this.p1.cd > 0) this.p1.cd--;
        if (this.p2.cd > 0) this.p2.cd--;

        // === PLAYER 1 (A/D) ===
        if (this.p1.cd <= 0) {
            if (Input.isDown('KeyA') && this.p1.x > 0) {
                this.p1.x--;
                this.p1.cd = 14;           // higher cooldown stops double-move on quick taps
                AudioManager.move();
            }
            else if (Input.isDown('KeyD') && this.p1.x < 3) {
                this.p1.x++;
                this.p1.cd = 14;
                AudioManager.move();
            }
        }

        // Player 1 answer (Space) — works even if you tap direction at the same time
        if (Input.isDown('Space') && this.p1.cd <= 10) {
            this.handleAnswer(1);
            this.p1.cd = 28;
        }

        // === PLAYER 2 or CPU ===
        if (GameManager.isSinglePlayer) {
            this.aiTimer--;
            if (this.aiTimer <= 0) {
                let correctIdx = this.answers.indexOf(this.correct);
                if (this.p2.x < correctIdx) this.p2.x++;
                else if (this.p2.x > correctIdx) this.p2.x--;
                else this.handleAnswer(2);
                this.aiTimer = 19 + Math.random() * 23;
            }
        } else {
            // PLAYER 2 (Arrows)
            if (this.p2.cd <= 0) {
                if (Input.isDown('ArrowLeft') && this.p2.x > 0) {
                    this.p2.x--;
                    this.p2.cd = 14;           // higher cooldown stops double-move
                    AudioManager.move();
                }
                else if (Input.isDown('ArrowRight') && this.p2.x < 3) {
                    this.p2.x++;
                    this.p2.cd = 14;
                    AudioManager.move();
                }
            }

            // Player 2 answer (Enter)
            if (Input.isDown('Enter') && this.p2.cd <= 10) {
                this.handleAnswer(2);
                this.p2.cd = 28;
            }
        }
    }
    
    handleAnswer(player) {
        const pos = player === 1 ? this.p1 : this.p2;
        AudioManager.select();
        if (this.answers[pos.x] === this.correct) {
            AudioManager.correct();
            if (player === 1) this.scoreP1++; else this.scoreP2++;
            if ((player === 1 ? this.scoreP1 : this.scoreP2) >= 5) GameManager.gameOver(player);
            else this.generateQuestion();
        } else {
            AudioManager.wrong();
            if (player === 1) this.scoreP1 = Math.max(0, this.scoreP1 - 1);
            else this.scoreP2 = Math.max(0, this.scoreP2 - 1);
            pos.cd = 55;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Question panel (exactly like your mockup)
        ctx.fillStyle = '#111111';
        ctx.fillRect(90, 110, this.width - 180, 130);
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 9;
        ctx.strokeRect(90, 110, this.width - 180, 130);

        ctx.fillStyle = Theme.accent;
        ctx.font = "bold 68px 'Bungee', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.question, this.width / 2, 190);

        // 4 answer boxes (horizontal, centered, chunky brutalist style)
        const boxW = 155;
        const boxH = 105;
        const startX = (this.width - 4 * boxW - 60) / 2;
        const y = 315;

        for (let i = 0; i < 4; i++) {
            const x = startX + i * (boxW + 20);

            // Background + thick border
            ctx.fillStyle = '#222222';
            ctx.fillRect(x, y, boxW, boxH);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 7;
            ctx.strokeRect(x, y, boxW, boxH);

            // Answer number (yellow like mockup)
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 48px Arial";
            ctx.fillText(this.answers[i], x + boxW / 2, y + 70);

            // P1 selection (hot pink neon border — exactly like mockup)
            if (this.p1.x === i) {
                ctx.strokeStyle = Theme.p1;
                ctx.lineWidth = 8;
                ctx.strokeRect(x - 7, y - 7, boxW + 14, boxH + 14);
            }
            // P2 selection (mint green neon border)
            if (this.p2.x === i) {
                ctx.strokeStyle = Theme.p2;
                ctx.lineWidth = 6;
                ctx.strokeRect(x - 4, y - 4, boxW + 8, boxH + 8);
            }
        }
    }
}
GameManager.registerGame(new MathQuiz());