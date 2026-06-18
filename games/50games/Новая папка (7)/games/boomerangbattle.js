class BoomerangBattle extends GameBase {
    constructor() { super("Boomerang Battle", "Throw boomerangs. They return to you!"); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 100, y: this.height/2, s: 20, dirX: 1, dirY: 0 };
        this.p2 = { x: this.width-100, y: this.height/2, s: 20, dirX: -1, dirY: 0 };
        this.b1 = null; this.b2 = null;
    }
    update(dt) {
        let speed = 4, bSpeed = 10, turnRate = 0.15;

        let movePlayer = (p, w, s, a, d) => {
            let dx = 0, dy = 0;
            if (Input.isDown(w)) dy = -1;
            if (Input.isDown(s)) dy = 1;
            if (Input.isDown(a)) dx = -1;
            if (Input.isDown(d)) dx = 1;
            if (dx !== 0 || dy !== 0) { p.dirX = dx; p.dirY = dy; }
            let mag = Math.hypot(dx, dy) || 1;
            p.x += (dx/mag)*speed; p.y += (dy/mag)*speed;
            p.x = Math.max(p.s, Math.min(this.width-p.s, p.x));
            p.y = Math.max(p.s, Math.min(this.height-p.s, p.y));
        };

        movePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD');
        if (Input.isDown('Space') && !this.b1) {
            let mag = Math.hypot(this.p1.dirX, this.p1.dirY);
            this.b1 = { x: this.p1.x, y: this.p1.y, vx: (this.p1.dirX/mag)*bSpeed, vy: (this.p1.dirY/mag)*bSpeed };
        }

        if (GameManager.isSinglePlayer) {
            // AI
            let dy = this.p1.y - this.p2.y;
            let dx = this.p1.x - this.p2.x;
            if (Math.abs(dy) > 10) this.p2.y += Math.sign(dy) * speed * 0.8;
            if (Math.abs(dx) > 100) this.p2.x += Math.sign(dx) * speed * 0.8;
            this.p2.dirX = -1; this.p2.dirY = 0;
            if (!this.b2 && Math.random() < 0.05) {
                this.b2 = { x: this.p2.x, y: this.p2.y, vx: -bSpeed, vy: 0 };
            }
        } else {
            movePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
            if (Input.isDown('Enter') && !this.b2) {
                let mag = Math.hypot(this.p2.dirX, this.p2.dirY);
                this.b2 = { x: this.p2.x, y: this.p2.y, vx: (this.p2.dirX/mag)*bSpeed, vy: (this.p2.dirY/mag)*bSpeed };
            }
        }

        let updateBoomerang = (b, owner, opp) => {
            if (!b) return null;
            // curve back to owner
            let tx = owner.x - b.x, ty = owner.y - b.y;
            let dist = Math.hypot(tx, ty) || 1;
            b.vx += (tx/dist) * bSpeed * turnRate;
            b.vy += (ty/dist) * bSpeed * turnRate;
            let mag = Math.hypot(b.vx, b.vy);
            b.vx = (b.vx/mag)*bSpeed; b.vy = (b.vy/mag)*bSpeed;
            b.x += b.vx; b.y += b.vy;

            if (dist < owner.s + 10) return null; // caught

            // hit opponent
            if (Math.hypot(b.x - opp.x, b.y - opp.y) < opp.s + 10) {
                if (owner === this.p1) { this.scoreP1++; if (this.scoreP1 >= 3) GameManager.gameOver(1); else this.resetRound(); }
                else { this.scoreP2++; if (this.scoreP2 >= 3) GameManager.gameOver(2); else this.resetRound(); }
            }
            return b;
        };

        this.b1 = updateBoomerang(this.b1, this.p1, this.p2);
        this.b2 = updateBoomerang(this.b2, this.p2, this.p1);
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = Theme.p1;
        ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI*2); ctx.fill();
        if (this.b1) { ctx.fillRect(this.b1.x-5, this.b1.y-5, 10, 10); }

        ctx.fillStyle = Theme.p2;
        ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI*2); ctx.fill();
        if (this.b2) { ctx.fillRect(this.b2.x-5, this.b2.y-5, 10, 10); }
    }
}
GameManager.registerGame(new BoomerangBattle());