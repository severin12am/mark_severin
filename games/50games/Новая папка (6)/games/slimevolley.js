class SlimeVolley extends GameBase {
    constructor() { super("Slime Volley", "Bounce the ball over the net! First to 5."); }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = this.scoreP1 || 0;
        this.scoreP2 = this.scoreP2 || 0;
        this.floorY = this.height - 40;
        this.net = { x: this.width / 2, y: this.height - 150, w: 10, h: 110 };
        this.spawn(1);
    }

    spawn(server) {
        this.p1 = { x: this.width * 0.25, y: this.floorY, vx: 0, vy: 0, r: 40 };
        this.p2 = { x: this.width * 0.75, y: this.floorY, vx: 0, vy: 0, r: 40 };
        this.ball = { 
            x: server === 1 ? this.p1.x : this.p2.x, 
            y: this.height * 0.3, 
            vx: 0, vy: 0, r: 15 
        };
    }

    update(dt) {
        let delta = dt > 0.5 ? dt / 1000 : dt;
        const gravity = 1000, speed = 350, jump = -500;

        // P1 Input
        this.p1.vx = 0;
        if (Input.isDown('KeyA')) this.p1.vx = -speed;
        if (Input.isDown('KeyD')) this.p1.vx = speed;
        if ((Input.isDown('KeyW') || Input.isDown('Space')) && this.p1.y === this.floorY) this.p1.vy = jump;

        // P2 Input / AI
        this.p2.vx = 0;
        if (GameManager.isSinglePlayer) {
            // AI Logic: chase ball if on its side
            if (this.ball.x > this.width / 2) {
                if (Math.abs(this.p2.x - this.ball.x) > 10) this.p2.vx = this.ball.x < this.p2.x ? -speed : speed;
                if (this.ball.y > this.height - 200 && Math.abs(this.p2.x - this.ball.x) < 50 && this.p2.y === this.floorY) this.p2.vy = jump;
            } else { // Return to center
                let targetX = this.width * 0.75;
                if (Math.abs(this.p2.x - targetX) > 10) this.p2.vx = targetX < this.p2.x ? -speed : speed;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.vx = -speed;
            if (Input.isDown('ArrowRight')) this.p2.vx = speed;
            if ((Input.isDown('ArrowUp') || Input.isDown('Enter')) && this.p2.y === this.floorY) this.p2.vy = jump;
        }

        // Apply Player Physics
        [this.p1, this.p2].forEach((p, idx) => {
            p.vy += gravity * delta;
            p.x += p.vx * delta;
            p.y += p.vy * delta;
            if (p.y > this.floorY) { p.y = this.floorY; p.vy = 0; }
            
            // Constrain to halves
            if (idx === 0) {
                if (p.x < p.r) p.x = p.r;
                if (p.x > this.net.x - p.r) p.x = this.net.x - p.r;
            } else {
                if (p.x > this.width - p.r) p.x = this.width - p.r;
                if (p.x < this.net.x + this.net.w + p.r) p.x = this.net.x + this.net.w + p.r;
            }
        });

        // Ball Physics
        this.ball.vy += gravity * 0.7 * delta;
        this.ball.x += this.ball.vx * delta;
        this.ball.y += this.ball.vy * delta;

        // Ball Constraints
        if (this.ball.x < this.ball.r) { this.ball.x = this.ball.r; this.ball.vx *= -1; }
        if (this.ball.x > this.width - this.ball.r) { this.ball.x = this.width - this.ball.r; this.ball.vx *= -1; }
        
        // Net Collision
        if (this.ball.x + this.ball.r > this.net.x && this.ball.x - this.ball.r < this.net.x + this.net.w && this.ball.y + this.ball.r > this.net.y) {
            this.ball.vx *= -1;
            this.ball.x += this.ball.vx * delta * 2;
        }

        // Player Collision
        [this.p1, this.p2].forEach(p => {
            let dx = this.ball.x - p.x;
            let dy = this.ball.y - p.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.ball.r + p.r) {
                let angle = Math.atan2(dy, dx);
                let force = 400;
                this.ball.vx = Math.cos(angle) * force;
                this.ball.vy = Math.sin(angle) * force - 100; // Extra pop up
                this.ball.y = p.y - p.r - this.ball.r; // Resolve overlap
            }
        });

        // Floor / Scoring
        if (this.ball.y > this.floorY) {
            if (this.ball.x < this.width / 2) {
                this.scoreP2++;
                if (this.scoreP2 >= 5) GameManager.gameOver(2);
                else this.spawn(2);
            } else {
                this.scoreP1++;
                if (this.scoreP1 >= 5) GameManager.gameOver(1);
                else this.spawn(1);
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floor and Net
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.floorY, this.width, this.height - this.floorY);
        ctx.fillRect(this.net.x, this.net.y, this.net.w, this.net.h);

        // P1 Semi-Circle
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.p1.r, Math.PI, 0);
        ctx.fill();

        // P2 Semi-Circle
        ctx.fillStyle = Theme.p2;
        ctx.beginPath();
        ctx.arc(this.p2.x, this.p2.y, this.p2.r, Math.PI, 0);
        ctx.fill();

        // Ball
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        ctx.fill();
    }
}
GameManager.registerGame(new SlimeVolley());