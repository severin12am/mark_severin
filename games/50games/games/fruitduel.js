class FruitDuel extends GameBase {
    constructor() { super("Fruit Duel", "Catch fruits, avoid bombs! First to 15."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: w/3, y: h - 30, s: 20 };
        this.p2 = { x: w*0.66, y: h - 30, s: 20 };
        this.fruits =[];
        this.timer = 0;
    }
    update(dt) {
        let speed = 6;
        
        if (Input.isDown('KeyA') && this.p1.x > this.p1.s) this.p1.x -= speed;
        if (Input.isDown('KeyD') && this.p1.x < this.width - this.p1.s) this.p1.x += speed;

        if (GameManager.isSinglePlayer) {
            let target = null;
            for (let f of this.fruits) {
                if (f.type === 1 && (!target || f.y > target.y)) target = f;
            }
            if (target) {
                if (this.p2.x < target.x - 10) this.p2.x += speed * 0.8;
                else if (this.p2.x > target.x + 10) this.p2.x -= speed * 0.8;
            }
        } else {
            if (Input.isDown('ArrowLeft') && this.p2.x > this.p2.s) this.p2.x -= speed;
            if (Input.isDown('ArrowRight') && this.p2.x < this.width - this.p2.s) this.p2.x += speed;
        }

        // Spawn items
        this.timer++;
        if (this.timer > 30) {
            this.timer = 0;
            let isBomb = Math.random() < 0.3;
            this.fruits.push({
                x: 20 + Math.random() * (this.width - 40),
                y: -20,
                type: isBomb ? -1 : 1,
                vy: 2 + Math.random() * 3
            });
        }

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            let f = this.fruits[i];
            f.y += f.vy;

            if (f.y > this.height) { this.fruits.splice(i, 1); continue; }

            let hit = false;
            if (Math.hypot(this.p1.x - f.x, this.p1.y - f.y) < this.p1.s + 15) {
                this.scoreP1 += f.type; hit = true;
            } else if (Math.hypot(this.p2.x - f.x, this.p2.y - f.y) < this.p2.s + 15) {
                this.scoreP2 += f.type; hit = true;
            }

            if (hit) {
                this.fruits.splice(i, 1);
                this.scoreP1 = Math.max(0, this.scoreP1);
                this.scoreP2 = Math.max(0, this.scoreP2);
                if (this.scoreP1 >= 15) GameManager.gameOver(1);
                if (this.scoreP2 >= 15) GameManager.gameOver(2);
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1.x - this.p1.s, this.p1.y - this.p1.s, this.p1.s*2, this.p1.s*2);
        
        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2.x - this.p2.s, this.p2.y - this.p2.s, this.p2.s*2, this.p2.s*2);

        this.fruits.forEach(f => {
            ctx.fillStyle = f.type === 1 ? Theme.accent : Theme.fg;
            ctx.beginPath(); ctx.arc(f.x, f.y, 15, 0, Math.PI*2); ctx.fill();
            if (f.type === -1) {
                ctx.fillStyle = Theme.bg;
                ctx.fillRect(f.x - 5, f.y - 5, 10, 10);
            }
        });
    }
}
GameManager.registerGame(new FruitDuel());