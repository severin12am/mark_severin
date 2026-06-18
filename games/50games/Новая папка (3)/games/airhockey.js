class GameAirHockey extends GameBase {
    constructor() { 
        super("Air Hockey", "First to 7 goals. WASD vs Arrows to move mallets."); 
    }
    
    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        
        this.goalW = 160;
        this.friction = 0.99; 
        
        this.puck = { x: w/2, y: h/2, vx: 0, vy: 0, r: 15 };
        this.malletP1 = { x: 50, y: h/2, r: 35, color: Theme.p1 };
        this.malletP2 = { x: w-50, y: h/2, r: 35, color: Theme.p2 };
    }

    resetPuck(scorer) {
        this.puck.x = this.width / 2;
        this.puck.y = this.height / 2;
        this.puck.vx = 0;
        this.puck.vy = 0;
        
        // Reset mallets
        this.malletP1.x = 100; this.malletP1.y = this.height / 2;
        this.malletP2.x = this.width - 100; this.malletP2.y = this.height / 2;

        if (this.scoreP1 >= 7 || this.scoreP2 >= 7) {
            GameManager.gameOver(this.scoreP1 >= 7 ? 1 : 2);
        }
    }

    update(dt) {
        const speed = 400 * dt;

        // P1 Movement (Restricted to left half)
        if (Input.isDown('KeyW')) this.malletP1.y -= speed;
        if (Input.isDown('KeyS')) this.malletP1.y += speed;
        if (Input.isDown('KeyA')) this.malletP1.x -= speed;
        if (Input.isDown('KeyD')) this.malletP1.x += speed;

        // P2 Movement (Restricted to right half)
        if (Input.isDown('ArrowUp')) this.malletP2.y -= speed;
        if (Input.isDown('ArrowDown')) this.malletP2.y += speed;
        if (Input.isDown('ArrowLeft')) this.malletP2.x -= speed;
        if (Input.isDown('ArrowRight')) this.malletP2.x += speed;

        // Clamp Mallets
        const clamp = (m, minX, maxX) => {
            m.x = Math.max(minX + m.r, Math.min(maxX - m.r, m.x));
            m.y = Math.max(m.r, Math.min(this.height - m.r, m.y));
        };
        clamp(this.malletP1, 0, this.width / 2 - 5);
        clamp(this.malletP2, this.width / 2 + 5, this.width);

        // Puck Physics
        this.puck.vx *= this.friction;
        this.puck.vy *= this.friction;
        this.puck.x += this.puck.vx * dt;
        this.puck.y += this.puck.vy * dt;

        // Top/Bottom Walls
        if (this.puck.y < this.puck.r) { this.puck.y = this.puck.r; this.puck.vy *= -1; }
        if (this.puck.y > this.height - this.puck.r) { this.puck.y = this.height - this.puck.r; this.puck.vy *= -1; }

        // Left/Right Walls & Goals
        let gyTop = this.height / 2 - this.goalW / 2;
        let gyBot = this.height / 2 + this.goalW / 2;

        if (this.puck.x < this.puck.r) {
            if (this.puck.y > gyTop && this.puck.y < gyBot) {
                this.scoreP2++; this.resetPuck(2); return;
            } else {
                this.puck.x = this.puck.r; this.puck.vx *= -1;
            }
        } else if (this.puck.x > this.width - this.puck.r) {
            if (this.puck.y > gyTop && this.puck.y < gyBot) {
                this.scoreP1++; this.resetPuck(1); return;
            } else {
                this.puck.x = this.width - this.puck.r; this.puck.vx *= -1;
            }
        }

        // Collisions
        this.checkMalletCollision(this.malletP1);
        this.checkMalletCollision(this.malletP2);
    }

    checkMalletCollision(m) {
        let dx = this.puck.x - m.x;
        let dy = this.puck.y - m.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < this.puck.r + m.r) {
            let nx = dx / dist;
            let ny = dy / dist;
            
            // Push out of overlap
            let overlap = (this.puck.r + m.r) - dist;
            this.puck.x += nx * overlap;
            this.puck.y += ny * overlap;

            // Bounce calculation
            let dot = this.puck.vx * nx + this.puck.vy * ny;
            this.puck.vx -= 2 * dot * nx;
            this.puck.vy -= 2 * dot * ny;

            // Add hit impulse
            this.puck.vx += nx * 300;
            this.puck.vy += ny * 300;
        }
    }

    render(ctx) {
        // Table Lines
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.width/2, 0); ctx.lineTo(this.width/2, this.height);
        ctx.stroke();
        
        ctx.beginPath(); ctx.arc(this.width/2, this.height/2, 80, 0, Math.PI*2); ctx.stroke();

        // Goals
        let gy = this.height/2 - this.goalW/2;
        ctx.fillStyle = Theme.p2; ctx.fillRect(0, gy, 10, this.goalW); // P1 goal (p2 scores here)
        ctx.fillStyle = Theme.p1; ctx.fillRect(this.width-10, gy, 10, this.goalW); // P2 goal

        // Mallets
        ctx.fillStyle = this.malletP1.color;
        ctx.beginPath(); ctx.arc(this.malletP1.x, this.malletP1.y, this.malletP1.r, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = this.malletP2.color;
        ctx.beginPath(); ctx.arc(this.malletP2.x, this.malletP2.y, this.malletP2.r, 0, Math.PI*2); ctx.fill();

        // Puck
        ctx.fillStyle = Theme.fg;
        ctx.beginPath(); ctx.arc(this.puck.x, this.puck.y, this.puck.r, 0, Math.PI*2); ctx.fill();
    }
}

GameManager.registerGame(new GameAirHockey());