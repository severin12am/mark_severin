// games/shurikendeflect.js
class ShurikenDeflect extends GameBase {
    constructor() {
        super("Shuriken Deflect", "Throw and parry bouncing ninja stars — last one standing wins.");
        this.reset();
    }

    reset() {
        this.players = [
            { x: 250, y: 300, vx: 0, vy: 0, color: Theme.p1, alive: true },
            { x: 550, y: 300, vx: 0, vy: 0, color: Theme.p2, alive: true }
        ];
        this.stars = [];
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.speedMultiplier = 1;
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        this.speedMultiplier = 1 + (Date.now() % 8000) / 8000; // slowly gets harder

        // player movement
        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            if (!p.alive) continue;

            let speed = 240;
            let ax = 0, ay = 0;

            if (i === 0 || !GameManager.isSinglePlayer) {
                if (Input.isDown(i === 0 ? 'KeyA' : 'ArrowLeft'))  ax -= 1;
                if (Input.isDown(i === 0 ? 'KeyD' : 'ArrowRight')) ax += 1;
                if (Input.isDown(i === 0 ? 'KeyW' : 'ArrowUp'))    ay -= 1;
                if (Input.isDown(i === 0 ? 'KeyS' : 'ArrowDown'))  ay += 1;
            }

            // CPU follows nearest star + random dodge
            if (GameManager.isSinglePlayer && i === 1) {
                let closest = this.stars.reduce((a, b) => 
                    Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b, this.stars[0] || {x:400,y:200});
                ax = (closest.x - p.x) * 0.006;
                ay = (closest.y - p.y) * 0.006;
            }

            p.vx = ax * speed;
            p.vy = ay * speed;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.x = Math.max(40, Math.min(this.width - 40, p.x));
            p.y = Math.max(40, Math.min(this.height - 40, p.y));
        }

        // spawn stars
        if (this.stars.length < 5 && Math.random() < 0.035) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 420 * this.speedMultiplier,
                vy: (Math.random() - 0.5) * 420 * this.speedMultiplier,
                size: 18
            });
        }

        // update stars
        for (let s of this.stars) {
            s.x += s.vx * dt;
            s.y += s.vy * dt;

            // bounce
            if (s.x < 30 || s.x > this.width - 30) s.vx *= -1;
            if (s.y < 30 || s.y > this.height - 30) s.vy *= -1;

            // player collision
            for (let i = 0; i < 2; i++) {
                let p = this.players[i];
                if (!p.alive) continue;
                if (Math.hypot(p.x - s.x, p.y - s.y) < 42) {
                    // parry attempt
                    let dx = p.x - s.x;
                    let dy = p.y - s.y;
                    let len = Math.hypot(dx, dy) || 1;
                    if ((i === 0 && Input.isDown('Space')) || (i === 1 && (GameManager.isSinglePlayer ? Math.random() < 0.4 : Input.isDown('Enter')))) {
                        // successful parry — reflect and speed up
                        s.vx = (dx / len) * 580;
                        s.vy = (dy / len) * 580;
                        this.speedMultiplier += 0.15;
                    } else {
                        // hit!
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

        // both dead = draw
        if (!this.players[0].alive && !this.players[1].alive) GameManager.gameOver(0);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // stars (ninja stars)
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 5;
        for (let s of this.stars) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(Math.atan2(s.vy, s.vx));
            ctx.beginPath();
            ctx.moveTo(0, -s.size);
            ctx.lineTo(8, 6);
            ctx.lineTo(-8, 6);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // players
        for (let p of this.players) {
            if (!p.alive) continue;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 32, 0, Math.PI * 2);
            ctx.fill();

            // parry flash
            if ((p.color === Theme.p1 && Input.isDown('Space')) || 
                (p.color === Theme.p2 && ((GameManager.isSinglePlayer && Math.random() < 0.2) || Input.isDown('Enter')))) {
                ctx.strokeStyle = Theme.accent;
                ctx.lineWidth = 9;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 46, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
}

GameManager.registerGame(new ShurikenDeflect());