class MathQuiz extends GameBase {
    constructor() { 
        super("Math Quiz", "Select the correct answer fastest! First to 5."); 
    }
    
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { 
            this.scoreP1 = 0; 
            this.scoreP2 = 0; 
        }
        this.p1 = { x: 0, cd: 0 };
        this.p2 = { x: 0, cd: 0 };
        this.generateQuestion();
    }
    
    generateQuestion() {
        const roll = Math.random();
        let a, b;

        if (roll < 0.35) {
            // Addition
            a = Math.floor(Math.random() * 28) + 6;
            b = Math.floor(Math.random() * 24) + 5;
            this.question = `${a} + ${b}`;
            this.correct = a + b;
        } 
        else if (roll < 0.60) {
            // Subtraction
            a = Math.floor(Math.random() * 35) + 15;
            b = Math.floor(Math.random() * 18) + 6;
            this.question = `${a} − ${b}`;
            this.correct = a - b;
        } 
        else if (roll < 0.80) {
            // Multiplication
            a = Math.floor(Math.random() * 9) + 3;
            b = Math.floor(Math.random() * 7) + 3;
            this.question = `${a} × ${b}`;
            this.correct = a * b;
        } 
        else if (roll < 0.93) {
            // Division (always clean integer result)
            b = Math.floor(Math.random() * 8) + 3;           // divisor 3-10
            const quotient = Math.floor(Math.random() * 9) + 4; // 4-12
            a = b * quotient;
            this.question = `${a} ÷ ${b}`;
            this.correct = quotient;
        } 
        else {
            // Rare triple addition
            a = Math.floor(Math.random() * 12) + 5;
            b = Math.floor(Math.random() * 11) + 4;
            const c = Math.floor(Math.random() * 10) + 3;
            this.question = `${a} + ${b} + ${c}`;
            this.correct = a + b + c;
        }

        // Generate 3 unique wrong answers (always positive)
        this.answers = [this.correct];
        while (this.answers.length < 4) {
            let offset = Math.floor(Math.random() * 13) + 4;
            if (Math.random() > 0.5) offset = -offset;
            let wrong = this.correct + offset;
            if (wrong > 0 && !this.answers.includes(wrong)) {
                this.answers.push(wrong);
            }
        }
        this.answers.sort(() => Math.random() - 0.5);
        
        this.aiTimer = 48 + Math.random() * 58;
    }
    
    update(dt) {
        if (this.p1.cd > 0) this.p1.cd--;
        if (this.p2.cd > 0) this.p2.cd--;

        // === PLAYER 1 (A/D) — NOW WRAPS AROUND ===
        if (this.p1.cd <= 0) {
            let moved = false;
            if (Input.isDown('KeyA')) {
                this.p1.x = (this.p1.x - 1 + 4) % 4;
                moved = true;
            }
            else if (Input.isDown('KeyD')) {
                this.p1.x = (this.p1.x + 1) % 4;
                moved = true;
            }
            if (moved) {
                this.p1.cd = 13;
                AudioManager.move();
            }
        }

        // Player 1 submit answer (Space)
        if (Input.isDown('Space') && this.p1.cd <= 8) {
            this.handleAnswer(1);
            this.p1.cd = 26;
        }

        // === PLAYER 2 or CPU ===
        if (GameManager.isSinglePlayer) {
            this.aiTimer--;
            if (this.aiTimer <= 0) {
                let correctIdx = this.answers.indexOf(this.correct);
                if (this.p2.x !== correctIdx) {
                    // AI also wraps if needed (though unlikely)
                    this.p2.x = (this.p2.x + (this.p2.x < correctIdx ? 1 : -1) + 4) % 4;
                } else {
                    this.handleAnswer(2);
                }
                this.aiTimer = 17 + Math.random() * 21;
            }
        } else {
            // PLAYER 2 (Arrow Left/Right) — NOW WRAPS AROUND ===
            if (this.p2.cd <= 0) {
                let moved = false;
                if (Input.isDown('ArrowLeft')) {
                    this.p2.x = (this.p2.x - 1 + 4) % 4;
                    moved = true;
                }
                else if (Input.isDown('ArrowRight')) {
                    this.p2.x = (this.p2.x + 1) % 4;
                    moved = true;
                }
                if (moved) {
                    this.p2.cd = 13;
                    AudioManager.move();
                }
            }

            // Player 2 submit answer (Enter)
            if (Input.isDown('Enter') && this.p2.cd <= 8) {
                this.handleAnswer(2);
                this.p2.cd = 26;
            }
        }
    }
    
    handleAnswer(player) {
        const pos = player === 1 ? this.p1 : this.p2;
        AudioManager.select();
        
        if (this.answers[pos.x] === this.correct) {
            AudioManager.correct();
            if (player === 1) this.scoreP1++;
            else this.scoreP2++;
            
            if ((player === 1 ? this.scoreP1 : this.scoreP2) >= 5) {
                GameManager.gameOver(player);
            } else {
                this.generateQuestion();
            }
        } else {
            AudioManager.wrong();
            if (player === 1) this.scoreP1 = Math.max(0, this.scoreP1 - 1);
            else this.scoreP2 = Math.max(0, this.scoreP2 - 1);
            pos.cd = 48; // bigger penalty
        }
    }
    
    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Question panel
        ctx.fillStyle = '#111111';
        ctx.fillRect(85, 105, this.width - 170, 135);
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 10;
        ctx.strokeRect(85, 105, this.width - 170, 135);

        ctx.fillStyle = Theme.accent;
        ctx.font = "bold 64px 'Bungee', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.question, this.width / 2, 188);

        // 4 answer boxes
        const boxW = 148;
        const boxH = 102;
        const startX = (this.width - 4 * boxW - 55) / 2;
        const y = 310;

        for (let i = 0; i < 4; i++) {
            const x = startX + i * (boxW + 19);

            ctx.fillStyle = '#222222';
            ctx.fillRect(x, y, boxW, boxH);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 7;
            ctx.strokeRect(x, y, boxW, boxH);

            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 46px Arial";
            ctx.fillText(this.answers[i], x + boxW / 2, y + 68);

            // P1 selection highlight
            if (this.p1.x === i) {
                ctx.strokeStyle = Theme.p1;
                ctx.lineWidth = 9;
                ctx.strokeRect(x - 8, y - 8, boxW + 16, boxH + 16);
            }
            // P2 selection highlight
            if (this.p2.x === i) {
                ctx.strokeStyle = Theme.p2;
                ctx.lineWidth = 6;
                ctx.strokeRect(x - 5, y - 5, boxW + 10, boxH + 10);
            }
        }
    }
}

GameManager.registerGame(new MathQuiz());