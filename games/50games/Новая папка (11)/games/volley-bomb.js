// volley-bomb.js
class VolleyBomb extends GameBase {
    constructor() {
        super("Volley-Bomb", "Volleyball with exploding bomb! First to 5 wins.");
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
        this.p1 = {x: 200, y: 420, vx: 0, vy: 0, width: 45, height: 75, onGround: true};
        this.p2 = {x: 580, y: 420, vx: 0, vy: 0, width: 45, height: 75, onGround: true};
        this.ball = {x: 400, y: 220, vx: (Math.random() - 0.5) * 120, vy: -80, radius: 18};
        this.bombTimer = 3.8;
        this.gravity = 980;
        this.netX = 400;
    }

    update(dt) {
        this.bombTimer -= dt;

        const p1 = this.p1;
        p1.vx = 0;
        if (Input.isDown('KeyA')) p1.vx = -280;
        if (Input.isDown('KeyD')) p1.vx = 280;
        if (Input.isDown('KeyW') && p1.onGround) { p1.vy = -580; p1.onGround = false; }

        const p2 = this.p2;
        p2.vx = 0;
        if (GameManager.isSinglePlayer) {
            const tx = Math.max(440, Math.min(740, this.ball.x + this.ball.vx * 0.5));
            p2.vx = Math.sign(tx - p2.x) * 260;
            if (this.ball.y < 300 && Math.abs(this.ball.x - p2.x) < 95 && Math.random() < 0.07) {
                p2.vy = -570;
                p2.onGround = false;
            }
        } else {
            if (Input.isDown('ArrowLeft')) p2.vx = -280;
            if (Input.isDown('ArrowRight')) p2.vx = 280;
            if (Input.isDown('ArrowUp') && p2.onGround) { p2.vy = -580; p2.onGround = false; }
        }

        [p1, p2].forEach(p => {
            p.vy += this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y >= 420) { p.y = 420; p.vy = 0; p.onGround = true; }
            p.x = Math.max(30, Math.min(this.width - 30, p.x));
        });

        const b = this.ball;
        b.vy += this.gravity * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x < 30 || b.x > this.width - 30) b.vx = -b.vx * 0.75;
        if (Math.abs(b.x - this.netX) < 14 && b.y > 250) {
            b.vx = -b.vx * 0.9;
            b.x = b.x < this.netX ? this.netX - 14 : this.netX + 14;
        }

        if (b.y > 480) {
            const side = b.x < this.netX ? 1 : 2;
            if (this.bombTimer <= 0) {
                if (side === 1) this.scoreP2++; else this.scoreP1++;
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            } else {
                b.vy = -b.vy * 0.65;
                b.vx *= 0.8;
                this.bombTimer = 3.5;
            }
            b.y = 480;
        }

        [p1, p2].forEach((p, i) => {
            const dx = b.x - (p.x + p.width / 2);
            const dy = b.y - (p.y + 28);
            if (Math.sqrt(dx * dx + dy * dy) < 40) {
                b.vy = -Math.abs(b.vy) * 1.15 - 140;
                b.vx = p.vx * 1.4 + (i === 0 ? 90 : -90);
                this.bombTimer = Math.max(2.2, this.bombTimer);
            }
        });

        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#2a2a35';
        ctx.fillRect(0, 480, this.width, 120);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.netX, 180);
        ctx.lineTo(this.netX, 480);
        ctx.stroke();

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x, this.p1.y, this.p1.width, this.p1.height);
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x, this.p2.y, this.p2.width, this.p2.height);

        ctx.fillStyle = this.bombTimer < 1 ? Theme.accent : '#ff5555';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(Math.ceil(this.bombTimer), this.ball.x - 9, this.ball.y + 7);

        ctx.font = "bold 42px sans-serif";
        ctx.fillText(this.scoreP1, 180, 80);
        ctx.fillText(this.scoreP2, 620, 80);
    }
}

GameManager.registerGame(new VolleyBomb());