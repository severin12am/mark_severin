class WreckingBall extends GameBase {
    constructor() {
        super("Wrecking Ball", "Swing your flail into the rival! First to 3 hits.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: 180, y: this.height / 2, s: 18, px: 0, py: 0 };
        this.p2 = { x: this.width - 180, y: this.height / 2, s: 18, px: 0, py: 0 };
        this.b1 = { x: 120, y: this.height / 2, vx: 0, vy: 0, s: 16 };
        this.b2 = { x: this.width - 120, y: this.height / 2, vx: 0, vy: 0, s: 16 };
        this.hitFlash = 0;
        this.hitX = 0;
        this.hitY = 0;
        this.roundPause = 0;
    }

    clampPlayer(p) {
        p.x = Math.max(p.s + 20, Math.min(this.width - p.s - 20, p.x));
        p.y = Math.max(p.s + 20, Math.min(this.height - p.s - 20, p.y));
    }

    updateBall(b, anchor, prevX, prevY) {
        const spring = 0.08;
        const damp = 0.92;
        const whip = 0.35;
        b.vx += (anchor.x - b.x) * spring + (anchor.x - prevX) * whip;
        b.vy += (anchor.y - b.y) * spring + (anchor.y - prevY) * whip;
        b.vx *= damp;
        b.vy *= damp;
        b.x += b.vx;
        b.y += b.vy;
        const maxLen = 110;
        const dx = b.x - anchor.x;
        const dy = b.y - anchor.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > maxLen) {
            b.x = anchor.x + (dx / dist) * maxLen;
            b.y = anchor.y + (dy / dist) * maxLen;
            b.vx *= 0.5;
            b.vy *= 0.5;
        }
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            return;
        }

        const speed = 220 * dt;
        const p1ox = this.p1.x, p1oy = this.p1.y;
        const p2ox = this.p2.x, p2oy = this.p2.y;

        if (Input.isDown('KeyW')) this.p1.y -= speed;
        if (Input.isDown('KeyS')) this.p1.y += speed;
        if (Input.isDown('KeyA')) this.p1.x -= speed;
        if (Input.isDown('KeyD')) this.p1.x += speed;

        if (GameManager.isSinglePlayer) {
            const tx = this.p1.x;
            const ty = this.p1.y;
            const dx = tx - this.p2.x;
            const dy = ty - this.p2.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.p2.x += (dx / dist) * speed * 0.78;
            this.p2.y += (dy / dist) * speed * 0.78;
            // Circle strafe
            this.p2.x += (-dy / dist) * speed * 0.25;
            this.p2.y += (dx / dist) * speed * 0.25;
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= speed;
            if (Input.isDown('ArrowDown')) this.p2.y += speed;
            if (Input.isDown('ArrowLeft')) this.p2.x -= speed;
            if (Input.isDown('ArrowRight')) this.p2.x += speed;
        }

        this.clampPlayer(this.p1);
        this.clampPlayer(this.p2);

        this.p1.px = this.p1.x - p1ox;
        this.p1.py = this.p1.y - p1oy;
        this.p2.px = this.p2.x - p2ox;
        this.p2.py = this.p2.y - p2oy;

        this.updateBall(this.b1, this.p1, p1ox, p1oy);
        this.updateBall(this.b2, this.p2, p2ox, p2oy);

        const hitSpeed = 4.5;
        const s1 = Math.hypot(this.b1.vx, this.b1.vy);
        const s2 = Math.hypot(this.b2.vx, this.b2.vy);

        if (s1 > hitSpeed && Math.hypot(this.b1.x - this.p2.x, this.b1.y - this.p2.y) < this.b1.s + this.p2.s) {
            this.scoreP1++;
            this.hitFlash = 0.5;
            this.hitX = this.p2.x;
            this.hitY = this.p2.y;
            AudioManager.correct();
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else { this.resetRound(); this.roundPause = 0.8; }
        } else if (s2 > hitSpeed && Math.hypot(this.b2.x - this.p1.x, this.b2.y - this.p1.y) < this.b2.s + this.p1.s) {
            this.scoreP2++;
            this.hitFlash = 0.5;
            this.hitX = this.p1.x;
            this.hitY = this.p1.y;
            AudioManager.correct();
            if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else { this.resetRound(); this.roundPause = 0.8; }
        }

        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    render(ctx) {
        ctx.fillStyle = '#2a2535';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, this.width - 60, this.height - 60);

        const drawChain = (ax, ay, bx, by) => {
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
        };

        drawChain(this.p1.x, this.p1.y, this.b1.x, this.b1.y);
        drawChain(this.p2.x, this.p2.y, this.b2.x, this.b2.y);

        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p2Color;
        ctx.beginPath();
        ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(this.b1.x, this.b1.y, this.b1.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.b2.x, this.b2.y, this.b2.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.b1.x, this.b1.y, this.b1.s * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.b2.x, this.b2.y, this.b2.s * 0.45, 0, Math.PI * 2);
        ctx.fill();

        if (this.hitFlash > 0) {
            ctx.fillStyle = `rgba(255,230,0,${this.hitFlash * 2})`;
            ctx.font = "bold 40px Impact";
            ctx.textAlign = "center";
            ctx.fillText("WHACK!", this.hitX, this.hitY - 30);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Move fast to build swing speed!", this.width / 2, this.height - 20);
    }
}

GameManager.registerGame(new WreckingBall());
