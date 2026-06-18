class MathQuiz extends GameBase {
    constructor() { super("Math Quiz", "Select the correct answer fastest! First to 5."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: 0, cd: 0 };
        this.p2 = { x: 2, cd: 0 };
        this.generateQuestion();
    }
    generateQuestion() {
        let a = Math.floor(Math.random() * 20) + 1;
        let b = Math.floor(Math.random() * 20) + 1;
        this.question = `${a} + ${b}`;
        this.correct = a + b;
        this.answers =[this.correct, this.correct + Math.floor(Math.random()*5)+1, this.correct - Math.floor(Math.random()*5)-1];
        this.answers.sort(() => Math.random() - 0.5);
        this.aiTimer = 60 + Math.random() * 60; // 1 to 2 seconds for AI to guess
    }
    update(dt) {
        if (this.p1.cd > 0) this.p1.cd--;
        if (this.p2.cd > 0) this.p2.cd--;

        if (this.p1.cd <= 0) {
            if (Input.isDown('KeyA') && this.p1.x > 0) { this.p1.x--; this.p1.cd = 15; }
            if (Input.isDown('KeyD') && this.p1.x < 2) { this.p1.x++; this.p1.cd = 15; }
            if (Input.isDown('Space')) {
                if (this.answers[this.p1.x] === this.correct) {
                    this.scoreP1++; if (this.scoreP1 >= 5) GameManager.gameOver(1); else this.generateQuestion();
                } else { this.scoreP1 = Math.max(0, this.scoreP1 - 1); this.p1.cd = 60; }
            }
        }

        if (GameManager.isSinglePlayer) {
            this.aiTimer--;
            if (this.aiTimer <= 0) {
                let correctIdx = this.answers.indexOf(this.correct);
                if (this.p2.x < correctIdx) this.p2.x++;
                else if (this.p2.x > correctIdx) this.p2.x--;
                else {
                    this.scoreP2++; if (this.scoreP2 >= 5) GameManager.gameOver(2); else this.generateQuestion();
                }
                this.aiTimer = 20; // delay between moves
            }
        } else {
            if (this.p2.cd <= 0) {
                if (Input.isDown('ArrowLeft') && this.p2.x > 0) { this.p2.x--; this.p2.cd = 15; }
                if (Input.isDown('ArrowRight') && this.p2.x < 2) { this.p2.x++; this.p2.cd = 15; }
                if (Input.isDown('Enter')) {
                    if (this.answers[this.p2.x] === this.correct) {
                        this.scoreP2++; if (this.scoreP2 >= 5) GameManager.gameOver(2); else this.generateQuestion();
                    } else { this.scoreP2 = Math.max(0, this.scoreP2 - 1); this.p2.cd = 60; }
                }
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        // Question
        ctx.fillStyle = Theme.fg;
        ctx.font = "50px Arial"; ctx.textAlign = "center";
        ctx.fillText(this.question, this.width/2, this.height/3);

        // Answers
        let boxW = 150, boxH = 100;
        let spacing = (this.width - 3*boxW) / 4;
        
        for (let i=0; i<3; i++) {
            let x = spacing + i*(boxW + spacing);
            let y = this.height * 0.6;
            
            ctx.fillStyle = Theme.fg; ctx.globalAlpha = 0.2;
            ctx.fillRect(x, y, boxW, boxH); ctx.globalAlpha = 1.0;
            
            ctx.fillStyle = Theme.accent;
            ctx.font = "40px Arial";
            ctx.fillText(this.answers[i], x + boxW/2, y + boxH/2 + 15);

            // Cursors
            if (this.p1.x === i) {
                ctx.strokeStyle = Theme.p1; ctx.lineWidth = 4;
                ctx.strokeRect(x - 5, y - 5, boxW + 10, boxH + 10);
            }
            if (this.p2.x === i) {
                ctx.strokeStyle = Theme.p2; ctx.lineWidth = 2;
                ctx.strokeRect(x + 5, y + 5, boxW - 10, boxH - 10);
            }
        }
    }
}
GameManager.registerGame(new MathQuiz());