class GamePong extends GameBase {
    constructor() {
        super("Pong", "First to 11 wins (win by 2). Ball speeds up on hits.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.paddleW = 14;
        this.paddleH = 90;
        this.ballR = 8;
        this.p1Y = h / 2 - this.paddleH / 2;
        this.p2Y = h / 2 - this.paddleH / 2;
        this.serveDelay = 0.8;
        this.flashTimer = 0;
        this.resetBall();
    }

    resetBall(toward) {
        this.ballX = this.width / 2;
        this.ballY = this.height / 2;
        const speed = 280 + (this.scoreP1 + this.scoreP2) * 8;
        const dirX = toward || (Math.random() > 0.5 ? 1 : -1);
        this.ballVx = dirX * speed;
        this.ballVy = (Math.random() * 2 - 1) * speed * 0.45;
        this.serveDelay = 0.7;
    }

    update(dt) {
        if (this.serveDelay > 0) {
            this.serveDelay -= dt;
            return;
        }

        const move = 420 * dt;
        if (Input.isDown('KeyW')) this.p1Y -= move;
        if (Input.isDown('KeyS')) this.p1Y += move;

        if (GameManager.isSinglePlayer) {
            const target = this.ballY - this.paddleH / 2;
            const diff = target - this.p2Y;
            this.p2Y += Math.sign(diff) * Math.min(Math.abs(diff), move * 0.88);
        } else {
            if (Input.isDown('ArrowUp')) this.p2Y -= move;
            if (Input.isDown('ArrowDown')) this.p2Y += move;
        }

        this.p1Y = Math.max(0, Math.min(this.height - this.paddleH, this.p1Y));
        this.p2Y = Math.max(0, Math.min(this.height - this.paddleH, this.p2Y));

        this.ballX += this.ballVx * dt;
        this.ballY += this.ballVy * dt;

        if (this.ballY <= this.ballR) {
            this.ballY = this.ballR;
            this.ballVy = Math.abs(this.ballVy);
            AudioManager.tick();
        }
        if (this.ballY >= this.height - this.ballR) {
            this.ballY = this.height - this.ballR;
            this.ballVy = -Math.abs(this.ballVy);
            AudioManager.tick();
        }

        const p1X = 18;
        const p2X = this.width - 18 - this.paddleW;

        if (this.ballVx < 0 &&
            this.ballX - this.ballR <= p1X + this.paddleW &&
            this.ballY >= this.p1Y && this.ballY <= this.p1Y + this.paddleH) {
            this.ballX = p1X + this.paddleW + this.ballR;
            const rel = (this.ballY - (this.p1Y + this.paddleH / 2)) / (this.paddleH / 2);
            const angle = rel * (Math.PI / 3);
            const speed = Math.min(Math.hypot(this.ballVx, this.ballVy) * 1.06, 820);
            this.ballVx = Math.cos(angle) * speed;
            this.ballVy = Math.sin(angle) * speed;
            AudioManager.move();
        } else if (this.ballX < -this.ballR) {
            this.scoreP2++;
            this.flashTimer = 0.4;
            AudioManager.wrong();
            if (this.checkWin()) return;
            this.resetBall(1);
        }

        if (this.ballVx > 0 &&
            this.ballX + this.ballR >= p2X &&
            this.ballY >= this.p2Y && this.ballY <= this.p2Y + this.paddleH) {
            this.ballX = p2X - this.ballR;
            const rel = (this.ballY - (this.p2Y + this.paddleH / 2)) / (this.paddleH / 2);
            const angle = Math.PI - rel * (Math.PI / 3);
            const speed = Math.min(Math.hypot(this.ballVx, this.ballVy) * 1.06, 820);
            this.ballVx = Math.cos(angle) * speed;
            this.ballVy = Math.sin(angle) * speed;
            AudioManager.move();
        } else if (this.ballX > this.width + this.ballR) {
            this.scoreP1++;
            this.flashTimer = 0.4;
            AudioManager.correct();
            if (this.checkWin()) return;
            this.resetBall(-1);
        }

        if (this.flashTimer > 0) this.flashTimer -= dt;
    }

    checkWin() {
        if (this.scoreP1 >= 11 || this.scoreP2 >= 11) {
            const diff = Math.abs(this.scoreP1 - this.scoreP2);
            if (diff >= 2) {
                GameManager.gameOver(this.scoreP1 > this.scoreP2 ? 1 : 2);
                return true;
            }
        }
        return false;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.fg;
        ctx.setLineDash([8, 14]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.25, 40);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.75, 40);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('first to 11, win by 2', this.width / 2, 40);

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(18, this.p1Y, this.paddleW, this.paddleH);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillRect(this.width - 18 - this.paddleW, this.p2Y, this.paddleW, this.paddleH);

        if (this.serveDelay <= 0) {
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(this.ballX, this.ballY, this.ballR, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 20px Arial';
            ctx.fillText('SERVE', this.width / 2, this.height / 2);
        }

        if (this.flashTimer > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 0.15})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('W/S move paddle', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GamePong());
