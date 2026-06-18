// minigolf-race.js
class MiniGolfRace extends GameBase {
    constructor() {
        super("Mini-Golf (Race)", "First ball in the hole wins!");
    }

    init(w, h) {
        super.init(w, h);
        this.width = w;
        this.height = h;
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.resetRound();
    }

    resetRound() {
        this.ball1 = {x: 150, y: 450, vx: 0, vy: 0, radius: 12};
        this.ball2 = {x: 650, y: 450, vx: 0, vy: 0, radius: 12};
        this.hole = {x: 400, y: 120, radius: 14};
        this.friction = 0.96;
        this.aim1 = 0;
        this.aim2 = Math.PI;
        this.charge1 = 0;
        this.charging1 = false;
        this.charge2 = 0;
        this.charging2 = false;
    }

    update(dt) {
        const b1 = this.ball1;
        const b2 = this.ball2;

        // P1
        if (Input.isDown('KeyA')) this.aim1 -= 2.8;
        if (Input.isDown('KeyD')) this.aim1 += 2.8;
        if (Input.isDown('Space')) {
            if (!this.charging1 && Math.hypot(b1.vx, b1.vy) < 1) this.charging1 = true;
            if (this.charging1) this.charge1 = Math.min(this.charge1 + dt * 950, 720);
        } else if (this.charging1) {
            this.putt(b1, this.aim1, this.charge1);
            this.charging1 = false;
            this.charge1 = 0;
        }

        // P2 or CPU
        if (GameManager.isSinglePlayer) {
            if (Math.hypot(b2.vx, b2.vy) < 1) {
                this.aim2 = Math.atan2(this.hole.y - b2.y, this.hole.x - b2.x);
                this.putt(b2, this.aim2, 460);
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.aim2 -= 2.8;
            if (Input.isDown('ArrowRight')) this.aim2 += 2.8;
            if (Input.isDown('Enter')) {
                if (!this.charging2 && Math.hypot(b2.vx, b2.vy) < 1) this.charging2 = true;
                if (this.charging2) this.charge2 = Math.min(this.charge2 + dt * 950, 720);
            } else if (this.charging2) {
                this.putt(b2, this.aim2, this.charge2);
                this.charging2 = false;
                this.charge2 = 0;
            }
        }

        [b1, b2].forEach(b => {
            b.vx *= this.friction;
            b.vy *= this.friction;
            b.x += b.vx * dt * 60;
            b.y += b.vy * dt * 60;
            this.handleWalls(b);
        });

        if (this.checkHole(b1)) GameManager.gameOver(1);
        if (this.checkHole(b2)) GameManager.gameOver(2);
    }

    putt(ball, angle, power) {
        ball.vx = Math.cos(angle) * power / 34;
        ball.vy = Math.sin(angle) * power / 34;
    }

    handleWalls(b) {
        if (b.x < 30 || b.x > this.width - 30) b.vx = -b.vx * 0.68;
        if (b.y < 30 || b.y > this.height - 80) b.vy = -b.vy * 0.68;
        b.x = Math.max(30, Math.min(this.width - 30, b.x));
        b.y = Math.max(30, Math.min(this.height - 80, b.y));
    }

    checkHole(ball) {
        const dx = ball.x - this.hole.x;
        const dy = ball.y - this.hole.y;
        if (Math.hypot(dx, dy) < this.hole.radius + ball.radius && Math.hypot(ball.vx, ball.vy) < 5) {
            return true;
        }
        return false;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#1f3a1f';
        ctx.fillRect(30, 30, this.width - 60, this.height - 110);

        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y, this.hole.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.ball1.x, this.ball1.y, this.ball1.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = Theme.p2;
        ctx.beginPath();
        ctx.arc(this.ball2.x, this.ball2.y, this.ball2.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("RACE!", 400, 60);
    }
}

GameManager.registerGame(new MiniGolfRace());