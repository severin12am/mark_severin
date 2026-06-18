class GameSumo extends GameBase {
    constructor() { super("Sumo", "Push the other player out of the circle! First to 3."); }
    
    init(w, h) {
        super.init(w, h);
        this.arenaR = 250;
        this.playerR = 30;
        
        // Reset Scores on fresh load
        if (!this.scoreP1 && !this.scoreP2) {
            this.scoreP1 = 0; this.scoreP2 = 0;
        }

        this.resetPlayers();
    }

    resetPlayers() {
        this.p1 = { x: this.width/2 - 100, y: this.height/2, vx: 0, vy: 0, angle: 0 }; 
        this.p2 = { x: this.width/2 + 100, y: this.height/2, vx: 0, vy: 0, angle: Math.PI };
    }

    update(dt) {
        const turnSpeed = 4 * dt;
        const pushForce = 600 * dt;

        // P1 Controls (A/D turn, W pushes forward)
        if (Input.isDown('KeyW')) {
            this.p1.vx += Math.cos(this.p1.angle) * pushForce;
            this.p1.vy += Math.sin(this.p1.angle) * pushForce;
        }
        if (Input.isDown('KeyA')) this.p1.angle -= turnSpeed;
        if (Input.isDown('KeyD')) this.p1.angle += turnSpeed;

        // P2 Controls (Left/Right turn, Up pushes forward)
        if (Input.isDown('ArrowUp')) {
            this.p2.vx += Math.cos(this.p2.angle) * pushForce;
            this.p2.vy += Math.sin(this.p2.angle) * pushForce;
        }
        if (Input.isDown('ArrowLeft')) this.p2.angle -= turnSpeed;
        if (Input.isDown('ArrowRight')) this.p2.angle += turnSpeed;

        // Apply Velocity & Friction
        const friction = 0.94;
        this.p1.x += this.p1.vx * dt; this.p1.y += this.p1.vy * dt;
        this.p1.vx *= friction; this.p1.vy *= friction;

        this.p2.x += this.p2.vx * dt; this.p2.y += this.p2.vy * dt;
        this.p2.vx *= friction; this.p2.vy *= friction;

        // Player Collision (Elastic push)
        let dx = this.p2.x - this.p1.x;
        let dy = this.p2.y - this.p1.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < this.playerR * 2) {
            let nx = dx / dist, ny = dy / dist;
            let sep = ((this.playerR * 2) - dist) / 2;
            
            this.p1.x -= nx * sep; this.p1.y -= ny * sep;
            this.p2.x += nx * sep; this.p2.y += ny * sep;

            // Momentum transfer
            let vRel = (this.p1.vx - this.p2.vx) * nx + (this.p1.vy - this.p2.vy) * ny;
            if (vRel > 0) {
                let impulse = vRel * 0.8; 
                this.p1.vx -= nx * impulse; this.p1.vy -= ny * impulse;
                this.p2.vx += nx * impulse; this.p2.vy += ny * impulse;
            }
        }

        // Out of Bounds Logic
        const checkOut = (p) => Math.hypot(p.x - this.width/2, p.y - this.height/2) > this.arenaR + this.playerR;
        
        if (checkOut(this.p1)) {
            this.scoreP2++;
            if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else this.resetPlayers();
        } else if (checkOut(this.p2)) {
            this.scoreP1++;
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else this.resetPlayers();
        }
    }

    render(ctx) {
        // Arena
        ctx.strokeStyle = Theme.fg; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(this.width/2, this.height/2, this.arenaR, 0, Math.PI*2); ctx.stroke();

        // Draw Player Function
        const drawSumo = (p, color) => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0, 0, this.playerR, 0, Math.PI*2); ctx.fill();
            // Face/Direction Indicator
            ctx.fillStyle = '#000';
            ctx.fillRect(10, -10, 15, 20); 
            ctx.restore();
        };

        drawSumo(this.p1, Theme.p1);
        drawSumo(this.p2, Theme.p2);
    }
}

GameManager.registerGame(new GameSumo());