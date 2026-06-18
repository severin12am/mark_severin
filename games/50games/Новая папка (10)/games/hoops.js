// hoops.js
class Hoops extends GameBase {
    constructor() {
        super("Hoops", "Jump and shoot! First to 5 baskets wins.");
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
        this.p1 = {x: 150, y: 400, vx: 0, vy: 0, width: 40, height: 70, onGround: true};
        this.p2 = {x: 600, y: 400, vx: 0, vy: 0, width: 40, height: 70, onGround: true};
        this.ball = {x: 400, y: 300, vx: 0, vy: 0, radius: 15};
        this.hoopP1 = {x: 680, y: 180, width: 70, height: 8}; // P1 scores here
        this.hoopP2 = {x: 50, y: 180, width: 70, height: 8};  // P2 scores here
        this.gravity = 0.6;
        this.timer = 0;
    }

    update(dt) {
        const p1 = this.p1;
        const p2 = this.p2;
        const ball = this.ball;

        // Player 1
        let p1Moving = false;
        if (Input.isDown('KeyA')) { p1.vx = -6; p1Moving = true; }
        if (Input.isDown('KeyD')) { p1.vx = 6; p1Moving = true; }
        if (!p1Moving) p1.vx *= 0.85;
        if (Input.isDown('KeyW') && p1.onGround) {
            p1.vy = -16;
            p1.onGround = false;
        }
        if (Input.isDown('Space')) this.tryShoot(p1, ball);

        // Player 2 or CPU
        if (GameManager.isSinglePlayer) {
            this.updateCPU(p2, ball);
        } else {
            let p2Moving = false;
            if (Input.isDown('ArrowLeft')) { p2.vx = -6; p2Moving = true; }
            if (Input.isDown('ArrowRight')) { p2.vx = 6; p2Moving = true; }
            if (!p2Moving) p2.vx *= 0.85;
            if (Input.isDown('ArrowUp') && p2.onGround) {
                p2.vy = -16;
                p2.onGround = false;
            }
            if (Input.isDown('Enter')) this.tryShoot(p2, ball);
        }

        // Physics
        p1.vy += this.gravity; p1.x += p1.vx; p1.y += p1.vy;
        p2.vy += this.gravity; p2.x += p2.vx; p2.y += p2.vy;
        ball.vy += this.gravity * 0.8; ball.x += ball.vx; ball.y += ball.vy;
        ball.vx *= 0.985; ball.vy *= 0.985;

        this.handlePlayerBounds(p1);
        this.handlePlayerBounds(p2);
        this.handleBallBounds(ball);

        this.handlePlayerBallCollision(p1, ball);
        this.handlePlayerBallCollision(p2, ball);

        this.checkScoring();

        this.timer += dt;
        if (this.timer > 30) { this.resetRound(); this.timer = 0; }

        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    tryShoot(player, ball) {
        const dx = ball.x - (player.x + player.width / 2);
        const dy = ball.y - (player.y + 30);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 55) {
            const power = 18;
            ball.vx = (dx / dist) * power + player.vx * 0.5;
            ball.vy = -power * 1.1 + (Math.random() - 0.5) * 3;
        }
    }

    handlePlayerBounds(p) {
        if (p.x < 20) { p.x = 20; p.vx = 2; }
        if (p.x + p.width > this.width - 20) { p.x = this.width - 20 - p.width; p.vx = -2; }
        if (p.y + p.height > this.height - 80) {
            p.y = this.height - 80 - p.height;
            p.vy = 0;
            p.onGround = true;
        } else {
            p.onGround = false;
        }
    }

    handleBallBounds(ball) {
        if (ball.x - ball.radius < 10 || ball.x + ball.radius > this.width - 10) {
            ball.vx = -ball.vx * 0.7;
            ball.x = Math.max(10 + ball.radius, Math.min(this.width - 10 - ball.radius, ball.x));
        }
        if (ball.y + ball.radius > this.height - 80) {
            ball.y = this.height - 80 - ball.radius;
            ball.vy = -ball.vy * 0.6;
            ball.vx *= 0.8;
            if (Math.abs(ball.vy) < 2) ball.vy = 0;
        }
    }

    handlePlayerBallCollision(player, ball) {
        const dx = ball.x - (player.x + player.width / 2);
        const dy = ball.y - (player.y + 25);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
            const nx = dx / dist || 0;
            ball.vx += nx * 8;
            ball.vy += (dy / dist || -1) * 6 - 3;
        }
    }

    checkScoring() {
        const ball = this.ball;
        if (ball.vy > 0 && ball.x > this.hoopP1.x && ball.x < this.hoopP1.x + this.hoopP1.width &&
            ball.y > this.hoopP1.y - 5 && ball.y < this.hoopP1.y + 25) {
            this.scoreP1++;
            this.resetRound();
        }
        if (ball.vy > 0 && ball.x > this.hoopP2.x && ball.x < this.hoopP2.x + this.hoopP2.width &&
            ball.y > this.hoopP2.y - 5 && ball.y < this.hoopP2.y + 25) {
            this.scoreP2++;
            this.resetRound();
        }
    }

    updateCPU(p, ball) {
        const targetX = ball.x - 30;
        p.vx = (targetX > p.x + p.width / 2 + 20) ? 5.5 : (targetX < p.x + p.width / 2 - 20) ? -5.5 : p.vx * 0.7;
        if (p.onGround && (ball.y < p.y - 80 || Math.random() < 0.03)) {
            p.vy = -15;
            p.onGround = false;
        }
        if (Math.random() < 0.05) {
            const dx = Math.abs(ball.x - (p.x + p.width / 2));
            if (dx < 70) this.tryShoot(p, ball);
        }
    }

    resetRound() {
        this.ball.x = 400;
        this.ball.y = 250;
        this.ball.vx = (Math.random() - 0.5) * 8;
        this.ball.vy = -5;
        this.timer = 0;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.height - 80, this.width, 80);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 6;
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.hoopP2.x - 8, this.hoopP2.y - 40, 12, 50);
        ctx.strokeRect(this.hoopP2.x, this.hoopP2.y, this.hoopP2.width, this.hoopP2.height);
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.hoopP1.x + this.hoopP1.width - 4, this.hoopP1.y - 40, 12, 50);
        ctx.strokeRect(this.hoopP1.x, this.hoopP1.y, this.hoopP1.width, this.hoopP1.height);

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x, this.p1.y, this.p1.width, this.p1.height);
        ctx.fillRect(this.p1.x + 8, this.p1.y - 10, 24, 20);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x, this.p2.y, this.p2.width, this.p2.height);
        ctx.fillRect(this.p2.x + 8, this.p2.y - 10, 24, 20);

        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.scoreP1, 200, 80);
        ctx.fillText(this.scoreP2, 600, 80);

        ctx.font = "20px sans-serif";
        ctx.fillText("P1", 200, 120);
        ctx.fillText(GameManager.isSinglePlayer ? "CPU" : "P2", 600, 120);
    }
}

GameManager.registerGame(new Hoops());