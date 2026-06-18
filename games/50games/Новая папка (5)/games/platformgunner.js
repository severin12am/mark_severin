class PlatformGunner extends GameBase {
    constructor() { super("Platform Gunner", "Jump and shoot. First to 5 wins."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.platforms =[
            { x: 0, y: h - 40, w: w, h: 40 },
            { x: w/2 - 100, y: h - 180, w: 200, h: 20 },
            { x: 50, y: h - 300, w: 150, h: 20 },
            { x: w - 200, y: h - 300, w: 150, h: 20 }
        ];
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 100, y: 100, vx: 0, vy: 0, w: 20, h: 30, grounded: false, dir: 1, cd: 0 };
        this.p2 = { x: this.width - 100, y: 100, vx: 0, vy: 0, w: 20, h: 30, grounded: false, dir: -1, cd: 0 };
        this.bullets =[];
    }
    update(dt) {
        let grav = 0.5, speed = 4, jump = -10;
        this.p1.cd--; this.p2.cd--;

        // P1
        if (Input.isDown('KeyA')) { this.p1.vx = -speed; this.p1.dir = -1; }
        else if (Input.isDown('KeyD')) { this.p1.vx = speed; this.p1.dir = 1; }
        else this.p1.vx = 0;
        if (Input.isDown('KeyW') && this.p1.grounded) { this.p1.vy = jump; this.p1.grounded = false; }
        if (Input.isDown('Space') && this.p1.cd <= 0) {
            this.bullets.push({ x: this.p1.x, y: this.p1.y + 10, vx: this.p1.dir * 10, owner: 1 });
            this.p1.cd = 40;
        }

        // P2
        if (GameManager.isSinglePlayer) {
            if (this.p2.x < this.p1.x - 50) { this.p2.vx = speed; this.p2.dir = 1; }
            else if (this.p2.x > this.p1.x + 50) { this.p2.vx = -speed; this.p2.dir = -1; }
            else this.p2.vx = 0;
            if (this.p2.grounded && Math.random() < 0.02) { this.p2.vy = jump; this.p2.grounded = false; }
            if (this.p2.cd <= 0 && Math.abs(this.p1.y - this.p2.y) < 30) {
                this.bullets.push({ x: this.p2.x, y: this.p2.y + 10, vx: this.p2.dir * 10, owner: 2 });
                this.p2.cd = 40;
            }
        } else {
            if (Input.isDown('ArrowLeft')) { this.p2.vx = -speed; this.p2.dir = -1; }
            else if (Input.isDown('ArrowRight')) { this.p2.vx = speed; this.p2.dir = 1; }
            else this.p2.vx = 0;
            if (Input.isDown('ArrowUp') && this.p2.grounded) { this.p2.vy = jump; this.p2.grounded = false; }
            if (Input.isDown('Enter') && this.p2.cd <= 0) {
                this.bullets.push({ x: this.p2.x, y: this.p2.y + 10, vx: this.p2.dir * 10, owner: 2 });
                this.p2.cd = 40;
            }
        }

        // Physics & Collisions
        [this.p1, this.p2].forEach(p => {
            p.vy += grav; p.x += p.vx; p.y += p.vy;
            p.grounded = false;
            
            // Screen wrap horizontally
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;

            this.platforms.forEach(plat => {
                if (p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y + p.h > plat.y && p.y < plat.y + plat.h) {
                    if (p.vy > 0 && p.y + p.h - p.vy <= plat.y + 1) {
                        p.y = plat.y - p.h; p.vy = 0; p.grounded = true;
                    }
                }
            });
        });

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx;
            if (b.x < 0 || b.x > this.width) { this.bullets.splice(i, 1); continue; }
            
            if (b.owner !== 1 && b.x > this.p1.x && b.x < this.p1.x + this.p1.w && b.y > this.p1.y && b.y < this.p1.y + this.p1.h) {
                this.scoreP2++; if (this.scoreP2 >= 5) GameManager.gameOver(2); else this.resetRound(); break;
            }
            if (b.owner !== 2 && b.x > this.p2.x && b.x < this.p2.x + this.p2.w && b.y > this.p2.y && b.y < this.p2.y + this.p2.h) {
                this.scoreP1++; if (this.scoreP1 >= 5) GameManager.gameOver(1); else this.resetRound(); break;
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = Theme.fg;
        this.platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
        
        ctx.fillStyle = Theme.p1; ctx.fillRect(this.p1.x, this.p1.y, this.p1.w, this.p1.h);
        ctx.fillStyle = Theme.p2; ctx.fillRect(this.p2.x, this.p2.y, this.p2.w, this.p2.h);
        
        ctx.fillStyle = Theme.accent;
        this.bullets.forEach(b => ctx.fillRect(b.x, b.y - 2, 8, 4));
    }
}
GameManager.registerGame(new PlatformGunner());