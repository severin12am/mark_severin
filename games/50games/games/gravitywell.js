class GravityWell extends GameBase {
    constructor() {
        super("Gravity Well", "Collect stars — avoid the black hole! First to 10.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.hole = { x: w / 2, y: h / 2, r: 36 };
        this.msg = '';
        this.msgTimer = 0;
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: 90, y: this.height / 2, vx: 0, vy: 0, a: 0, r: 14 };
        this.p2 = { x: this.width - 90, y: this.height / 2, vx: 0, vy: 0, a: Math.PI, r: 14 };
        this.spawnStar();
    }

    spawnStar() {
        for (let i = 0; i < 30; i++) {
            const s = {
                x: 60 + Math.random() * (this.width - 120),
                y: 80 + Math.random() * (this.height - 120),
                r: 9
            };
            if (Math.hypot(s.x - this.hole.x, s.y - this.hole.y) > 110) {
                this.star = s;
                return;
            }
        }
        this.star = { x: 80, y: 80, r: 9 };
    }

    thrust(p, dt) {
        p.vx += Math.cos(p.a) * 380 * dt;
        p.vy += Math.sin(p.a) * 380 * dt;
    }

    updateShip(p, turnL, turnR, thrustKey, isCpu, dt) {
        const rot = 3.5 * dt;
        if (isCpu) {
            const toHole = Math.hypot(this.hole.x - p.x, this.hole.y - p.y);
            const toStar = Math.atan2(this.star.y - p.y, this.star.x - p.x);
            const escape = Math.atan2(p.y - this.hole.y, p.x - this.hole.x);
            const target = toHole < 130 ? escape : toStar;
            let diff = target - p.a;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) > 0.12) p.a += Math.sign(diff) * rot;
            else this.thrust(p, dt);
        } else {
            if (Input.isDown(turnL)) p.a -= rot;
            if (Input.isDown(turnR)) p.a += rot;
            if (Input.isDown(thrustKey)) this.thrust(p, dt);
        }

        const pull = 220 / Math.max(80, Math.hypot(this.hole.x - p.x, this.hole.y - p.y));
        const ha = Math.atan2(this.hole.y - p.y, this.hole.x - p.x);
        p.vx += Math.cos(ha) * pull;
        p.vy += Math.sin(ha) * pull;
        p.vx *= 0.992;
        p.vy *= 0.992;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 60) p.y = this.height;
        if (p.y > this.height) p.y = 60;

        if (Math.hypot(p.x - this.hole.x, p.y - this.hole.y) < p.r + this.hole.r - 8) {
            return 'hole';
        }
        if (Math.hypot(p.x - this.star.x, p.y - this.star.y) < p.r + this.star.r) {
            return 'star';
        }
        return null;
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        const r1 = this.updateShip(this.p1, 'KeyA', 'KeyD', 'Space', false, dt);
        const r2 = this.updateShip(this.p2, 'ArrowLeft', 'ArrowRight', 'Enter', GameManager.isSinglePlayer, dt);

        if (r1 === 'star') {
            this.scoreP1++;
            this.spawnStar();
            AudioManager.correct();
            if (this.scoreP1 >= 10) GameManager.gameOver(1);
        } else if (r1 === 'hole') {
            this.scoreP2 += 2;
            this.msg = 'P1 sucked in! +2 CPU';
            AudioManager.wrong();
            this.resetRound();
            this.msgTimer = 0.9;
            if (this.scoreP2 >= 10) GameManager.gameOver(2);
        }

        if (r2 === 'star') {
            this.scoreP2++;
            this.spawnStar();
            AudioManager.correct();
            if (this.scoreP2 >= 10) GameManager.gameOver(2);
        } else if (r2 === 'hole') {
            this.scoreP1 += 2;
            this.msg = GameManager.isSinglePlayer ? 'CPU sucked in! +2 P1' : 'P2 sucked in! +2 P1';
            AudioManager.correct();
            this.resetRound();
            this.msgTimer = 0.9;
            if (this.scoreP1 >= 10) GameManager.gameOver(1);
        }
    }

    drawShip(ctx, p, color, label) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-12, 10);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = Theme.fg;
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + 22);
    }

    render(ctx) {
        ctx.fillStyle = '#040810';
        ctx.fillRect(0, 0, this.width, this.height);

        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 3) * 0.1})`;
            ctx.fillRect((i * 97) % this.width, (i * 53) % this.height, 2, 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Stars: ${this.scoreP1} — ${this.scoreP2}  (first to 10)`, this.width / 2, 32);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Fall in the hole = rival gets +2', this.width / 2, 50);

        const grad = ctx.createRadialGradient(this.hole.x, this.hole.y, 8, this.hole.x, this.hole.y, this.hole.r + 30);
        grad.addColorStop(0, '#000');
        grad.addColorStop(1, 'rgba(140,82,255,0.25)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y, this.hole.r + 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y, this.hole.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.star.x, this.star.y, this.star.r, 0, Math.PI * 2);
        ctx.fill();

        this.drawShip(ctx, this.p1, Theme.p1, 'P1');
        this.drawShip(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.msg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 20px Impact';
            ctx.fillText(this.msg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('A/D turn · SPACE thrust  |  ←/→ turn · ENTER thrust', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GravityWell());
