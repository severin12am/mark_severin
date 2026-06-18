// games/towerclimb.js
class TowerClimb extends GameBase {
    constructor() {
        super("Tower Climb", "First to reach the top or last one standing wins.");
        this.resetGame();
    }

    resetGame() {
        this.platforms = [];
        this.players = [
            { x: 300, y: 500, vy: 0, color: Theme.p1, score: 0 },
            { x: 500, y: 500, vy: 0, color: Theme.p2, score: 0 }
        ];
        this.scrollSpeed = 80;
        this.highestY = 500;
        this.gameTime = 0;
        this.scoreP1 = 0;
        this.scoreP2 = 0;

        // initial platforms
        for (let i = 0; i < 12; i++) {
            this.platforms.push({
                x: Math.random() * 600 + 100,
                y: 600 - i * 80,
                width: 140 + Math.random() * 80,
                broken: false
            });
        }
    }

    init(w, h) {
        super.init(w, h);
        this.resetGame();
    }

    update(dt) {
        this.gameTime += dt;
        this.scrollSpeed = 60 + this.gameTime * 12;

        // scroll world down = players appear to climb up
        for (let p of this.platforms) {
            p.y += this.scrollSpeed * dt;
        }

        // generate new platforms at top
        while (this.platforms[0].y > -50) {
            this.platforms.unshift({
                x: Math.random() * 600 + 100,
                y: this.platforms[0].y - (60 + Math.random() * 60),
                width: 140 + Math.random() * 80,
                broken: false
            });
        }

        // remove platforms way below
        this.platforms = this.platforms.filter(p => p.y < this.height + 100);

        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            let isP1 = i === 0;
            let controls = isP1 ?
                { left: 'KeyA', right: 'KeyD', jump: 'KeyW' } :
                (GameManager.isSinglePlayer ?
                    {} : // cpu below
                    { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' });

            // input
            let ax = 0;
            if (!GameManager.isSinglePlayer || isP1) {
                if (Input.isDown(controls.left))  ax -= 1;
                if (Input.isDown(controls.right)) ax += 1;
            }

            // simple CPU logic
            if (GameManager.isSinglePlayer && !isP1) {
                let targetPlatform = this.platforms.find(pl => pl.y < p.y && Math.abs(pl.x + pl.width/2 - p.x) < 180);
                if (targetPlatform) {
                    let dx = (targetPlatform.x + targetPlatform.width/2) - p.x;
                    ax = Math.sign(dx) * 0.7;
                } else {
                    ax = Math.sin(this.gameTime * 3 + i * 2) * 0.6;
                }
            }

            p.x += ax * 220 * dt;
            p.vy += 980 * dt; // gravity
            p.y += p.vy * dt;

            // wrap around sides
            if (p.x < -30) p.x = this.width + 30;
            if (p.x > this.width + 30) p.x = -30;

            // platform collision
            let onGround = false;
            for (let pl of this.platforms) {
                if (!pl.broken &&
                    p.y + 30 > pl.y && p.y + 30 - p.vy * dt <= pl.y &&
                    p.x + 20 > pl.x && p.x - 20 < pl.x + pl.width) {
                    p.y = pl.y - 30;
                    p.vy = -380;
                    onGround = true;
                    pl.broken = Math.random() < 0.18; // some platforms break
                }
            }

            // fell off screen → lose life / point
            if (p.y > this.height + 80) {
                if (isP1) this.scoreP2++;
                else this.scoreP1++;
                GameManager.gameOver(isP1 ? 2 : 1);
                return;
            }

            // reached high enough → win
            if (p.y < 120) {
                if (isP1) this.scoreP1++;
                else this.scoreP2++;
                GameManager.gameOver(isP1 ? 1 : 2);
                return;
            }
        }
    }

    render(ctx) {
        // sky gradient simulation
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, "#0a1f3a");
        grad.addColorStop(1, Theme.bg);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // platforms
        ctx.lineWidth = 6;
        for (let p of this.platforms) {
            if (p.broken) continue;
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(p.x, p.y - 3, p.width, 12);
            ctx.strokeStyle = Theme.accent;
            ctx.strokeRect(p.x, p.y - 3, p.width, 12);
        }

        // players (simple circles + direction hint)
        for (let p of this.players) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
            ctx.fill();

            // small direction arrow when moving
            if (Math.abs(p.vy) < 100) {
                ctx.fillStyle = Theme.accent;
                ctx.beginPath();
                ctx.moveTo(p.x - 12, p.y - 38);
                ctx.lineTo(p.x + 12, p.y - 38);
                ctx.lineTo(p.x, p.y - 58);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}

GameManager.registerGame(new TowerClimb());