// asteroids-defense.js
class AsteroidsDefense extends GameBase {
    constructor() {
        super("Asteroids Defense", "Shoot asteroids! Break them toward opponent. First to 5 hits wins.");
    }

    init(w, h) {
        super.init(w, h);
        this.width = w;
        this.height = h;
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.asteroids = [];
        this.p1 = {x: 200, y: 520, shootCooldown: 0};
        this.p2 = {x: 600, y: 520, shootCooldown: 0};
        this.p1Bullets = [];
        this.p2Bullets = [];
        this.spawnTimer = 0;
    }

    update(dt) {
        this.spawnTimer += dt;
        if (this.spawnTimer > 0.9) {
            this.spawnAsteroid();
            this.spawnTimer = 0;
        }

        // P1 controls
        if (Input.isDown('KeyA')) this.p1.x -= 280 * dt;
        if (Input.isDown('KeyD')) this.p1.x += 280 * dt;
        if (Input.isDown('Space') && this.p1.shootCooldown <= 0) {
            this.p1Bullets.push({x: this.p1.x, y: this.p1.y - 20, vy: -620});
            this.p1.shootCooldown = 0.3;
        }
        this.p1.shootCooldown -= dt;

        // P2 / CPU
        if (GameManager.isSinglePlayer) {
            this.p2.x = this.p2.x * 0.7 + (this.asteroids.length ? this.asteroids[0].x : 600) * 0.3;
            if (Math.random() < 0.07 && this.p2.shootCooldown <= 0) {
                this.p2Bullets.push({x: this.p2.x, y: this.p2.y - 20, vy: -620});
                this.p2.shootCooldown = 0.35;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= 280 * dt;
            if (Input.isDown('ArrowRight')) this.p2.x += 280 * dt;
            if (Input.isDown('Enter') && this.p2.shootCooldown <= 0) {
                this.p2Bullets.push({x: this.p2.x, y: this.p2.y - 20, vy: -620});
                this.p2.shootCooldown = 0.3;
            }
        }
        this.p2.shootCooldown -= dt;

        this.clampShips();

        // Update bullets & asteroids
        this.updateEntities(dt);

        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    spawnAsteroid() {
        const side = Math.random() < 0.5 ? 1 : 2;
        this.asteroids.push({
            x: side === 1 ? 80 + Math.random() * 240 : 480 + Math.random() * 240,
            y: 40,
            size: 3,
            vx: (Math.random() - 0.5) * 60,
            vy: 110 + Math.random() * 40
        });
    }

    updateEntities(dt) {
        for (let i = this.p1Bullets.length - 1; i >= 0; i--) {
            const b = this.p1Bullets[i];
            b.y += b.vy * dt;
            if (b.y < 0) this.p1Bullets.splice(i, 1);
        }
        // same for p2Bullets...
        for (let i = this.p2Bullets.length - 1; i >= 0; i--) {
            const b = this.p2Bullets[i];
            b.y += b.vy * dt;
            if (b.y < 0) this.p2Bullets.splice(i, 1);
        }

        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const a = this.asteroids[i];
            a.x += a.vx * dt;
            a.y += a.vy * dt;

            // Hit bottom = score for opponent
            if (a.y > 560) {
                if (a.x < 400) this.scoreP2++;
                else this.scoreP1++;
                this.asteroids.splice(i, 1);
                continue;
            }

            // Collisions with bullets
            for (let j = this.p1Bullets.length - 1; j >= 0; j--) {
                const b = this.p1Bullets[j];
                if (Math.hypot(b.x - a.x, b.y - a.y) < a.size * 11) {
                    this.p1Bullets.splice(j, 1);
                    this.splitAsteroid(i, a);
                    break;
                }
            }
            // same for p2 bullets (symmetric)
            for (let j = this.p2Bullets.length - 1; j >= 0; j--) {
                const b = this.p2Bullets[j];
                if (Math.hypot(b.x - a.x, b.y - a.y) < a.size * 11) {
                    this.p2Bullets.splice(j, 1);
                    this.splitAsteroid(i, a);
                    break;
                }
            }
        }
    }

    splitAsteroid(i, a) {
        this.asteroids.splice(i, 1);
        if (a.size > 1) {
            const splitToOpponent = a.x < 400 ? 2 : 1;
            for (let k = 0; k < 2; k++) {
                this.asteroids.push({
                    x: a.x + (Math.random() - 0.5) * 20,
                    y: a.y,
                    size: a.size - 1,
                    vx: a.vx * 1.3 + (k ? 80 : -80),
                    vy: a.vy * 0.7 + (splitToOpponent === 2 ? 30 : -30)
                });
            }
        }
    }

    clampShips() {
        this.p1.x = Math.max(40, Math.min(360, this.p1.x));
        this.p2.x = Math.max(440, Math.min(760, this.p2.x));
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Ships
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x - 22, this.p1.y - 14, 44, 28);
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x - 22, this.p2.y - 14, 44, 28);

        // Bullets
        ctx.fillStyle = Theme.accent;
        for (let b of this.p1Bullets) ctx.fillRect(b.x - 3, b.y, 6, 18);
        for (let b of this.p2Bullets) ctx.fillRect(b.x - 3, b.y, 6, 18);

        // Asteroids
        ctx.fillStyle = Theme.fg;
        for (let a of this.asteroids) {
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.size * 11, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 42px sans-serif";
        ctx.fillText(this.scoreP1, 180, 80);
        ctx.fillText(this.scoreP2, 620, 80);
    }
}

GameManager.registerGame(new AsteroidsDefense());