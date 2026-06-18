class GameTanks extends GameBase {
    constructor() { super("Tank Duel", "WASD+Space vs Arrows+Enter. First to 5 Kills."); }
    
    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.resetRound();
    }

    resetRound() {
        this.tankP1 = { x: 80, y: this.height/2, angle: 0, cooldown: 0 };
        this.tankP2 = { x: this.width-80, y: this.height/2, angle: Math.PI, cooldown: 0 };
        this.bullets = [];
    }

    update(dt) {
        const moveSpeed = 120 * dt;
        const turnSpeed = 3 * dt;
        
        // P1 Update
        if (Input.isDown('KeyW')) { this.tankP1.x += Math.cos(this.tankP1.angle)*moveSpeed; this.tankP1.y += Math.sin(this.tankP1.angle)*moveSpeed; }
        if (Input.isDown('KeyS')) { this.tankP1.x -= Math.cos(this.tankP1.angle)*moveSpeed; this.tankP1.y -= Math.sin(this.tankP1.angle)*moveSpeed; }
        if (Input.isDown('KeyA')) this.tankP1.angle -= turnSpeed;
        if (Input.isDown('KeyD')) this.tankP1.angle += turnSpeed;
        
        if (this.tankP1.cooldown > 0) this.tankP1.cooldown -= dt;
        if (Input.isDown('Space') && this.tankP1.cooldown <= 0) {
            this.fireBullet(this.tankP1, 1);
            this.tankP1.cooldown = 0.5; // Half a second reload
        }

        // P2 Update
        if (Input.isDown('ArrowUp')) { this.tankP2.x += Math.cos(this.tankP2.angle)*moveSpeed; this.tankP2.y += Math.sin(this.tankP2.angle)*moveSpeed; }
        if (Input.isDown('ArrowDown')) { this.tankP2.x -= Math.cos(this.tankP2.angle)*moveSpeed; this.tankP2.y -= Math.sin(this.tankP2.angle)*moveSpeed; }
        if (Input.isDown('ArrowLeft')) this.tankP2.angle -= turnSpeed;
        if (Input.isDown('ArrowRight')) this.tankP2.angle += turnSpeed;
        
        if (this.tankP2.cooldown > 0) this.tankP2.cooldown -= dt;
        if (Input.isDown('Enter') && this.tankP2.cooldown <= 0) {
            this.fireBullet(this.tankP2, 2);
            this.tankP2.cooldown = 0.5;
        }

        // Wall Clamp
        this.tankP1.x = Math.max(20, Math.min(this.width-20, this.tankP1.x));
        this.tankP1.y = Math.max(20, Math.min(this.height-20, this.tankP1.y));
        this.tankP2.x = Math.max(20, Math.min(this.width-20, this.tankP2.x));
        this.tankP2.y = Math.max(20, Math.min(this.height-20, this.tankP2.y));

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            
            // Wall kill
            if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
                this.bullets.splice(i, 1); continue;
            }

            // Hit Tanks
            let target = b.owner === 1 ? this.tankP2 : this.tankP1;
            if (Math.hypot(b.x - target.x, b.y - target.y) < 25) {
                if (b.owner === 1) this.scoreP1++; else this.scoreP2++;
                this.bullets.splice(i, 1);
                
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
        }
    }

    fireBullet(tank, ownerId) {
        this.bullets.push({
            x: tank.x + Math.cos(tank.angle)*30,
            y: tank.y + Math.sin(tank.angle)*30,
            vx: Math.cos(tank.angle)*400,
            vy: Math.sin(tank.angle)*400,
            owner: ownerId
        });
    }

    render(ctx) {
        // Draw Tanks
        const drawTank = (t, color) => {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);
            ctx.fillStyle = color;
            ctx.fillRect(-20, -15, 40, 30); // Body
            ctx.fillStyle = '#000';
            ctx.fillRect(0, -5, 30, 10); // Gun barrel
            ctx.restore();
        };

        drawTank(this.tankP1, Theme.p1);
        drawTank(this.tankP2, Theme.p2);

        // Draw Bullets
        ctx.fillStyle = Theme.accent;
        for (let b of this.bullets) {
            ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI*2); ctx.fill();
        }
    }
}

GameManager.registerGame(new GameTanks());