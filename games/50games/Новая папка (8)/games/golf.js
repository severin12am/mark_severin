class SpeedGolf extends GameBase {
    constructor() { super("Speed Golf", "Putt into the center hole. First to 3."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.hole = { x: this.width/2, y: this.height/2, r: 15 };
        this.b1 = { x: 50, y: 50, vx: 0, vy: 0, charge: 0, aiming: true, angle: 0 };
        this.b2 = { x: this.width-50, y: this.height-50, vx: 0, vy: 0, charge: 0, aiming: true, angle: Math.PI };
        this.obs =[
            {x: this.width/2 - 100, y: this.height/4, w: 200, h: 20},
            {x: this.width/2 - 100, y: this.height*0.75, w: 200, h: 20}
        ];
    }
    update(dt) {
        let friction = 0.95;

        let handleBall = (b, action, left, right, isAI) => {
            if (b.aiming) {
                if (!isAI) {
                    if (Input.isDown(left)) b.angle -= 0.05;
                    if (Input.isDown(right)) b.angle += 0.05;
                    if (Input.isDown(action)) b.charge = Math.min(20, b.charge + 0.5);
                    else if (b.charge > 0) {
                        b.vx = Math.cos(b.angle) * b.charge;
                        b.vy = Math.sin(b.angle) * b.charge;
                        b.charge = 0; b.aiming = false;
                    }
                }
            } else {
                b.vx *= friction; b.vy *= friction;
                b.x += b.vx; b.y += b.vy;
                if (Math.hypot(b.vx, b.vy) < 0.2) { b.vx = 0; b.vy = 0; b.aiming = true; }
                
                // Walls
                if (b.x < 10) { b.x = 10; b.vx *= -1; }
                if (b.x > this.width-10) { b.x = this.width-10; b.vx *= -1; }
                if (b.y < 10) { b.y = 10; b.vy *= -1; }
                if (b.y > this.height-10) { b.y = this.height-10; b.vy *= -1; }

                // Obs
                this.obs.forEach(o => {
                    if (b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) {
                        if (Math.abs(b.x - o.x) < 10 || Math.abs(b.x - (o.x+o.w)) < 10) b.vx *= -1;
                        else b.vy *= -1;
                        b.x += b.vx; b.y += b.vy;
                    }
                });
            }
        };

        handleBall(this.b1, 'Space', 'KeyA', 'KeyD', false);

        if (GameManager.isSinglePlayer) {
            if (this.b2.aiming) {
                let tx = this.hole.x - this.b2.x, ty = this.hole.y - this.b2.y;
                let targetAngle = Math.atan2(ty, tx);
                // Simplify AI aiming
                this.b2.angle = targetAngle;
                this.b2.charge += 0.5;
                if (this.b2.charge >= Math.hypot(tx, ty) * 0.05 + 5) {
                    this.b2.vx = Math.cos(this.b2.angle) * this.b2.charge;
                    this.b2.vy = Math.sin(this.b2.angle) * this.b2.charge;
                    this.b2.charge = 0; this.b2.aiming = false;
                }
            }
            handleBall(this.b2, 'Enter', 'ArrowLeft', 'ArrowRight', true);
        } else {
            handleBall(this.b2, 'Enter', 'ArrowLeft', 'ArrowRight', false);
        }

        // Check Hole
        if (Math.hypot(this.b1.x - this.hole.x, this.b1.y - this.hole.y) < this.hole.r) {
            this.scoreP1++; if (this.scoreP1 >= 3) GameManager.gameOver(1); else this.resetRound();
        } else if (Math.hypot(this.b2.x - this.hole.x, this.b2.y - this.hole.y) < this.hole.r) {
            this.scoreP2++; if (this.scoreP2 >= 3) GameManager.gameOver(2); else this.resetRound();
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = Theme.fg;
        ctx.beginPath(); ctx.arc(this.hole.x, this.hole.y, this.hole.r, 0, Math.PI*2); ctx.fill();
        this.obs.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));

        let drawBall = (b, color) => {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI*2); ctx.fill();
            if (b.aiming) {
                ctx.strokeStyle = color; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(b.x, b.y);
                ctx.lineTo(b.x + Math.cos(b.angle)*30, b.y + Math.sin(b.angle)*30);
                ctx.stroke();
                if (b.charge > 0) {
                    ctx.fillStyle = Theme.accent;
                    ctx.beginPath(); ctx.arc(b.x + Math.cos(b.angle)*b.charge*2, b.y + Math.sin(b.angle)*b.charge*2, 4, 0, Math.PI*2); ctx.fill();
                }
            }
        };

        drawBall(this.b1, Theme.p1);
        drawBall(this.b2, Theme.p2);
    }
}
GameManager.registerGame(new SpeedGolf());