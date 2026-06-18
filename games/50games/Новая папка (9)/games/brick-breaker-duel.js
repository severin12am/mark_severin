// brick-breaker-duel.js
class BrickBreakerDuel extends GameBase {
    constructor() {
        super("Brick Breaker Duel", "Pong with a destructible brick wall in the center. Break through to score!");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }

        this.half = w / 2;
        this.paddleHeight = 110;
        this.paddleWidth = 14;

        // Paddles
        this.p1Paddle = { y: h/2 - this.paddleHeight/2, vy: 0 };
        this.p2Paddle = { y: h/2 - this.paddleHeight/2, vy: 0 };

        // Ball
        this.ball = { x: w/2, y: h/2, vx: 320, vy: 180, r: 11 };

        // Central bricks (6 columns x 5 rows)
        this.bricks = [];
        const brickW = 28;
        const brickH = 22;
        const startX = this.half - 84;
        for (let col = 0; col < 6; col++) {
            for (let row = 0; row < 5; row++) {
                this.bricks.push({
                    x: startX + col * (brickW + 8),
                    y: 90 + row * (brickH + 8),
                    w: brickW,
                    h: brickH,
                    active: true
                });
            }
        }

        this.resetBall();
    }

    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = 140 + Math.random() * (this.height - 280);
        this.ball.vx = (Math.random() > 0.5 ? 340 : -340);
        this.ball.vy = (Math.random() - 0.5) * 240;
    }

    update(dt) {
        // ──────────────── Player 1 (left paddle) ────────────────
        this.p1Paddle.vy = 0;
        if (Input.isDown('KeyW')) this.p1Paddle.vy = -420;
        if (Input.isDown('KeyS')) this.p1Paddle.vy = 420;
        this.p1Paddle.y += this.p1Paddle.vy * dt;
        this.p1Paddle.y = Math.max(60, Math.min(this.height - this.paddleHeight - 40, this.p1Paddle.y));

        // ──────────────── Player 2 / CPU ────────────────
        if (GameManager.isSinglePlayer) {
            // CPU follows ball with some imperfection
            const targetY = this.ball.y - this.paddleHeight / 2 + (Math.random() * 34 - 17);
            if (this.p2Paddle.y + this.paddleHeight/2 < targetY - 12) this.p2Paddle.y += 380 * dt;
            else if (this.p2Paddle.y + this.paddleHeight/2 > targetY + 12) this.p2Paddle.y -= 380 * dt;
        } else {
            this.p2Paddle.vy = 0;
            if (Input.isDown('ArrowUp')) this.p2Paddle.vy = -420;
            if (Input.isDown('ArrowDown')) this.p2Paddle.vy = 420;
            this.p2Paddle.y += this.p2Paddle.vy * dt;
        }
        this.p2Paddle.y = Math.max(60, Math.min(this.height - this.paddleHeight - 40, this.p2Paddle.y));

        // Update ball
        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;

        // Wall bounce (top/bottom)
        if (this.ball.y - this.ball.r < 40 || this.ball.y + this.ball.r > this.height - 30) {
            this.ball.vy = -this.ball.vy;
            this.ball.y = Math.max(40 + this.ball.r, Math.min(this.height - 30 - this.ball.r, this.ball.y));
        }

        // Paddle collision
        // P1 paddle
        if (this.ball.x - this.ball.r < 48 && this.ball.x + this.ball.r > 36 &&
            this.ball.y > this.p1Paddle.y && this.ball.y < this.p1Paddle.y + this.paddleHeight) {
            this.ball.x = 48 + this.ball.r;
            this.ball.vx = Math.abs(this.ball.vx) * 1.04;
            this.ball.vy += (this.ball.y - (this.p1Paddle.y + this.paddleHeight/2)) * 3.5;
        }
        // P2 paddle
        if (this.ball.x + this.ball.r > this.width - 48 && this.ball.x - this.ball.r < this.width - 36 &&
            this.ball.y > this.p2Paddle.y && this.ball.y < this.p2Paddle.y + this.paddleHeight) {
            this.ball.x = this.width - 48 - this.ball.r;
            this.ball.vx = -Math.abs(this.ball.vx) * 1.04;
            this.ball.vy += (this.ball.y - (this.p2Paddle.y + this.paddleHeight/2)) * 3.5;
        }

        // Brick collision
        for (let brick of this.bricks) {
            if (!brick.active) continue;
            if (this.ball.x + this.ball.r > brick.x && this.ball.x - this.ball.r < brick.x + brick.w &&
                this.ball.y + this.ball.r > brick.y && this.ball.y - this.ball.r < brick.y + brick.h) {
                brick.active = false;
                this.ball.vx = -this.ball.vx * 0.96;

                // Small score for breaking
                if (this.ball.vx > 0) this.scoreP1 += 1;
                else this.scoreP2 += 1;
                break;
            }
        }

        // Scoring - ball passed the center area and reached edge
        if (this.ball.x < 0) {
            this.scoreP2 += 5;
            this.resetBall();
        }
        if (this.ball.x > this.width) {
            this.scoreP1 += 5;
            this.resetBall();
        }

        // Win conditions
        if (this.scoreP1 >= 25) GameManager.gameOver(1);
        if (this.scoreP2 >= 25) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Divider line (faint)
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.moveTo(this.half, 40);
        ctx.lineTo(this.half, this.height - 30);
        ctx.stroke();
        ctx.setLineDash([]);

        // Bricks
        ctx.fillStyle = Theme.accent;
        for (let b of this.bricks) {
            if (b.active) {
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        }

        // Paddles
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(38, this.p1Paddle.y, this.paddleWidth, this.paddleHeight);
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.width - 38 - this.paddleWidth, this.p2Paddle.y, this.paddleWidth, this.paddleHeight);

        // Ball
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        ctx.fill();

        // Scores
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.fillText(this.scoreP1, this.half * 0.45, 55);
        ctx.fillText(this.scoreP2, this.half * 1.55, 55);
    }
}

GameManager.registerGame(new BrickBreakerDuel());