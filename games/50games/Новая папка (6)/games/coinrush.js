class GameCoinRush extends GameBase {
    constructor() { super("Coin Rush", "Collect 10 coins first. Push your opponent! WASD vs Arrows."); }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0; this.scoreP2 = 0;
        this.p1 = { x: 100, y: h/2, r: 20, color: Theme.p1 };
        this.p2 = { x: w-100, y: h/2, r: 20, color: Theme.p2 };
        this.spawnCoin();
    }

    spawnCoin() {
        this.coin = { 
            x: Math.random() * (this.width - 100) + 50, 
            y: Math.random() * (this.height - 100) + 50, 
            r: 10 
        };
    }

    update(dt) {
        const speed = 350 * dt;

        // P1 Movement
        if (Input.isDown('KeyW')) this.p1.y -= speed;
        if (Input.isDown('KeyS')) this.p1.y += speed;
        if (Input.isDown('KeyA')) this.p1.x -= speed;
        if (Input.isDown('KeyD')) this.p1.x += speed;

        // P2 Movement
        if (Input.isDown('ArrowUp')) this.p2.y -= speed;
        if (Input.isDown('ArrowDown')) this.p2.y += speed;
        if (Input.isDown('ArrowLeft')) this.p2.x -= speed;
        if (Input.isDown('ArrowRight')) this.p2.x += speed;

        // Player Collision (Pushing)
        let dx = this.p2.x - this.p1.x, dy = this.p2.y - this.p1.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.p1.r + this.p2.r) {
            let overlap = (this.p1.r + this.p2.r - dist) / 2;
            let nx = dx / dist, ny = dy / dist;
            this.p1.x -= nx * overlap; this.p1.y -= ny * overlap;
            this.p2.x += nx * overlap; this.p2.y += ny * overlap;
        }

        // Screen Boundaries
        const clamp = (p) => {
            p.x = Math.max(p.r, Math.min(this.width - p.r, p.x));
            p.y = Math.max(p.r, Math.min(this.height - p.r, p.y));
        }
        clamp(this.p1); clamp(this.p2);

        // Coin Collection
        if (Math.hypot(this.p1.x - this.coin.x, this.p1.y - this.coin.y) < this.p1.r + this.coin.r) {
            this.scoreP1++; this.spawnCoin();
        } else if (Math.hypot(this.p2.x - this.coin.x, this.p2.y - this.coin.y) < this.p2.r + this.coin.r) {
            this.scoreP2++; this.spawnCoin();
        }

        // Win Check
        if (this.scoreP1 >= 10 || this.scoreP2 >= 10) {
            GameManager.gameOver(this.scoreP1 >= 10 ? 1 : 2);
        }
    }

    render(ctx) {
        // Draw Coin
        ctx.fillStyle = '#f1c40f'; // Gold
        ctx.beginPath(); ctx.arc(this.coin.x, this.coin.y, this.coin.r, 0, Math.PI*2); ctx.fill();

        // Draw Players
        ctx.fillStyle = this.p1.color; ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = this.p2.color; ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.r, 0, Math.PI*2); ctx.fill();
    }
}
GameManager.registerGame(new GameCoinRush());