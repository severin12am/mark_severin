class GamePong extends GameBase {
    constructor() { 
        super("Pong", "First to 11 wins. Ball speeds up on hits."); 
    }
    
    init(w, h) {
        super.init(w,h);
        this.paddleW = 15;
        this.paddleH = 80;
        this.ballSize = 12;
        
        // Reset scores
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        
        this.p1Y = h/2 - this.paddleH/2;
        this.p2Y = h/2 - this.paddleH/2;
        
        this.resetBall();
    }

    resetBall() {
        this.ballX = this.width / 2;
        this.ballY = this.height / 2;
        const speed = 300;
        const dirX = (Math.random() > 0.5 ? 1 : -1);
        const dirY = (Math.random() * 2 - 1) * 0.5;
        this.ballVx = dirX * speed;
        this.ballVy = dirY * speed;
    }

    update(dt) {
        // P1 Movement
        if (Input.isDown('KeyW')) this.p1Y -= 400 * dt;
        if (Input.isDown('KeyS')) this.p1Y += 400 * dt;
        
        // P2 Movement
        if (Input.isDown('ArrowUp')) this.p2Y -= 400 * dt;
        if (Input.isDown('ArrowDown')) this.p2Y += 400 * dt;

        // Clamp paddles
        this.p1Y = Math.max(0, Math.min(this.height - this.paddleH, this.p1Y));
        this.p2Y = Math.max(0, Math.min(this.height - this.paddleH, this.p2Y));

        // Ball Movement
        this.ballX += this.ballVx * dt;
        this.ballY += this.ballVy * dt;

        // Wall Bounce
        if (this.ballY <= 0 || this.ballY + this.ballSize >= this.height) {
            this.ballVy = -this.ballVy;
        }

        // Paddle Collision Logic
        let player = (this.ballX < this.width / 2) ? 'p1' : 'p2';
        
        if (player === 'p1') {
            if (this.ballX <= this.paddleW + this.ballSize && 
                this.ballY >= this.p1Y && this.ballY <= this.p1Y + this.paddleH) {
                
                let rel = (this.ballY - (this.p1Y + this.paddleH/2)) / (this.paddleH/2);
                let angle = rel * (Math.PI / 3);
                let speed = Math.min(Math.sqrt(this.ballVx**2 + this.ballVy**2) * 1.05, 800);

                this.ballVx = Math.cos(angle) * speed;
                this.ballVy = Math.sin(angle) * speed;
            } else if (this.ballX < -20) {
                this.scoreP2++;
                this.checkWin();
                this.resetBall();
            }
        } else {
            if (this.ballX + this.ballSize >= this.width - this.paddleW && 
                this.ballY >= this.p2Y && this.ballY <= this.p2Y + this.paddleH) {
                
                let rel = (this.ballY - (this.p2Y + this.paddleH/2)) / (this.paddleH/2);
                let angle = Math.PI - (rel * (Math.PI / 3));
                let speed = Math.min(Math.sqrt(this.ballVx**2 + this.ballVy**2) * 1.05, 800);

                this.ballVx = Math.cos(angle) * speed;
                this.ballVy = Math.sin(angle) * speed;
            } else if (this.ballX > this.width + 20) {
                this.scoreP1++;
                this.checkWin();
                this.resetBall();
            }
        }
    }

    checkWin() {
        if (this.scoreP1 >= 11 || this.scoreP2 >= 11) {
            let diff = Math.abs(this.scoreP1 - this.scoreP2);
            if(diff >= 2) GameManager.gameOver(this.scoreP1 > this.scoreP2 ? 1 : 2);
        }
    }

    render(ctx) {
        // Draw Center Line (using Theme.fg)
        ctx.strokeStyle = Theme.fg;
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.moveTo(this.width/2, 0);
        ctx.lineTo(this.width/2, this.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw P1 Paddle (Using Theme.p1)
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(10, this.p1Y, this.paddleW, this.paddleH);
        
        // Draw P2 Paddle (Using Theme.p2)
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.width - 10 - this.paddleW, this.p2Y, this.paddleW, this.paddleH);

        // Draw Ball (Using Theme.fg)
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(this.ballX + this.ballSize/2, this.ballY + this.ballSize/2, this.ballSize/2, 0, Math.PI*2);
        ctx.fill();
    }
}

// Register this game into the Mother File's engine!
GameManager.registerGame(new GamePong());