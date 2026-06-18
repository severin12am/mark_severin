class Football extends GameBase {
    constructor() { super("Football", "Push the ball into the goal. First to 3."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: this.width/4, y: this.height/2, s: 20, vx: 0, vy: 0 };
        this.p2 = { x: this.width*0.75, y: this.height/2, s: 20, vx: 0, vy: 0 };
        this.ball = { x: this.width/2, y: this.height/2, s: 15, vx: 0, vy: 0 };
    }
    update(dt) {
        let speed = 0.5, friction = 0.9, maxSpeed = 5;

        // Movement setup
        let applyInput = (p, up, down, left, right) => {
            if (Input.isDown(up)) p.vy -= speed;
            if (Input.isDown(down)) p.vy += speed;
            if (Input.isDown(left)) p.vx -= speed;
            if (Input.isDown(right)) p.vx += speed;
        };

        applyInput(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD');

        if (GameManager.isSinglePlayer) {
            let tx = this.ball.x > this.width/2 ? this.ball.x + 20 : this.ball.x;
            if (this.p2.x < tx) this.p2.vx += speed; else this.p2.vx -= speed;
            if (this.p2.y < this.ball.y) this.p2.vy += speed; else this.p2.vy -= speed;
        } else {
            applyInput(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
        }

        // Physics[this.p1, this.p2, this.ball].forEach(obj => {
            obj.vx = Math.max(-maxSpeed, Math.min(maxSpeed, obj.vx * friction));
            obj.vy = Math.max(-maxSpeed, Math.min(maxSpeed, obj.vy * friction));
            obj.x += obj.vx; obj.y += obj.vy;
            
            // Wall collisions
            if (obj.y < obj.s) { obj.y = obj.s; obj.vy *= -1; }
            if (obj.y > this.height - obj.s) { obj.y = this.height - obj.s; obj.vy *= -1; }
            if (obj !== this.ball) {
                if (obj.x < obj.s) { obj.x = obj.s; obj.vx *= -1; }
                if (obj.x > this.width - obj.s) { obj.x = this.width - obj.s; obj.vx *= -1; }
            }
        });

        // Circle Collisions
        let collide = (o1, o2) => {
            let dx = o2.x - o1.x, dy = o2.y - o1.y;
            let dist = Math.hypot(dx, dy);
            if (dist < o1.s + o2.s) {
                let angle = Math.atan2(dy, dx);
                let push = (o1.s + o2.s - dist) / 2;
                o1.x -= Math.cos(angle) * push; o1.y -= Math.sin(angle) * push;
                o2.x += Math.cos(angle) * push; o2.y += Math.sin(angle) * push;
                let tmpVx = o1.vx, tmpVy = o1.vy;
                o1.vx = o2.vx; o1.vy = o2.vy;
                o2.vx = tmpVx; o2.vy = tmpVy;
            }
        };

        collide(this.p1, this.ball);
        collide(this.p2, this.ball);
        collide(this.p1, this.p2);

        // Goals (top and bottom 1/3 of the screen left/right)
        let goalY1 = this.height/2 - 75, goalY2 = this.height/2 + 75;
        if (this.ball.x < 0 && this.ball.y > goalY1 && this.ball.y < goalY2) {
            this.scoreP2++; if (this.scoreP2 >= 3) GameManager.gameOver(2); else this.resetRound();
        } else if (this.ball.x > this.width && this.ball.y > goalY1 && this.ball.y < goalY2) {
            this.scoreP1++; if (this.scoreP1 >= 3) GameManager.gameOver(1); else this.resetRound();
        } else {
            // Bounce off non-goal walls
            if (this.ball.x < this.ball.s) { this.ball.x = this.ball.s; this.ball.vx *= -1; }
            if (this.ball.x > this.width - this.ball.s) { this.ball.x = this.width - this.ball.s; this.ball.vx *= -1; }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        // Goals
        ctx.fillStyle = Theme.p2; ctx.fillRect(0, this.height/2 - 75, 10, 150);
        ctx.fillStyle = Theme.p1; ctx.fillRect(this.width - 10, this.height/2 - 75, 10, 150);

        ctx.fillStyle = Theme.p1; ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = Theme.p2; ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = Theme.accent; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.s, 0, Math.PI*2); ctx.fill();
    }
}
GameManager.registerGame(new Football());