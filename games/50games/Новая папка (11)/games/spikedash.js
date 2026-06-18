// games/spikedash.js
class SpikeDash extends GameBase {
    constructor() {
        super("Spike Dash", "Survive longer than your opponent — first to crash loses.");
        this.reset();
    }

    reset() {
        this.time = 0;
        this.speed = 280;
        this.players = [
            { x: 220, y: 240, dead: false, color: Theme.p1 },
            { x: 580, y: 360, dead: false, color: Theme.p2 }
        ];
        this.obstacles = [];
        this.lastObstacleX = 900;
        this.scoreP1 = 0;
        this.scoreP2 = 0;
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        if (this.players[0].dead && this.players[1].dead) return;

        this.time += dt;
        this.speed = 280 + this.time * 110;

        // generate obstacles
        this.lastObstacleX += this.speed * dt;
        if (this.lastObstacleX > 360) {
            this.lastObstacleX = 0;
            let gapY = 140 + Math.random() * 320;
            let gapH = 160 + Math.random() * 80;
            this.obstacles.push({ x: this.width + 60, top: gapY, height: gapH });
        }

        this.obstacles.forEach(o => {
            o.x -= this.speed * dt;
        });
        this.obstacles = this.obstacles.filter(o => o.x > -80);

        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            if (p.dead) continue;

            let jumpKey = i === 0 ? 'KeyW' : (GameManager.isSinglePlayer ? null : 'ArrowUp');

            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(jumpKey) && p.y > 100) {
                p.y -= 380 * dt;
            } else {
                p.y += 520 * dt; // fall
            }

            p.y = Math.max(60, Math.min(this.height - 60, p.y));

            // collision
            for (let o of this.obstacles) {
                if (o.x < p.x + 34 && o.x + 60 > p.x - 34) {
                    if (p.y - 34 < o.top || p.y + 34 > o.top + o.height) {
                        p.dead = true;
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

            // CPU simple jump logic
            if (GameManager.isSinglePlayer && i === 1 && !p.dead) {
                let nextObs = this.obstacles.find(o => o.x > p.x - 80 && o.x < p.x + 300);
                if (nextObs && p.y > nextObs.top + 40 && p.y < nextObs.top + nextObs.height - 40) {
                    if (Math.random() < 0.7) p.y -= 420 * dt;
                }
            }
        }

        // both dead = draw (rare)
        if (this.players[0].dead && this.players[1].dead) {
            GameManager.gameOver(0);
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // obstacles (spikes top & bottom)
        ctx.fillStyle = "#933";
        for (let o of this.obstacles) {
            // top spikes
            ctx.fillRect(o.x, 0, 60, o.top);
            // bottom spikes
            ctx.fillRect(o.x, o.top + o.height, 60, this.height - o.top - o.height);
        }

        // players
        for (let p of this.players) {
            if (p.dead) continue;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
            ctx.fill();

            if (p.y < 120 || p.y > this.height - 120) {
                ctx.strokeStyle = Theme.accent;
                ctx.lineWidth = 6;
                ctx.stroke();
            }
        }
    }
}

GameManager.registerGame(new SpikeDash());