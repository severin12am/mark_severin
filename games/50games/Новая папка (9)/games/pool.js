class BumperPool extends GameBase {
    constructor() {
        super("Bumper Pool", "Knock neutral balls into corners. First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.setupBoard();
    }

    setupBoard() {
        this.balls = [];
        // P1 & P2 Balls
        this.p1Ball = { x: 150, y: this.height/2, vx: 0, vy: 0, r: 20, color: Theme.p1, type: 'p1' };
        this.p2Ball = { x: this.width - 150, y: this.height/2, vx: 0, vy: 0, r: 20, color: GameManager.isSinglePlayer ? "#8C52FF" : Theme.p2, type: 'p2' };
        this.balls.push(this.p1Ball, this.p2Ball);

        // Neutral Balls
        for (let i = 0; i < 7; i++) {
            this.balls.push({
                x: this.width/2 + (Math.random() * 100 - 50),
                y: this.height/2 + (Math.random() * 200 - 100),
                vx: 0, vy: 0, r: 15, color: Theme.accent, type: 'neutral'
            });
        }

        this.pockets = [
            {x: 0, y: 0}, {x: this.width, y: 0},
            {x: 0, y: this.height}, {x: this.width, y: this.height}
        ];
        this.pocketRadius = 40;
    }

    update(dt) {
        let accel = 2000;

        // P1 Control
        if (Input.isDown('KeyW')) this.p1Ball.vy -= accel * dt;
        if (Input.isDown('KeyS')) this.p1Ball.vy += accel * dt;
        if (Input.isDown('KeyA')) this.p1Ball.vx -= accel * dt;
        if (Input.isDown('KeyD')) this.p1Ball.vx += accel * dt;

        // P2 / AI Control
        if (GameManager.isSinglePlayer) {
            // Find closest neutral ball
            let target = null;
            let minDist = Infinity;
            for (let b of this.balls) {
                if (b.type === 'neutral') {
                    let d = Math.hypot(b.x - this.p2Ball.x, b.y - this.p2Ball.y);
                    if (d < minDist) { minDist = d; target = b; }
                }
            }
            if (target) {
                if (target.y < this.p2Ball.y) this.p2Ball.vy -= accel * dt * 0.8;
                if (target.y > this.p2Ball.y) this.p2Ball.vy += accel * dt * 0.8;
                if (target.x < this.p2Ball.x) this.p2Ball.vx -= accel * dt * 0.8;
                if (target.x > this.p2Ball.x) this.p2Ball.vx += accel * dt * 0.8;
            }
        } else {
            if (Input.isDown('ArrowUp')) this.p2Ball.vy -= accel * dt;
            if (Input.isDown('ArrowDown')) this.p2Ball.vy += accel * dt;
            if (Input.isDown('ArrowLeft')) this.p2Ball.vx -= accel * dt;
            if (Input.isDown('ArrowRight')) this.p2Ball.vx += accel * dt;
        }

        // Physics Update
        for (let i = 0; i < this.balls.length; i++) {
            let b = this.balls[i];
            
            // Friction limit speed
            b.vx *= 0.98; b.vy *= 0.98;
            b.x += b.vx * dt; b.y += b.vy * dt;

            // Wall Collisions
            if (b.x < b.r) { b.x = b.r; b.vx *= -0.8; }
            if (b.x > this.width - b.r) { b.x = this.width - b.r; b.vx *= -0.8; }
            if (b.y < b.r) { b.y = b.r; b.vy *= -0.8; }
            if (b.y > this.height - b.r) { b.y = this.height - b.r; b.vy *= -0.8; }

            // Ball Collisions
            for (let j = i + 1; j < this.balls.length; j++) {
                let b2 = this.balls[j];
                let dx = b2.x - b.x; let dy = b2.y - b.y;
                let dist = Math.hypot(dx, dy);
                if (dist < b.r + b2.r) {
                    let overlap = (b.r + b2.r - dist) / 2;
                    let nx = dx / dist; let ny = dy / dist;
                    b.x -= nx * overlap; b.y -= ny * overlap;
                    b2.x += nx * overlap; b2.y += ny * overlap;

                    // Momentum exchange
                    let kx = b.vx - b2.vx; let ky = b.vy - b2.vy;
                    let p = 1.5 * (nx * kx + ny * ky) / 2; 
                    b.vx -= p * nx; b.vy -= p * ny;
                    b2.vx += p * nx; b2.vy += p * ny;
                }
            }

            // Pocket Collisions
            if (b.type === 'neutral') {
                for (let p of this.pockets) {
                    if (Math.hypot(b.x - p.x, b.y - p.y) < this.pocketRadius) {
                        // Who hit it last? (Simplified: check which side of the field it sank on)
                        if (b.x < this.width/2) this.scoreP2++; else this.scoreP1++;
                        // Remove ball and spawn a new one
                        this.balls.splice(i, 1);
                        i--;
                        this.balls.push({
                            x: this.width/2 + (Math.random() * 100 - 50),
                            y: this.height/2 + (Math.random() * 200 - 100),
                            vx: 0, vy: 0, r: 15, color: Theme.accent, type: 'neutral'
                        });
                        break;
                    }
                }
            }
        }

        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    render(ctx) {
        // Draw Field
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw Center line
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(this.width/2, 0); ctx.lineTo(this.width/2, this.height); ctx.stroke();

        // Draw Pockets
        ctx.fillStyle = "#000";
        for (let p of this.pockets) {
            ctx.beginPath(); ctx.arc(p.x, p.y, this.pocketRadius, 0, Math.PI * 2); ctx.fill();
        }

        // Draw Balls
        for (let b of this.balls) {
            ctx.fillStyle = b.color;
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            
            // Highlight shine for arcade feel
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.beginPath(); ctx.arc(b.x - b.r/3, b.y - b.r/3, b.r/4, 0, Math.PI * 2); ctx.fill();
        }
    }
}
GameManager.registerGame(new BumperPool());