class GameSpaceDuel extends GameBase {
    constructor() { super("Space Duel", "A/D & W to shoot. Arrows & Down to shoot. First to 5."); }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0; this.scoreP2 = 0;
        this.resetRound();
    }

    resetRound() {
        this.shipP1 = { x: this.width/2, y: this.height - 40, w: 40, h: 30, cd: 0 };
        this.shipP2 = { x: this.width/2, y: 40, w: 40, h: 30, cd: 0 };
        this.bullets = [];
    }

    update(dt) {
        const speed = 350 * dt;

        // P1 (Bottom, shoots UP)
        if (Input.isDown('KeyA')) this.shipP1.x -= speed;
        if (Input.isDown('KeyD')) this.shipP1.x += speed;
        if (this.shipP1.cd > 0) this.shipP1.cd -= dt;
        if (Input.isDown('KeyW') && this.shipP1.cd <= 0) {
            this.bullets.push({ x: this.shipP1.x, y: this.shipP1.y - 20, vy: -500, owner: 1 });
            this.shipP1.cd = 0.4;
        }

        // P2 (Top, shoots DOWN)
        if (Input.isDown('ArrowLeft')) this.shipP2.x -= speed;
        if (Input.isDown('ArrowRight')) this.shipP2.x += speed;
        if (this.shipP2.cd > 0) this.shipP2.cd -= dt;
        if (Input.isDown('ArrowDown') && this.shipP2.cd <= 0) {
            this.bullets.push({ x: this.shipP2.x, y: this.shipP2.y + 20, vy: 500, owner: 2 });
            this.shipP2.cd = 0.4;
        }

        // Clamp to screen
        this.shipP1.x = Math.max(20, Math.min(this.width - 20, this.shipP1.x));
        this.shipP2.x = Math.max(20, Math.min(this.width - 20, this.shipP2.x));

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.y += b.vy * dt;

            // Off screen
            if (b.y < 0 || b.y > this.height) {
                this.bullets.splice(i, 1); continue;
            }

            // Hit Detection
            let target = b.owner === 1 ? this.shipP2 : this.shipP1;
            if (Math.abs(b.x - target.x) < target.w/2 + 5 && Math.abs(b.y - target.y) < target.h/2 + 5) {
                if (b.owner === 1) this.scoreP1++; else this.scoreP2++;
                
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.resetRound();
                }
                return;
            }
        }
    }

    render(ctx) {
        // Draw P1
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.moveTo(this.shipP1.x, this.shipP1.y - this.shipP1.h/2);
        ctx.lineTo(this.shipP1.x - this.shipP1.w/2, this.shipP1.y + this.shipP1.h/2);
        ctx.lineTo(this.shipP1.x + this.shipP1.w/2, this.shipP1.y + this.shipP1.h/2);
        ctx.fill();

        // Draw P2
        ctx.fillStyle = Theme.p2;
        ctx.beginPath();
        ctx.moveTo(this.shipP2.x, this.shipP2.y + this.shipP2.h/2);
        ctx.lineTo(this.shipP2.x - this.shipP2.w/2, this.shipP2.y - this.shipP2.h/2);
        ctx.lineTo(this.shipP2.x + this.shipP2.w/2, this.shipP2.y - this.shipP2.h/2);
        ctx.fill();

        // Bullets
        ctx.fillStyle = Theme.accent;
        for (let b of this.bullets) {
            ctx.fillRect(b.x - 3, b.y - 8, 6, 16);
        }
    }
}
GameManager.registerGame(new GameSpaceDuel());