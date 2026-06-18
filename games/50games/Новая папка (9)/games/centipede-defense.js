// centipede-defense.js
class CentipedeDefense extends GameBase {
    constructor() {
        super("Centipede Defense", "Shoot the advancing centipede! Destroy segments faster than your opponent. First to 25 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }

        this.p1 = {x: 180, y: h - 55, w: 26, h: 18};
        this.p2 = {x: 620, y: h - 55, w: 26, h: 18};

        this.bullets = [];
        this.centipede = [];
        this.spawnCentipede();

        this.speedMultiplier = 1.0;
    }

    spawnCentipede() {
        this.centipede = [];
        const segCount = 12;
        for (let i = 0; i < segCount; i++) {
            this.centipede.push({
                x: 120 + i * 28,
                y: 80,
                vx: 110 * this.speedMultiplier,
                alive: true,
                isHead: i === 0
            });
        }
    }

    update(dt) {
        // P1 shoot
        if (Input.isPressed('Space') && !this.lastP1Shot) {
            this.bullets.push({x: this.p1.x + 13, y: this.p1.y, vy: -520, owner: 1});
            this.lastP1Shot = true;
        }
        if (!Input.isDown('Space')) this.lastP1Shot = false;

        // P2 / CPU
        if (GameManager.isSinglePlayer) {
            // CPU aims at head or closest segment
            let targetSeg = this.centipede.find(s => s.alive && s.isHead) || this.centipede[0];
            if (targetSeg && Math.random() < 0.065) {
                this.bullets.push({x: this.p2.x + 13, y: this.p2.y, vy: -490, owner: 2});
            }
            // CPU movement
            const avgX = this.centipede.reduce((sum, s) => sum + (s.alive ? s.x : 0), 0) / this.centipede.filter(s => s.alive).length;
            if (this.p2.x + 13 < avgX - 40) this.p2.x += 240 * dt;
            if (this.p2.x + 13 > avgX + 40) this.p2.x -= 240 * dt;
        } else {
            if (Input.isPressed('Enter') && !this.lastP2Shot) {
                this.bullets.push({x: this.p2.x + 13, y: this.p2.y, vy: -520, owner: 2});
                this.lastP2Shot = true;
            }
            if (!Input.isDown('Enter')) this.lastP2Shot = false;

            if (Input.isDown('ArrowLeft')) this.p2.x -= 280 * dt;
            if (Input.isDown('ArrowRight')) this.p2.x += 280 * dt;
        }

        // Clamp players
        this.p1.x = Math.max(30, Math.min(this.width / 2 - 60, this.p1.x));
        this.p2.x = Math.max(this.width / 2 + 30, Math.min(this.width - 60, this.p2.x));

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.y += b.vy * dt;

            if (b.y < 30) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Hit centipede
            for (let s of this.centipede) {
                if (!s.alive) continue;
                if (Math.hypot(b.x - s.x - 14, b.y - s.y - 12) < 22) {
                    s.alive = false;
                    if (b.owner === 1) this.scoreP1 += s.isHead ? 4 : 2;
                    else this.scoreP2 += s.isHead ? 4 : 2;

                    this.bullets.splice(i, 1);

                    // Speed up
                    this.speedMultiplier = Math.min(2.4, this.speedMultiplier + 0.07);
                    break;
                }
            }
        }

        // Update centipede
        let aliveCount = 0;
        let head = null;
        for (let s of this.centipede) {
            if (!s.alive) continue;
            aliveCount++;
            if (s.isHead) head = s;

            s.x += s.vx * dt;

            // Edge turn
            if ((s.vx > 0 && s.x > this.width - 70) || (s.vx < 0 && s.x < 70)) {
                s.vx = -s.vx;
                s.y += 34;
            }
        }

        if (aliveCount === 0) {
            this.speedMultiplier += 0.25;
            this.spawnCentipede();
        }

        if (this.scoreP1 >= 25) GameManager.gameOver(1);
        if (this.scoreP2 >= 25) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Centipede
        for (let s of this.centipede) {
            if (!s.alive) continue;
            ctx.fillStyle = s.isHead ? Theme.accent : Theme.fg;
            ctx.fillRect(s.x, s.y, 28, 24);
            ctx.fillStyle = Theme.bg;
            ctx.fillRect(s.x + 7, s.y + 7, 14, 8);
        }

        // Players (cannons)
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x, this.p1.y, this.p1.w, this.p1.h);
        ctx.fillRect(this.p1.x + 8, this.p1.y - 12, 10, 16);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x, this.p2.y, this.p2.w, this.p2.h);
        ctx.fillRect(this.p2.x + 8, this.p2.y - 12, 10, 16);

        // Bullets
        ctx.fillStyle = Theme.accent;
        for (let b of this.bullets) {
            ctx.fillRect(b.x - 3, b.y - 9, 6, 18);
        }

        // HUD
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "left";
        ctx.fillText(this.scoreP1, 55, 52);
        ctx.textAlign = "right";
        ctx.fillText(this.scoreP2, this.width - 55, 52);
    }
}

GameManager.registerGame(new CentipedeDefense());