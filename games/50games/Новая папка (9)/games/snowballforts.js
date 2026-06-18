// games/snowballforts.js
class SnowballForts extends GameBase {
    constructor() {
        super("Snowball Forts", "Build ice walls and lob snowballs — first to 5 hits wins.");
        this.reset();
    }

    reset() {
        this.players = [
            { x: 180, y: 300, color: Theme.p1, score: 0, dir: 1 },
            { x: 620, y: 300, color: Theme.p2, score: 0, dir: -1 }
        ];
        this.snowballs = [];
        this.walls = []; // {x,y,width,height}
        this.hits = [0, 0];
        this.scoreP1 = 0;
        this.scoreP2 = 0;
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        // movement
        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            let left = i === 0 ? 'KeyA' : 'ArrowLeft';
            let right = i === 0 ? 'KeyD' : 'ArrowRight';
            let build = i === 0 ? 'KeyS' : 'ArrowDown';
            let throwKey = i === 0 ? 'Space' : 'Enter';

            if (Input.isDown(left)) p.x -= 180 * dt;
            if (Input.isDown(right)) p.x += 180 * dt;
            p.x = Math.max(80, Math.min(this.width - 80, p.x));

            // CPU moves toward center and builds
            if (GameManager.isSinglePlayer && i === 1) {
                p.x += Math.sin(Date.now()/400) * 70 * dt;
                if (Math.random() < 0.03) this.buildWall(p);
            }

            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(build)) {
                if (Math.random() < 0.2) this.buildWall(p);
            }

            // throw snowball
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(throwKey) && Math.random() < 0.15) {
                this.snowballs.push({
                    x: p.x,
                    y: p.y - 20,
                    vx: p.dir * (420 + Math.random() * 80),
                    vy: (Math.random() - 0.7) * 120,
                    owner: i
                });
            }
        }

        // update snowballs
        for (let i = this.snowballs.length - 1; i >= 0; i--) {
            let s = this.snowballs[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 280 * dt;

            // wall collision
            for (let w of this.walls) {
                if (s.x > w.x && s.x < w.x + w.width &&
                    s.y > w.y && s.y < w.y + w.height) {
                    this.snowballs.splice(i, 1);
                    break;
                }
            }

            // hit opponent
            for (let j = 0; j < 2; j++) {
                let p = this.players[j];
                if (Math.hypot(s.x - p.x, s.y - p.y) < 38 && s.owner !== j) {
                    this.hits[j]++;
                    this.snowballs.splice(i, 1);
                    if (this.hits[j] >= 5) {
                        if (j === 0) this.scoreP2++; else this.scoreP1++;
                        GameManager.gameOver(j === 0 ? 2 : 1);
                    }
                    break;
                }
            }

            if (s.x < -50 || s.x > this.width + 50) this.snowballs.splice(i, 1);
        }
    }

    buildWall(p) {
        this.walls.push({
            x: p.x + (Math.random() - 0.5) * 60,
            y: p.y + 30,
            width: 90,
            height: 26
        });
        if (this.walls.length > 12) this.walls.shift();
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // walls (ice)
        ctx.fillStyle = "#a0f0ff";
        for (let w of this.walls) {
            ctx.fillRect(w.x, w.y, w.width, w.height);
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 4;
            ctx.strokeRect(w.x, w.y, w.width, w.height);
        }

        // snowballs
        ctx.fillStyle = "#fff";
        for (let s of this.snowballs) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        // players
        for (let p of this.players) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 28, p.y - 44, 56, 70); // body
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(p.x - 18, p.y - 60, 36, 22); // hat
        }
    }
}

GameManager.registerGame(new SnowballForts());