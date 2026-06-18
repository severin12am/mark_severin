class GameDodge extends GameBase {
    constructor() { super("Dodge Survival", "WASD / Arrows to dodge the flying blocks! First to 3 wins."); }

    init(w, h) {
        super.init(w, h);
        if (!this.scoreP1 && !this.scoreP2) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: this.width/2 - 50, y: this.height/2, r: 15, dead: false };
        this.p2 = { x: this.width/2 + 50, y: this.height/2, r: 15, dead: false };
        this.enemies = [];
        this.spawnTimer = 1.0;
        this.difficulty = 1.0;
    }

    update(dt) {
        const speed = 250 * dt;

        // P1 Movement
        if (!this.p1.dead) {
            if (Input.isDown('KeyW')) this.p1.y -= speed;
            if (Input.isDown('KeyS')) this.p1.y += speed;
            if (Input.isDown('KeyA')) this.p1.x -= speed;
            if (Input.isDown('KeyD')) this.p1.x += speed;
        }

        // P2 Movement
        if (!this.p2.dead) {
            if (Input.isDown('ArrowUp')) this.p2.y -= speed;
            if (Input.isDown('ArrowDown')) this.p2.y += speed;
            if (Input.isDown('ArrowLeft')) this.p2.x -= speed;
            if (Input.isDown('ArrowRight')) this.p2.x += speed;
        }

        // Clamp to screen
        const clamp = (p) => {
            p.x = Math.max(p.r, Math.min(this.width - p.r, p.x));
            p.y = Math.max(p.r, Math.min(this.height - p.r, p.y));
        };
        clamp(this.p1); clamp(this.p2);

        // Spawn Enemies
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            let side = Math.floor(Math.random() * 4);
            let ex, ey, evx = 0, evy = 0;
            let espeed = 200 * this.difficulty;
            
            if (side === 0) { ex = Math.random()*this.width; ey = -20; evy = espeed; } // Top
            if (side === 1) { ex = Math.random()*this.width; ey = this.height+20; evy = -espeed; } // Bot
            if (side === 2) { ex = -20; ey = Math.random()*this.height; evx = espeed; } // Left
            if (side === 3) { ex = this.width+20; ey = Math.random()*this.height; evx = -espeed; } // Right

            this.enemies.push({ x: ex, y: ey, vx: evx, vy: evy, size: Math.random()*15 + 10 });
            this.spawnTimer = Math.max(0.2, 1.0 - (this.difficulty - 1.0));
            this.difficulty += 0.05; // Game gets harder over time
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            e.x += e.vx * dt;
            e.y += e.vy * dt;

            // Hit Player
            const hit = (p) => !p.dead && Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.size/2;
            if (hit(this.p1)) this.p1.dead = true;
            if (hit(this.p2)) this.p2.dead = true;

            // Remove off-screen
            if (e.x < -50 || e.x > this.width+50 || e.y < -50 || e.y > this.height+50) {
                this.enemies.splice(i, 1);
            }
        }

        // Round Logic
        if (this.p1.dead || this.p2.dead) {
            if (this.p1.dead && !this.p2.dead) this.scoreP2++;
            else if (this.p2.dead && !this.p1.dead) this.scoreP1++;

            if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
            } else {
                this.resetRound();
            }
        }
    }

    render(ctx) {
        // Draw Players
        if (!this.p1.dead) { ctx.fillStyle = Theme.p1; ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.r, 0, Math.PI*2); ctx.fill(); }
        if (!this.p2.dead) { ctx.fillStyle = Theme.p2; ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.r, 0, Math.PI*2); ctx.fill(); }

        // Draw Enemies
        ctx.fillStyle = Theme.fg;
        for (let e of this.enemies) {
            ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
        }
    }
}
GameManager.registerGame(new GameDodge());