class GameAirHockey extends GameBase {
    constructor() {
        super("Air Hockey", "Smack the puck into the rival goal! First to 7.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.goalW = 150;
        this.friction = 0.992;
        this.goalFlash = 0;
        this.resetPuck();
    }

    resetPuck() {
        this.puck = { x: this.width / 2, y: this.height / 2, vx: 0, vy: 0, r: 14 };
        this.m1 = { x: 110, y: this.height / 2, r: 32 };
        this.m2 = { x: this.width - 110, y: this.height / 2, r: 32 };
        this.serveDelay = 0.6;
    }

    clampMallet(m, minX, maxX) {
        m.x = Math.max(minX + m.r, Math.min(maxX - m.r, m.x));
        m.y = Math.max(m.r + 60, Math.min(this.height - m.r - 20, m.y));
    }

    hitMallet(m, color) {
        const dx = this.puck.x - m.x;
        const dy = this.puck.y - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= this.puck.r + m.r) return;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = this.puck.r + m.r - dist;
        this.puck.x += nx * overlap;
        this.puck.y += ny * overlap;
        const dot = this.puck.vx * nx + this.puck.vy * ny;
        this.puck.vx -= 2 * dot * nx;
        this.puck.vy -= 2 * dot * ny;
        this.puck.vx += nx * 340;
        this.puck.vy += ny * 340;
        AudioManager.move();
    }

    update(dt) {
        if (this.serveDelay > 0) {
            this.serveDelay -= dt;
            return;
        }
        if (this.goalFlash > 0) this.goalFlash -= dt;

        const speed = 420 * dt;
        if (Input.isDown('KeyW')) this.m1.y -= speed;
        if (Input.isDown('KeyS')) this.m1.y += speed;
        if (Input.isDown('KeyA')) this.m1.x -= speed;
        if (Input.isDown('KeyD')) this.m1.x += speed;

        if (GameManager.isSinglePlayer) {
            const px = this.puck.x;
            const py = this.puck.y;
            if (px > this.width / 2) {
                const tx = Math.max(this.width / 2 + 40, px - 20);
                const ty = py;
                const dx = tx - this.m2.x, dy = ty - this.m2.y;
                this.m2.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * 0.9);
                this.m2.y += Math.sign(dy) * Math.min(Math.abs(dy), speed * 0.9);
            } else {
                const home = { x: this.width * 0.75, y: this.height / 2 };
                this.m2.x += Math.sign(home.x - this.m2.x) * Math.min(Math.abs(home.x - this.m2.x), speed * 0.5);
                this.m2.y += Math.sign(home.y - this.m2.y) * Math.min(Math.abs(home.y - this.m2.y), speed * 0.5);
            }
        } else {
            if (Input.isDown('ArrowUp')) this.m2.y -= speed;
            if (Input.isDown('ArrowDown')) this.m2.y += speed;
            if (Input.isDown('ArrowLeft')) this.m2.x -= speed;
            if (Input.isDown('ArrowRight')) this.m2.x += speed;
        }

        this.clampMallet(this.m1, 0, this.width / 2 - 8);
        this.clampMallet(this.m2, this.width / 2 + 8, this.width);

        this.puck.vx *= this.friction;
        this.puck.vy *= this.friction;
        this.puck.x += this.puck.vx * dt;
        this.puck.y += this.puck.vy * dt;

        const gyTop = this.height / 2 - this.goalW / 2;
        const gyBot = this.height / 2 + this.goalW / 2;

        if (this.puck.y < this.puck.r + 60) {
            this.puck.y = this.puck.r + 60;
            this.puck.vy = Math.abs(this.puck.vy);
            AudioManager.tick();
        }
        if (this.puck.y > this.height - this.puck.r - 20) {
            this.puck.y = this.height - this.puck.r - 20;
            this.puck.vy = -Math.abs(this.puck.vy);
            AudioManager.tick();
        }

        if (this.puck.x < this.puck.r) {
            if (this.puck.y > gyTop && this.puck.y < gyBot) {
                this.scoreP2++;
                this.goalFlash = 0.5;
                AudioManager.wrong();
                if (this.scoreP2 >= 7) GameManager.gameOver(2);
                else this.resetPuck();
                return;
            }
            this.puck.x = this.puck.r;
            this.puck.vx = Math.abs(this.puck.vx);
        } else if (this.puck.x > this.width - this.puck.r) {
            if (this.puck.y > gyTop && this.puck.y < gyBot) {
                this.scoreP1++;
                this.goalFlash = 0.5;
                AudioManager.correct();
                if (this.scoreP1 >= 7) GameManager.gameOver(1);
                else this.resetPuck();
                return;
            }
            this.puck.x = this.width - this.puck.r;
            this.puck.vx = -Math.abs(this.puck.vx);
        }

        this.hitMallet(this.m1, Theme.p1);
        this.hitMallet(this.m2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
    }

    render(ctx) {
        ctx.fillStyle = '#0a2840';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 60);
        ctx.lineTo(this.width / 2, this.height - 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, 70, 0, Math.PI * 2);
        ctx.stroke();

        const gy = this.height / 2 - this.goalW / 2;
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(0, gy, 12, this.goalW);
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.width - 12, gy, 12, this.goalW);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.25, 40);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.75, 40);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('first to 7', this.width / 2, 40);

        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.m1.x, this.m1.y, this.m1.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.beginPath();
        ctx.arc(this.m2.x, this.m2.y, this.m2.r, 0, Math.PI * 2);
        ctx.fill();

        if (this.serveDelay <= 0) {
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(this.puck.x, this.puck.y, this.puck.r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.goalFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.goalFlash * 0.2})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD mallet (left half) · Arrows mallet (right half)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GameAirHockey());
