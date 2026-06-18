class SkyJoust extends GameBase {
    constructor() { super("Sky Joust", "Hit opponent from above! First to 5 wins."); }
    
    init(w, h) {
        super.init(w, h);
        this.scoreP1 = this.scoreP1 || 0;
        this.scoreP2 = this.scoreP2 || 0;
        this.spawnPlayers();
        this.particles = [];
    }

    spawnPlayers() {
        this.p1 = { x: this.width * 0.2, y: this.height - 50, vx: 0, vy: 0, s: 30 };
        this.p2 = { x: this.width * 0.8, y: this.height - 50, vx: 0, vy: 0, s: 30 };
    }

    update(dt) {
        let delta = dt > 0.5 ? dt / 1000 : dt; // Normalize dt to seconds

        // Gravity & Friction
        const gravity = 800;
        const flapStrength = -400;
        const speed = 300;
        const friction = 0.95;

        // P1 Input
        if (Input.isDown('KeyW') || Input.isDown('Space')) this.p1.vy = flapStrength;
        if (Input.isDown('KeyA')) this.p1.vx = -speed;
        if (Input.isDown('KeyD')) this.p1.vx = speed;

        // P2 Input / AI
        if (GameManager.isSinglePlayer) {
            // AI: Try to stay slightly above P1 and track horizontally
            if (this.p2.y > this.p1.y - 20) this.p2.vy = flapStrength;
            if (this.p2.x > this.p1.x + 10) this.p2.vx = -speed;
            else if (this.p2.x < this.p1.x - 10) this.p2.vx = speed;
        } else {
            if (Input.isDown('ArrowUp') || Input.isDown('Enter')) this.p2.vy = flapStrength;
            if (Input.isDown('ArrowLeft')) this.p2.vx = -speed;
            if (Input.isDown('ArrowRight')) this.p2.vx = speed;
        }

        // Apply Physics
        [this.p1, this.p2].forEach(p => {
            p.vy += gravity * delta;
            p.x += p.vx * delta;
            p.y += p.vy * delta;
            p.vx *= friction;

            // Screen Wrap & Floor
            if (p.x > this.width) p.x = 0;
            if (p.x < 0) p.x = this.width;
            if (p.y > this.height - p.s) {
                p.y = this.height - p.s;
                p.vy = 0;
            }
            if (p.y < 0) p.y = 0;
        });

        // Collision logic
        if (this.checkCollision(this.p1, this.p2)) {
            let p1Top = this.p1.y < this.p2.y - 10;
            let p2Top = this.p2.y < this.p1.y - 10;
            
            if (p1Top) {
                this.scoreP1++;
                this.burst(this.p2.x, this.p2.y, Theme.p2);
                this.spawnPlayers();
            } else if (p2Top) {
                this.scoreP2++;
                this.burst(this.p1.x, this.p1.y, Theme.p1);
                this.spawnPlayers();
            } else {
                // Bounce
                this.p1.vx *= -1.5;
                this.p2.vx *= -1.5;
                this.p1.x += this.p1.vx * delta;
                this.p2.x += this.p2.vx * delta;
            }
        }

        // Particles
        this.particles.forEach(p => { p.x += p.vx * delta; p.y += p.vy * delta; p.life -= delta; });
        this.particles = this.particles.filter(p => p.life > 0);

        // Win Condition
        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    checkCollision(a, b) {
        return a.x < b.x + b.s && a.x + a.s > b.x && a.y < b.y + b.s && a.y + a.s > b.y;
    }

    burst(x, y, color) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 500,
                vy: (Math.random() - 0.5) * 500,
                life: 0.5,
                color: color
            });
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x, this.p1.y, this.p1.s, this.p1.s);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x, this.p2.y, this.p2.s, this.p2.s);

        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 0.5;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1.0;
    }
}
GameManager.registerGame(new SkyJoust());