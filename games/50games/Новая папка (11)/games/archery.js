class Archery extends GameBase {
    constructor() { super("Archery", "Shoot the moving target. First to 5 wins."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { y: h / 2, charge: 0, cd: 0 };
        this.p2 = { y: h / 2, charge: 0, cd: 0 };
        this.target = { y: h / 2, dir: 1, speed: 3, size: 40 };
        this.arrows =[];
    }
    update(dt) {
        let speed = 5, maxCharge = 20;

        // Target movement
        this.target.y += this.target.dir * this.target.speed;
        if (this.target.y < 50 || this.target.y > this.height - 50) this.target.dir *= -1;

        // P1
        if (this.p1.cd > 0) this.p1.cd--;
        if (Input.isDown('KeyW') && this.p1.y > 20) this.p1.y -= speed;
        if (Input.isDown('KeyS') && this.p1.y < this.height - 20) this.p1.y += speed;
        if (Input.isDown('Space') && this.p1.cd <= 0) {
            this.p1.charge = Math.min(this.p1.charge + 0.5, maxCharge);
        } else if (this.p1.charge > 0) {
            this.arrows.push({ x: 50, y: this.p1.y, vx: this.p1.charge, owner: 1 });
            this.p1.charge = 0;
            this.p1.cd = 30;
        }

        // P2 & AI
        if (this.p2.cd > 0) this.p2.cd--;
        if (GameManager.isSinglePlayer) {
            let dy = this.target.y - this.p2.y;
            if (Math.abs(dy) > 10) this.p2.y += Math.sign(dy) * (speed * 0.8);
            if (Math.abs(dy) < 30 && this.p2.cd <= 0) {
                this.p2.charge += 1;
                if (this.p2.charge > 15) {
                    this.arrows.push({ x: this.width - 50, y: this.p2.y, vx: -this.p2.charge, owner: 2 });
                    this.p2.charge = 0;
                    this.p2.cd = 40;
                }
            } else { this.p2.charge = 0; }
        } else {
            if (Input.isDown('ArrowUp') && this.p2.y > 20) this.p2.y -= speed;
            if (Input.isDown('ArrowDown') && this.p2.y < this.height - 20) this.p2.y += speed;
            if (Input.isDown('Enter') && this.p2.cd <= 0) {
                this.p2.charge = Math.min(this.p2.charge + 0.5, maxCharge);
            } else if (this.p2.charge > 0) {
                this.arrows.push({ x: this.width - 50, y: this.p2.y, vx: -this.p2.charge, owner: 2 });
                this.p2.charge = 0;
                this.p2.cd = 30;
            }
        }

        // Arrows & Collisions
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            let a = this.arrows[i];
            a.x += a.vx;
            if (a.x < 0 || a.x > this.width) { this.arrows.splice(i, 1); continue; }
            
            // Hit Target
            if (Math.abs(a.x - this.width / 2) < 20 && Math.abs(a.y - this.target.y) < this.target.size / 2) {
                if (a.owner === 1) this.scoreP1++; else this.scoreP2++;
                this.arrows.splice(i, 1);
                this.target.speed += 0.5; // gets faster
                if (this.scoreP1 >= 5) GameManager.gameOver(1);
                if (this.scoreP2 >= 5) GameManager.gameOver(2);
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        // Target
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.width / 2 - 10, this.target.y - this.target.size / 2, 20, this.target.size);

        // Players
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(20, this.p1.y - 20, 10, 40);
        ctx.fillRect(35, this.p1.y - 2, this.p1.charge * 2, 4);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.width - 30, this.p2.y - 20, 10, 40);
        ctx.fillRect(this.width - 35 - this.p2.charge * 2, this.p2.y - 2, this.p2.charge * 2, 4);

        // Arrows
        ctx.fillStyle = Theme.fg;
        this.arrows.forEach(a => {
            ctx.fillRect(a.x - 10, a.y - 2, 20, 4);
        });
    }
}
GameManager.registerGame(new Archery());