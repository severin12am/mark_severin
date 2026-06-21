class SlimeVolley extends GameBase {
    constructor() {
        super("Slime Volley", "Bounce the ball over the net! First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.floorY = this.height - 36;
        this.net = { x: this.width / 2 - 5, y: this.floorY - 110, w: 10, h: 110 };
        this.pointFlash = 0;
        this.serve(server);
    }

    serve(server) {
        this.p1 = { x: this.width * 0.28, y: this.floorY, vx: 0, vy: 0, r: 38, grounded: true };
        this.p2 = { x: this.width * 0.72, y: this.floorY, vx: 0, vy: 0, r: 38, grounded: true };
        this.ball = {
            x: server === 1 ? this.p1.x : this.p2.x,
            y: this.height * 0.28,
            vx: server === 1 ? 120 : -120,
            vy: -80,
            r: 14
        };
        this.serveDelay = 0.5;
    }

    jump(p) {
        if (p.grounded) {
            p.vy = -480;
            p.grounded = false;
            AudioManager.move();
        }
    }

    update(dt) {
        if (this.serveDelay > 0) {
            this.serveDelay -= dt;
            return;
        }
        if (this.pointFlash > 0) this.pointFlash -= dt;

        const gravity = 980;
        const speed = 320;

        this.p1.vx = 0;
        if (Input.isDown('KeyA')) this.p1.vx = -speed;
        if (Input.isDown('KeyD')) this.p1.vx = speed;
        if (Input.isDown('KeyW') || Input.isDown('Space')) this.jump(this.p1);

        this.p2.vx = 0;
        if (GameManager.isSinglePlayer) {
            if (this.ball.x > this.width / 2 - 20) {
                const dx = this.ball.x - this.p2.x;
                if (Math.abs(dx) > 8) this.p2.vx = Math.sign(dx) * speed * 0.88;
                if (this.ball.y > this.floorY - 130 && Math.abs(dx) < 55) this.jump(this.p2);
            } else {
                const home = this.width * 0.72;
                if (Math.abs(this.p2.x - home) > 8) this.p2.vx = Math.sign(home - this.p2.x) * speed * 0.5;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.vx = -speed;
            if (Input.isDown('ArrowRight')) this.p2.vx = speed;
            if (Input.isDown('ArrowUp') || Input.isDown('Enter')) this.jump(this.p2);
        }

        [this.p1, this.p2].forEach((p, i) => {
            p.vy += gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y >= this.floorY) {
                p.y = this.floorY;
                p.vy = 0;
                p.grounded = true;
            }
            if (i === 0) {
                p.x = Math.max(p.r, Math.min(this.net.x - p.r, p.x));
            } else {
                p.x = Math.max(this.net.x + this.net.w + p.r, Math.min(this.width - p.r, p.x));
            }
        });

        this.ball.vy += gravity * 0.75 * dt;
        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;

        if (this.ball.x < this.ball.r) {
            this.ball.x = this.ball.r;
            this.ball.vx = Math.abs(this.ball.vx);
            AudioManager.tick();
        }
        if (this.ball.x > this.width - this.ball.r) {
            this.ball.x = this.width - this.ball.r;
            this.ball.vx = -Math.abs(this.ball.vx);
            AudioManager.tick();
        }

        if (this.ball.x + this.ball.r > this.net.x &&
            this.ball.x - this.ball.r < this.net.x + this.net.w &&
            this.ball.y + this.ball.r > this.net.y) {
            this.ball.vx *= -1;
            this.ball.x += this.ball.vx * dt * 2;
            AudioManager.tick();
        }

        [this.p1, this.p2].forEach(p => {
            const dx = this.ball.x - p.x;
            const dy = this.ball.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < this.ball.r + p.r && dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;
                this.ball.vx = nx * 420;
                this.ball.vy = ny * 420 - 140;
                this.ball.y = p.y - p.r - this.ball.r - 1;
                AudioManager.move();
            }
        });

        if (this.ball.y > this.floorY + this.ball.r) {
            if (this.ball.x < this.width / 2) {
                this.scoreP2++;
                this.pointFlash = 0.5;
                AudioManager.wrong();
                if (this.scoreP2 >= 5) GameManager.gameOver(2);
                else this.serve(2);
            } else {
                this.scoreP1++;
                this.pointFlash = 0.5;
                AudioManager.correct();
                if (this.scoreP1 >= 5) GameManager.gameOver(1);
                else this.serve(1);
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.25, 36);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.75, 36);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('first to 5', this.width / 2, 36);

        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.floorY, this.width, this.height - this.floorY);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.net.x, this.net.y, this.net.w, this.net.h);

        const drawSlime = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 10px Arial';
            ctx.fillText(label, p.x, p.y + 16);
        };

        drawSlime(this.p1, Theme.p1, 'P1');
        drawSlime(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.serveDelay <= 0) {
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.pointFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.pointFlash * 0.15})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('A/D move · W/SPACE jump  |  ←/→ move · ↑/ENTER jump', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new SlimeVolley());
