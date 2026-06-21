class RelicChase extends GameBase {
    constructor() {
        super("Relic Chase", "Hold the relic to score — steal it from your rival! First to 300.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: 100, y: h / 2, r: 18, stun: 0 };
        this.p2 = { x: w - 100, y: h / 2, r: 18, stun: 0 };
        this.holder = 0;
        this.relic = { x: w / 2, y: h / 2, r: 12 };
        this.stealFlash = 0;
    }

    clamp(p) {
        p.x = Math.max(p.r, Math.min(this.width - p.r, p.x));
        p.y = Math.max(p.r + 50, Math.min(this.height - p.r, p.y));
    }

    movePlayer(p, up, down, left, right, isCpu, dt) {
        if (p.stun > 0) {
            p.stun -= dt;
            return;
        }
        const speed = 240 * dt;
        if (isCpu) {
            let tx = this.relic.x, ty = this.relic.y;
            if (this.holder === 1) {
                tx = this.width - 80;
                ty = this.height / 2;
            } else if (this.holder === 0) {
                tx = this.relic.x;
                ty = this.relic.y;
            } else if (this.holder === 2) {
                tx = this.width * 0.75;
                ty = this.height * 0.3;
            }
            if (this.holder !== 2 && Math.hypot(this.p1.x - p.x, this.p1.y - p.y) < 120) {
                tx = this.p1.x;
                ty = this.p1.y;
            }
            p.x += Math.sign(tx - p.x) * Math.min(Math.abs(tx - p.x), speed);
            p.y += Math.sign(ty - p.y) * Math.min(Math.abs(ty - p.y), speed);
        } else {
            if (Input.isDown(up)) p.y -= speed;
            if (Input.isDown(down)) p.y += speed;
            if (Input.isDown(left)) p.x -= speed;
            if (Input.isDown(right)) p.x += speed;
        }
        this.clamp(p);
    }

    update(dt) {
        if (this.stealFlash > 0) this.stealFlash -= dt;

        this.movePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', false, dt);
        this.movePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', GameManager.isSinglePlayer, dt);

        if (this.holder === 0) {
            if (Math.hypot(this.p1.x - this.relic.x, this.p1.y - this.relic.y) < this.p1.r + this.relic.r) {
                this.holder = 1;
                AudioManager.correct();
            } else if (Math.hypot(this.p2.x - this.relic.x, this.p2.y - this.relic.y) < this.p2.r + this.relic.r) {
                this.holder = 2;
                AudioManager.wrong();
            }
        }

        if (Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.r + this.p2.r) {
            if (this.holder === 1) {
                this.holder = 2;
                this.p1.stun = 0.8;
                this.stealFlash = 0.4;
                AudioManager.wrong();
            } else if (this.holder === 2) {
                this.holder = 1;
                this.p2.stun = 0.8;
                this.stealFlash = 0.4;
                AudioManager.correct();
            }
        }

        if (this.holder === 1) {
            this.relic.x = this.p1.x;
            this.relic.y = this.p1.y - 12;
            this.scoreP1 += Math.ceil(60 * dt);
        } else if (this.holder === 2) {
            this.relic.x = this.p2.x;
            this.relic.y = this.p2.y - 12;
            this.scoreP2 += Math.ceil(60 * dt);
        }

        if (this.scoreP1 >= 300) GameManager.gameOver(1);
        if (this.scoreP2 >= 300) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.p1;
        ctx.fillRect(0, 0, (this.scoreP1 / 300) * this.width, 8);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillRect(0, 8, (this.scoreP2 / 300) * this.width, 8);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Relic: ${this.scoreP1} — ${this.scoreP2}  (first to 300)`, this.width / 2, 36);

        const drawP = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            if (p.stun > 0) {
                ctx.strokeStyle = Theme.accent;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 9px Arial';
            ctx.fillText(label, p.x, p.y + p.r + 12);
        };

        drawP(this.p1, Theme.p1, 'P1');
        drawP(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.relic.x, this.relic.y, this.relic.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.stealFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.stealFlash * 0.3})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD move · bump rival to steal the relic', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new RelicChase());
