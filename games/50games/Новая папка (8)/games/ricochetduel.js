class RicochetDuel extends GameBase {
    constructor() { super("Ricochet Duel", "Shoot bouncing bullets. First to 5 wins."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 100, y: this.height / 2, size: 20, cd: 0, lastDx: 1, lastDy: 0 };
        this.p2 = { x: this.width - 100, y: this.height / 2, size: 20, cd: 0, lastDx: -1, lastDy: 0 };
        this.bullets =[];
    }
    update(dt) {
        let speed = 4;
        this.p1.cd--; this.p2.cd--;

        // P1 Input
        let p1Moved = false;
        if (Input.isDown('KeyW')) { this.p1.y -= speed; this.p1.lastDy = -1; this.p1.lastDx = 0; p1Moved = true; }
        if (Input.isDown('KeyS')) { this.p1.y += speed; this.p1.lastDy = 1; this.p1.lastDx = 0; p1Moved = true; }
        if (Input.isDown('KeyA')) { this.p1.x -= speed; this.p1.lastDx = -1; this.p1.lastDy = 0; p1Moved = true; }
        if (Input.isDown('KeyD')) { this.p1.x += speed; this.p1.lastDx = 1; this.p1.lastDy = 0; p1Moved = true; }
        if (Input.isDown('Space') && this.p1.cd <= 0) {
            this.bullets.push({ x: this.p1.x, y: this.p1.y, vx: this.p1.lastDx * 7, vy: this.p1.lastDy * 7, bounces: 3, owner: 1 });
            this.p1.cd = 30;
        }

        // P2 Input / AI
        let p2Moved = false;
        if (GameManager.isSinglePlayer) {
            let dy = this.p1.y - this.p2.y;
            if (dy > 10) { this.p2.y += speed; this.p2.lastDy = 1; this.p2.lastDx = 0; p2Moved = true; }
            else if (dy < -10) { this.p2.y -= speed; this.p2.lastDy = -1; this.p2.lastDx = 0; p2Moved = true; }
            else { this.p2.lastDx = -1; this.p2.lastDy = 0; }
            if (Math.abs(dy) < 30 && this.p2.cd <= 0) {
                this.bullets.push({ x: this.p2.x, y: this.p2.y, vx: this.p2.lastDx * 7, vy: this.p2.lastDy * 7, bounces: 3, owner: 2 });
                this.p2.cd = 40;
            }
        } else {
            if (Input.isDown('ArrowUp')) { this.p2.y -= speed; this.p2.lastDy = -1; this.p2.lastDx = 0; p2Moved = true; }
            if (Input.isDown('ArrowDown')) { this.p2.y += speed; this.p2.lastDy = 1; this.p2.lastDx = 0; p2Moved = true; }
            if (Input.isDown('ArrowLeft')) { this.p2.x -= speed; this.p2.lastDx = -1; this.p2.lastDy = 0; p2Moved = true; }
            if (Input.isDown('ArrowRight')) { this.p2.x += speed; this.p2.lastDx = 1; this.p2.lastDy = 0; p2Moved = true; }
            if (Input.isDown('Enter') && this.p2.cd <= 0) {
                this.bullets.push({ x: this.p2.x, y: this.p2.y, vx: this.p2.lastDx * 7, vy: this.p2.lastDy * 7, bounces: 3, owner: 2 });
                this.p2.cd = 30;
            }
        }

        // Constraints[this.p1, this.p2].forEach(p => {
            p.x = Math.max(p.size, Math.min(this.width - p.size, p.x));
            p.y = Math.max(p.size, Math.min(this.height - p.size, p.y));
        });

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx; b.y += b.vy;
            if (b.x < 5 || b.x > this.width - 5) { b.vx *= -1; b.bounces--; }
            if (b.y < 5 || b.y > this.height - 5) { b.vy *= -1; b.bounces--; }
            
            if (b.bounces < 0) { this.bullets.splice(i, 1); continue; }

            // Hit P1
            if (Math.hypot(b.x - this.p1.x, b.y - this.p1.y) < this.p1.size + 5) {
                this.scoreP2++; if (this.scoreP2 >= 5) GameManager.gameOver(2); else this.resetRound();
                break;
            }
            // Hit P2
            if (Math.hypot(b.x - this.p2.x, b.y - this.p2.y) < this.p2.size + 5) {
                this.scoreP1++; if (this.scoreP1 >= 5) GameManager.gameOver(1); else this.resetRound();
                break;
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x - this.p1.size/2, this.p1.y - this.p1.size/2, this.p1.size, this.p1.size);
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x - this.p2.size/2, this.p2.y - this.p2.size/2, this.p2.size, this.p2.size);
        ctx.fillStyle = Theme.accent;
        this.bullets.forEach(b => {
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
        });
    }
}
GameManager.registerGame(new RicochetDuel());