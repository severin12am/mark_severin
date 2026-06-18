// pinball-versus.js
class PinballVersus extends GameBase {
    constructor() {
        super("Pinball Versus", "Split-screen pinball! Control flippers to score on your board. First to 15 points wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.half = w / 2;

        // P1 table (left)
        this.p1Ball = {x: this.half * 0.3, y: 100, vx: 0, vy: 0, r: 12};
        this.p1LeftFlipper = {angle: 30, active: false}; // degrees, base at bottom
        this.p1RightFlipper = {angle: -30, active: false};
        this.p1Bumpers = [
            {x: this.half * 0.2, y: 180, r: 22},
            {x: this.half * 0.4, y: 240, r: 18},
            {x: this.half * 0.1, y: 320, r: 25}
        ];

        // P2 table (right)
        this.p2Ball = {x: this.half * 1.7, y: 100, vx: 0, vy: 0, r: 12};
        this.p2LeftFlipper = {angle: 30, active: false};
        this.p2RightFlipper = {angle: -30, active: false};
        this.p2Bumpers = [
            {x: this.half * 1.2, y: 180, r: 22},
            {x: this.half * 1.4, y: 240, r: 18},
            {x: this.half * 1.6, y: 320, r: 25}
        ];

        this.gravity = 420;
        this.bounce = 0.85;
    }

    update(dt) {
        // P1 controls (A/D flippers, Space plunger/launch if dead)
        this.p1LeftFlipper.active = Input.isDown('KeyA');
        this.p1RightFlipper.active = Input.isDown('KeyD');
        if (Input.isDown('Space') && Math.abs(this.p1Ball.vy) < 10) this.p1Ball.vy = -380; // launch

        // P2 or CPU
        if (GameManager.isSinglePlayer) {
            // CPU: flip when ball near bottom or random
            this.p2LeftFlipper.active = (this.p2Ball.y > 420 && this.p2Ball.x < this.half * 1.5) || Math.random() < 0.1;
            this.p2RightFlipper.active = (this.p2Ball.y > 420 && this.p2Ball.x > this.half * 1.5) || Math.random() < 0.1;
        } else {
            this.p2LeftFlipper.active = Input.isDown('ArrowLeft');
            this.p2RightFlipper.active = Input.isDown('ArrowRight');
            if (Input.isDown('Enter') && Math.abs(this.p2Ball.vy) < 10) this.p2Ball.vy = -380;
        }

        // Update P1 ball
        this.updateBall(this.p1Ball, this.p1LeftFlipper, this.p1RightFlipper, this.p1Bumpers, true, dt);
        // Update P2 ball
        this.updateBall(this.p2Ball, this.p2LeftFlipper, this.p2RightFlipper, this.p2Bumpers, false, dt);

        if (this.scoreP1 >= 15) GameManager.gameOver(1);
        if (this.scoreP2 >= 15) GameManager.gameOver(2);
    }

    updateBall(ball, leftF, rightF, bumpers, isP1, dt) {
        ball.vy += this.gravity * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        const half = this.half;
        const leftWall = isP1 ? 30 : half + 30;
        const rightWall = isP1 ? half - 30 : this.width - 30;

        // Wall bounce
        if (ball.x - ball.r < leftWall) { ball.x = leftWall + ball.r; ball.vx = -ball.vx * this.bounce; }
        if (ball.x + ball.r > rightWall) { ball.x = rightWall - ball.r; ball.vx = -ball.vx * this.bounce; }
        if (ball.y - ball.r < 30) { ball.y = 30 + ball.r; ball.vy = -ball.vy * this.bounce; }

        // Bottom loss → respawn
        if (ball.y > this.height + 20) {
            ball.x = isP1 ? half * 0.3 : half * 1.7;
            ball.y = 100;
            ball.vx = (Math.random() - 0.5) * 80;
            ball.vy = 120;
        }

        // Flippers (simple kick if active and near bottom)
        const flipY = this.height - 80;
        if (ball.y > flipY - 20 && Math.abs(ball.y - flipY) < 30) {
            if (leftF.active && ball.x < (isP1 ? half * 0.5 : half * 1.3)) {
                ball.vy = -280;
                ball.vx -= 80;
            }
            if (rightF.active && ball.x > (isP1 ? half * 0.4 : half * 1.4)) {
                ball.vy = -280;
                ball.vx += 80;
            }
        }

        // Bumpers
        for (let b of bumpers) {
            const dx = ball.x - b.x;
            const dy = ball.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < ball.r + b.r) {
                const nx = dx / dist;
                const ny = dy / dist;
                const dot = ball.vx * nx + ball.vy * ny;
                ball.vx -= 2 * dot * nx;
                ball.vy -= 2 * dot * ny;
                ball.vx *= 1.4;
                ball.vy *= 1.4;
                if (isP1) this.scoreP1 += 2;
                else this.scoreP2 += 2;
                ball.x += nx * 5;
                ball.y += ny * 5;
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Split divider
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(this.half, 0);
        ctx.lineTo(this.half, this.height);
        ctx.stroke();

        // Draw tables
        this.drawTable(ctx, true, Theme.p1);
        this.drawTable(ctx, false, Theme.p2);

        // Scores
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText(this.scoreP1, this.half * 0.5, 45);
        ctx.fillText(this.scoreP2, this.half * 1.5, 45);
    }

    drawTable(ctx, isP1, color) {
        const ox = isP1 ? 0 : this.half;
        const ball = isP1 ? this.p1Ball : this.p2Ball;
        const bumpers = isP1 ? this.p1Bumpers : this.p2Bumpers;
        const leftF = isP1 ? this.p1LeftFlipper : this.p2LeftFlipper;
        const rightF = isP1 ? this.p1RightFlipper : this.p2RightFlipper;

        // Walls
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.strokeRect(ox + 20, 20, this.half - 40, this.height - 60);

        // Bumpers
        ctx.fillStyle = Theme.accent;
        for (let b of bumpers) {
            ctx.beginPath();
            ctx.arc(ox + b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ball
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(ox + ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();

        // Flippers (simple angled rects)
        ctx.strokeStyle = color;
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        // left flipper
        let lx = ox + (isP1 ? 140 : this.half + 120);
        ctx.beginPath();
        ctx.moveTo(lx, this.height - 70);
        ctx.lineTo(lx + Math.cos((leftF.angle + (leftF.active ? -35 : 0)) * Math.PI / 180) * 60, this.height - 70 + Math.sin((leftF.angle + (leftF.active ? -35 : 0)) * Math.PI / 180) * 18);
        ctx.stroke();
        // right flipper
        let rx = ox + (isP1 ? this.half - 120 : this.width - 140);
        ctx.beginPath();
        ctx.moveTo(rx, this.height - 70);
        ctx.lineTo(rx + Math.cos((rightF.angle + (rightF.active ? 35 : 0)) * Math.PI / 180) * -60, this.height - 70 + Math.sin((rightF.angle + (rightF.active ? 35 : 0)) * Math.PI / 180) * 18);
        ctx.stroke();
    }
}

GameManager.registerGame(new PinballVersus());