class WreckingBall extends GameBase {
    constructor() { super("Wrecking Ball", "Swing your flail into the opponent. First to 3."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 200, y: this.height/2, s: 15 };
        this.p2 = { x: this.width-200, y: this.height/2, s: 15 };
        this.b1 = { x: 150, y: this.height/2, vx: 0, vy: 0, s: 12 };
        this.b2 = { x: this.width-150, y: this.height/2, vx: 0, vy: 0, s: 12 };
    }
    update(dt) {
        let speed = 4;
        
        if (Input.isDown('KeyW')) this.p1.y -= speed;
        if (Input.isDown('KeyS')) this.p1.y += speed;
        if (Input.isDown('KeyA')) this.p1.x -= speed;
        if (Input.isDown('KeyD')) this.p1.x += speed;

        if (GameManager.isSinglePlayer) {
            if (this.p2.x < this.p1.x) this.p2.x += speed*0.8; else this.p2.x -= speed*0.8;
            if (this.p2.y < this.p1.y) this.p2.y += speed*0.8; else this.p2.y -= speed*0.8;
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= speed;
            if (Input.isDown('ArrowDown')) this.p2.y += speed;
            if (Input.isDown('ArrowLeft')) this.p2.x -= speed;
            if (Input.isDown('ArrowRight')) this.p2.x += speed;
        }[this.p1, this.p2].forEach(p => {
            p.x = Math.max(p.s, Math.min(this.width - p.s, p.x));
            p.y = Math.max(p.s, Math.min(this.height - p.s, p.y));
        });

        // Spring physics for balls
        let spring = 0.05, damp = 0.94;
        let updateBall = (b, p) => {
            b.vx += (p.x - b.x) * spring; b.vy += (p.y - b.y) * spring;
            b.vx *= damp; b.vy *= damp;
            b.x += b.vx; b.y += b.vy;
        };
        updateBall(this.b1, this.p1);
        updateBall(this.b2, this.p2);

        // Collisions
        let speedB1 = Math.hypot(this.b1.vx, this.b1.vy);
        let speedB2 = Math.hypot(this.b2.vx, this.b2.vy);

        if (speedB1 > 3 && Math.hypot(this.b1.x - this.p2.x, this.b1.y - this.p2.y) < this.b1.s + this.p2.s) {
            this.scoreP1++; if (this.scoreP1 >= 3) GameManager.gameOver(1); else this.resetRound();
        }
        if (speedB2 > 3 && Math.hypot(this.b2.x - this.p1.x, this.b2.y - this.p1.y) < this.b2.s + this.p1.s) {
            this.scoreP2++; if (this.scoreP2 >= 3) GameManager.gameOver(2); else this.resetRound();
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.strokeStyle = Theme.fg; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.p1.x, this.p1.y); ctx.lineTo(this.b1.x, this.b1.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(this.p2.x, this.p2.y); ctx.lineTo(this.b2.x, this.b2.y); ctx.stroke();

        ctx.fillStyle = Theme.p1;
        ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath(); ctx.arc(this.b1.x, this.b1.y, this.b1.s, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = Theme.p2;
        ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath(); ctx.arc(this.b2.x, this.b2.y, this.b2.s, 0, Math.PI*2); ctx.fill();
    }
}
GameManager.registerGame(new WreckingBall());