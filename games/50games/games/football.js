class Football extends GameBase {
    constructor() {
        super("Football", "Push the ball into the goal! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: this.width * 0.25, y: this.height / 2, s: 22, vx: 0, vy: 0 };
        this.p2 = { x: this.width * 0.75, y: this.height / 2, s: 22, vx: 0, vy: 0 };
        this.ball = { x: this.width / 2, y: this.height / 2, s: 14, vx: 0, vy: 0 };
        this.goalFlash = 0;
        this.goalText = '';
        this.goalY1 = this.height / 2 - 80;
        this.goalY2 = this.height / 2 + 80;
    }

    applyInput(p, up, down, left, right, accel) {
        if (Input.isDown(up)) p.vy -= accel;
        if (Input.isDown(down)) p.vy += accel;
        if (Input.isDown(left)) p.vx -= accel;
        if (Input.isDown(right)) p.vx += accel;
    }

    stepObject(obj, friction, maxSpeed, isBall) {
        obj.vx = Math.max(-maxSpeed, Math.min(maxSpeed, obj.vx * friction));
        obj.vy = Math.max(-maxSpeed, Math.min(maxSpeed, obj.vy * friction));
        obj.x += obj.vx;
        obj.y += obj.vy;

        if (obj.y < obj.s) { obj.y = obj.s; obj.vy *= -0.6; }
        if (obj.y > this.height - obj.s) { obj.y = this.height - obj.s; obj.vy *= -0.6; }

        if (!isBall) {
            if (obj.x < obj.s + 15) { obj.x = obj.s + 15; obj.vx *= -0.5; }
            if (obj.x > this.width - obj.s - 15) { obj.x = this.width - obj.s - 15; obj.vx *= -0.5; }
        }
    }

    collide(o1, o2) {
        const dx = o2.x - o1.x;
        const dy = o2.y - o1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = o1.s + o2.s;
        if (dist < minDist && dist > 0) {
            const angle = Math.atan2(dy, dx);
            const push = (minDist - dist) / 2;
            o1.x -= Math.cos(angle) * push;
            o1.y -= Math.sin(angle) * push;
            o2.x += Math.cos(angle) * push;
            o2.y += Math.sin(angle) * push;
            const nx = dx / dist;
            const ny = dy / dist;
            const rel = (o1.vx - o2.vx) * nx + (o1.vy - o2.vy) * ny;
            if (rel > 0) {
                o1.vx -= nx * rel * 0.6;
                o1.vy -= ny * rel * 0.6;
                o2.vx += nx * rel * 0.6;
                o2.vy += ny * rel * 0.6;
            }
        }
    }

    scoreGoal(scorer) {
        if (scorer === 1) {
            this.scoreP1++;
            this.goalText = 'GOAL — P1!';
        } else {
            this.scoreP2++;
            this.goalText = GameManager.isSinglePlayer ? 'GOAL — CPU!' : 'GOAL — P2!';
        }
        this.goalFlash = 1.2;
        AudioManager.correct();
        if (this.scoreP1 >= 3) GameManager.gameOver(1);
        else if (this.scoreP2 >= 3) GameManager.gameOver(2);
        else this.resetRound();
    }

    update(dt) {
        if (this.goalFlash > 0) {
            this.goalFlash -= dt;
            return;
        }

        const accel = 0.6;
        const friction = 0.92;
        const maxSpeed = 6;

        this.applyInput(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', accel);

        if (GameManager.isSinglePlayer) {
            const defend = this.ball.x > this.width * 0.55;
            const tx = defend ? Math.min(this.ball.x + 30, this.width * 0.85) : this.ball.x;
            const ty = this.ball.y;
            const dx = tx - this.p2.x;
            const dy = ty - this.p2.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.p2.vx += (dx / dist) * accel * 0.85;
            this.p2.vy += (dy / dist) * accel * 0.85;
        } else {
            this.applyInput(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', accel);
        }

        [this.p1, this.p2, this.ball].forEach(obj => {
            this.stepObject(obj, friction, maxSpeed, obj === this.ball);
        });

        this.collide(this.p1, this.ball);
        this.collide(this.p2, this.ball);
        this.collide(this.p1, this.p2);

        const inGoalY = this.ball.y > this.goalY1 && this.ball.y < this.goalY2;
        if (inGoalY && this.ball.x < 0) {
            this.scoreGoal(2);
        } else if (inGoalY && this.ball.x > this.width) {
            this.scoreGoal(1);
        } else {
            if (this.ball.x < this.ball.s) {
                this.ball.x = this.ball.s;
                this.ball.vx *= -0.7;
            }
            if (this.ball.x > this.width - this.ball.s) {
                this.ball.x = this.width - this.ball.s;
                this.ball.vx *= -0.7;
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#1a5c2a';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, 60, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,42,84,0.35)';
        ctx.fillRect(this.width - 12, this.goalY1, 12, this.goalY2 - this.goalY1);
        ctx.fillStyle = 'rgba(0,229,155,0.35)';
        ctx.fillRect(0, this.goalY1, 12, this.goalY2 - this.goalY1);

        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p2Color;
        ctx.beginPath();
        ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.goalFlash > 0) {
            ctx.fillStyle = `rgba(255,230,0,${Math.min(1, this.goalFlash)})`;
            ctx.font = "bold 48px Impact";
            ctx.textAlign = "center";
            ctx.fillText(this.goalText, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("P1 scores right  |  P2/CPU scores left", this.width / 2, this.height - 16);
    }
}

GameManager.registerGame(new Football());
