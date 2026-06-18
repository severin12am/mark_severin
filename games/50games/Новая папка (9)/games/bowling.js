// bowling.js
class Bowling extends GameBase {
    constructor() {
        super("Bowling", "Time the swing! Highest pins after 3 frames wins.");
    }

    init(w, h) {
        super.init(w, h);
        this.width = w;
        this.height = h;
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.framesP1 = 0;
        this.framesP2 = 0;
        this.resetFrame();
    }

    resetFrame() {
        this.currentPlayer = 1;
        this.power = 500;
        this.powerDir = 1;
        this.angle = 0;
        this.angleDir = 1;
        this.state = "power"; // power -> angle -> rolling -> done
        this.ballX = 400;
        this.ballY = 500;
        this.ballSpeed = 0;
        this.pins = Array(10).fill(true);
        this.knocked = 0;
    }

    update(dt) {
        const actionKey = this.currentPlayer === 1 ? 'Space' : 'Enter';

        if (this.state === "power") {
            this.power += this.powerDir * 1200 * dt;
            if (this.power > 1000 || this.power < 0) this.powerDir *= -1;
            if (Input.isDown(actionKey)) {
                this.state = "angle";
            }
            if (GameManager.isSinglePlayer && this.currentPlayer === 2) {
                this.power = 820; // good CPU stop
                this.state = "angle";
            }
        } else if (this.state === "angle") {
            this.angle += this.angleDir * 180 * dt;
            if (this.angle > 35 || this.angle < -35) this.angleDir *= -1;
            if (Input.isDown(actionKey)) {
                this.ballSpeed = this.power / 25;
                this.state = "rolling";
            }
            if (GameManager.isSinglePlayer && this.currentPlayer === 2) {
                this.angle = 0; // perfect CPU
                this.ballSpeed = this.power / 25;
                this.state = "rolling";
            }
        } else if (this.state === "rolling") {
            this.ballY -= this.ballSpeed * dt * 60;
            this.ballSpeed *= 0.96;
            if (this.ballY < 120) {
                this.knockPins();
                this.state = "done";
            }
        } else if (this.state === "done") {
            if (this.currentPlayer === 1) {
                this.scoreP1 += this.knocked;
                this.framesP1++;
                this.currentPlayer = 2;
                this.resetFrame();
            } else {
                this.scoreP2 += this.knocked;
                this.framesP2++;
                this.currentPlayer = 1;
                this.resetFrame();
            }
            if (this.framesP1 >= 3 && this.framesP2 >= 3) {
                GameManager.gameOver(this.scoreP1 > this.scoreP2 ? 1 : (this.scoreP2 > this.scoreP1 ? 2 : 0));
            }
        }

        if (this.scoreP1 >= 50 || this.scoreP2 >= 50) GameManager.gameOver(this.scoreP1 >= 50 ? 1 : 2);
    }

    knockPins() {
        const accuracy = Math.abs(this.power - 500) / 500 + Math.abs(this.angle) / 40;
        this.knocked = Math.floor(10 * Math.max(0.3, 1 - accuracy * 0.7));
        if (this.knocked > 10) this.knocked = 10;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.fillRect(100, 80, 600, 20); // lane top

        // Pins
        ctx.fillStyle = Theme.accent;
        for (let i = 0; i < 10; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4 - row / 2;
            const px = 340 + col * 45;
            const py = 100 + row * 35;
            if (this.pins[i]) ctx.fillRect(px, py, 12, 28);
        }

        // Ball
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.ballX, this.ballY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Swinging meter
        if (this.state === "power" || this.state === "angle") {
            ctx.fillStyle = Theme.accent;
            const meterX = this.currentPlayer === 1 ? 120 : 620;
            ctx.fillRect(meterX, 200, 40, 300);
            ctx.fillStyle = Theme.p1;
            if (this.state === "power") ctx.fillRect(meterX + 5, 480 - (this.power / 1000 * 280), 30, 12);
            if (this.state === "angle") ctx.fillRect(meterX + 5, 350 + this.angle * 3, 30, 12);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 36px sans-serif";
        ctx.fillText(this.scoreP1, 180, 70);
        ctx.fillText(this.scoreP2, 620, 70);
        ctx.font = "18px sans-serif";
        ctx.fillText(GameManager.isSinglePlayer && this.currentPlayer === 2 ? "CPU" : `P${this.currentPlayer}`, this.currentPlayer === 1 ? 180 : 620, 110);
    }
}

GameManager.registerGame(new Bowling());