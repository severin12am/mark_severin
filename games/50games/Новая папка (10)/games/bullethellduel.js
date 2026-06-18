// games/bullethellduel.js
class BulletHellDuel extends GameBase {
    constructor() {
        super("Bullet Hell Duel", "Dodge bouncing bullets — last player alive wins.");
        this.reset();
    }

    reset() {
        this.players = [
            { x: 250, y: 300, color: Theme.p1, alive: true },
            { x: 550, y: 300, color: Theme.p2, alive: true }
        ];
        this.bullets = [];
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.time = 0;
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        this.time += dt;

        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            if (!p.alive) continue;

            let speed = 260;
            let dx = 0, dy = 0;

            if (i === 0 || !GameManager.isSinglePlayer) {
                if (Input.isDown(i === 0 ? 'KeyA' : 'ArrowLeft')) dx -= 1;
                if (Input.isDown(i === 0 ? 'KeyD' : 'ArrowRight')) dx += 1;
                if (Input.isDown(i === 0 ? 'KeyW' : 'ArrowUp')) dy -= 1;
                if (Input.isDown(i === 0 ? 'KeyS' : 'ArrowDown')) dy += 1;
            }

            if (GameManager.isSinglePlayer && i === 1) {
                // CPU dodges nearest bullet
                let closest = this.bullets.reduce((a,b) => 
                    Math.hypot(a.x-p.x,a.y-p.y) < Math.hypot(b.x-p.x,b.y-p.y) ? a : b, {x:400,y:200});
                dx = p.x - closest.x;
                dy = p.y - closest.y;
            }

            let len = Math.hypot(dx, dy) || 1;
            p.x += (dx / len) * speed * dt;
            p.y += (dy / len) * speed * dt;

            p.x = Math.max(40, Math.min(this.width - 40, p.x));
            p.y = Math.max(40, Math.min(this.height - 40, p.y));
        }

        // spawn bullets
        if (this.bullets.length < 18 && Math.random() < 0.08) {
            let angle = Math.random() * Math.PI * 2;
            this.bullets.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: Math.cos(angle) * (180 + this.time * 12),
                vy: Math.sin(angle) * (180 + this.time * 12)
            });
        }

        for (let b of this.bullets) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            if (b.x < 0 || b.x > this.width) b.vx *= -1;
            if (b.y < 0 || b.y > this.height) b.vy *= -1;

            // hit check
            for (let i = 0; i < 2; i++) {
                let p = this.players[i];
                if (!p.alive) continue;
                if (Math.hypot(b.x - p.x, b.y - p.y) < 32) {
                    p.alive = false;
                    if (i === 0) {
                        this.scoreP2++;
                        GameManager.gameOver(2);
                    } else {
                        this.scoreP1++;
                        GameManager.gameOver(1);
                    }
                    return;
                }
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // bullets
        ctx.fillStyle = Theme.accent;
        for (let b of this.bullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
            ctx.fill();
        }

        // players
        for (let p of this.players) {
            if (!p.alive) continue;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 29, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

GameManager.registerGame(new BulletHellDuel());