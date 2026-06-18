class SeaBattle extends GameBase {
    constructor() { super("Sea Battle", "Broadside combat! First to 5 hits."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 50, y: this.height/2, cd: 0 };
        this.p2 = { x: this.width-50, y: this.height/2, cd: 0 };
        this.balls =[];
    }
    update(dt) {
        let speed = 3;
        
        if (this.p1.cd > 0) this.p1.cd--;
        if (this.p2.cd > 0) this.p2.cd--;

        // P1
        if (Input.isDown('KeyW') && this.p1.y > 30) this.p1.y -= speed;
        if (Input.isDown('KeyS') && this.p1.y < this.height-30) this.p1.y += speed;
        if (Input.isDown('Space') && this.p1.cd <= 0) {
            this.balls.push({x: this.p1.x + 20, y: this.p1.y, vx: 8, owner: 1});
            this.p1.cd = 40;
        }

        // P2 / AI
        if (GameManager.isSinglePlayer) {
            let dy = this.p1.y - this.p2.y;
            if (Math.abs(dy) > 10) this.p2.y += Math.sign(dy) * (speed * 0.8);
            if (Math.abs(dy) < 50 && this.p2.cd <= 0) {
                this.balls.push({x: this.p2.x - 20, y: this.p2.y, vx: -8, owner: 2});
                this.p2.cd = 50;
            }
        } else {
            if (Input.isDown('ArrowUp') && this.p2.y > 30) this.p2.y -= speed;
            if (Input.isDown('ArrowDown') && this.p2.y < this.height-30) this.p2.y += speed;
            if (Input.isDown('Enter') && this.p2.cd <= 0) {
                this.balls.push({x: this.p2.x - 20, y: this.p2.y, vx: -8, owner: 2});
                this.p2.cd = 40;
            }
        }

        for (let i = this.balls.length - 1; i >= 0; i--) {
            let b = this.balls[i];
            b.x += b.vx;
            if (b.x < 0 || b.x > this.width) { this.balls.splice(i, 1); continue; }

            if (b.owner === 2 && Math.abs(b.x - this.p1.x) < 20 && Math.abs(b.y - this.p1.y) < 30) {
                this.scoreP2++; this.balls.splice(i, 1);
                if (this.scoreP2 >= 5) GameManager.gameOver(2);
            } else if (b.owner === 1 && Math.abs(b.x - this.p2.x) < 20 && Math.abs(b.y - this.p2.y) < 30) {
                this.scoreP1++; this.balls.splice(i, 1);
                if (this.scoreP1 >= 5) GameManager.gameOver(1);
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        // Ships
        ctx.fillStyle = Theme.p1;
        ctx.beginPath(); ctx.moveTo(this.p1.x - 15, this.p1.y - 30); ctx.lineTo(this.p1.x + 15, this.p1.y); ctx.lineTo(this.p1.x - 15, this.p1.y + 30); ctx.fill();

        ctx.fillStyle = Theme.p2;
        ctx.beginPath(); ctx.moveTo(this.p2.x + 15, this.p2.y - 30); ctx.lineTo(this.p2.x - 15, this.p2.y); ctx.lineTo(this.p2.x + 15, this.p2.y + 30); ctx.fill();

        // Cannons
        ctx.fillStyle = Theme.accent;
        this.balls.forEach(b => {
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill();
        });
    }
}
GameManager.registerGame(new SeaBattle());