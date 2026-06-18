class DashAttack extends GameBase {
    constructor() { super("Dash Attack", "Hold Action to charge, release to dash!"); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 100, y: this.height/2, vx: 0, vy: 0, charge: 0, dashing: 0, dirX: 1, dirY: 0, s: 20 };
        this.p2 = { x: this.width-100, y: this.height/2, vx: 0, vy: 0, charge: 0, dashing: 0, dirX: -1, dirY: 0, s: 20 };
    }
    update(dt) {
        let maxCharge = 20, speed = 3, friction = 0.9;

        let handlePlayer = (p, up, down, left, right, action) => {
            if (p.dashing > 0) {
                p.x += p.vx; p.y += p.vy;
                p.vx *= friction; p.vy *= friction;
                p.dashing--;
            } else {
                let moving = false;
                let dx = 0, dy = 0;
                if (Input.isDown(up)) { dy = -1; moving = true; }
                if (Input.isDown(down)) { dy = 1; moving = true; }
                if (Input.isDown(left)) { dx = -1; moving = true; }
                if (Input.isDown(right)) { dx = 1; moving = true; }

                if (moving) { p.dirX = dx; p.dirY = dy; }

                if (Input.isDown(action)) {
                    p.charge = Math.min(maxCharge, p.charge + 0.5);
                } else {
                    if (p.charge > 5) { // release
                        let mag = Math.hypot(p.dirX, p.dirY) || 1;
                        p.vx = (p.dirX / mag) * p.charge;
                        p.vy = (p.dirY / mag) * p.charge;
                        p.dashing = 30; // frames
                    } else if (moving) {
                        let mag = Math.hypot(dx, dy);
                        p.x += (dx / mag) * speed;
                        p.y += (dy / mag) * speed;
                    }
                    p.charge = 0;
                }
            }
            p.x = Math.max(p.s, Math.min(this.width - p.s, p.x));
            p.y = Math.max(p.s, Math.min(this.height - p.s, p.y));
        };

        handlePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space');

        if (GameManager.isSinglePlayer) {
            // AI
            if (this.p2.dashing > 0) {
                this.p2.x += this.p2.vx; this.p2.y += this.p2.vy;
                this.p2.vx *= friction; this.p2.vy *= friction;
                this.p2.dashing--;
            } else {
                let dist = Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y);
                this.p2.dirX = this.p1.x - this.p2.x; this.p2.dirY = this.p1.y - this.p2.y;
                if (dist < 200 && this.p2.charge < 15) {
                    this.p2.charge += 0.5; // charge
                } else if (this.p2.charge >= 15) {
                    let mag = Math.hypot(this.p2.dirX, this.p2.dirY) || 1;
                    this.p2.vx = (this.p2.dirX / mag) * this.p2.charge;
                    this.p2.vy = (this.p2.dirY / mag) * this.p2.charge;
                    this.p2.dashing = 30;
                    this.p2.charge = 0;
                } else {
                    let mag = Math.hypot(this.p2.dirX, this.p2.dirY) || 1;
                    this.p2.x += (this.p2.dirX / mag) * speed;
                    this.p2.y += (this.p2.dirY / mag) * speed;
                }
            }
            this.p2.x = Math.max(this.p2.s, Math.min(this.width - this.p2.s, this.p2.x));
            this.p2.y = Math.max(this.p2.s, Math.min(this.height - this.p2.s, this.p2.y));
        } else {
            handlePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter');
        }

        // Collision
        if (Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.s + this.p2.s) {
            if (this.p1.dashing > 0 && this.p2.dashing <= 0) {
                this.scoreP1++; if (this.scoreP1 >= 3) GameManager.gameOver(1); else this.resetRound();
            } else if (this.p2.dashing > 0 && this.p1.dashing <= 0) {
                this.scoreP2++; if (this.scoreP2 >= 3) GameManager.gameOver(2); else this.resetRound();
            } else if (this.p1.dashing > 0 && this.p2.dashing > 0) {
                // bounce
                this.p1.vx *= -1; this.p1.vy *= -1;
                this.p2.vx *= -1; this.p2.vy *= -1;
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = this.p1.dashing > 0 ? Theme.accent : Theme.p1;
        ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s + this.p1.charge/2, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = this.p2.dashing > 0 ? Theme.accent : Theme.p2;
        ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s + this.p2.charge/2, 0, Math.PI*2); ctx.fill();
    }
}
GameManager.registerGame(new DashAttack());