class BiggerFish extends GameBase {
    constructor() {
        super("Bigger Fish", "Eat smaller fish to grow. Eat the other player to win!");
    }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        
        this.p1 = { x: 100, y: h/2, r: 15, vx: 0, vy: 0 };
        this.p2 = { x: w - 100, y: h/2, r: 15, vx: 0, vy: 0 };
        
        this.npcs = [];
        for (let i = 0; i < 20; i++) this.spawnNPC();
        
        this.food = [];
        for (let i = 0; i < 30; i++) this.spawnFood();
    }

    spawnNPC() {
        this.npcs.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            r: 5 + Math.random() * 30,
            vx: (Math.random() - 0.5) * 100,
            vy: (Math.random() - 0.5) * 100
        });
    }

    spawnFood() {
        this.food.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            r: 3
        });
    }

    update(dt) {
        let handleInput = (p, up, down, left, right, isAI) => {
            let speed = 600 / (p.r * 0.1); // Slower as you get bigger
            if (isAI) {
                // Find nearest edible thing
                let target = null; let minDist = Infinity;
                for(let f of this.food) {
                    let d = Math.hypot(f.x - p.x, f.y - p.y);
                    if(d < minDist) { minDist = d; target = f; }
                }
                for(let n of this.npcs) {
                    if(n.r < p.r) {
                        let d = Math.hypot(n.x - p.x, n.y - p.y);
                        if(d < minDist) { minDist = d; target = n; }
                    }
                }
                if (target) {
                    if(target.x < p.x) p.vx -= speed * dt;
                    if(target.x > p.x) p.vx += speed * dt;
                    if(target.y < p.y) p.vy -= speed * dt;
                    if(target.y > p.y) p.vy += speed * dt;
                }
            } else {
                if (Input.isDown(up)) p.vy -= speed * dt;
                if (Input.isDown(down)) p.vy += speed * dt;
                if (Input.isDown(left)) p.vx -= speed * dt;
                if (Input.isDown(right)) p.vx += speed * dt;
            }
            p.vx *= 0.95; p.vy *= 0.95;
            p.x += p.vx * dt; p.y += p.vy * dt;

            // Boundaries
            if (p.x < p.r) p.x = p.r; if (p.x > this.width - p.r) p.x = this.width - p.r;
            if (p.y < p.r) p.y = p.r; if (p.y > this.height - p.r) p.y = this.height - p.r;
        };

        handleInput(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', false);
        handleInput(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', GameManager.isSinglePlayer);

        // Update NPCs
        for (let n of this.npcs) {
            n.x += n.vx * dt; n.y += n.vy * dt;
            if (n.x < 0 || n.x > this.width) n.vx *= -1;
            if (n.y < 0 || n.y > this.height) n.vy *= -1;
        }

        // Collision logic
        let checkEat = (eater, target, isFood) => {
            if (eater.r > target.r * 1.1) {
                let dist = Math.hypot(eater.x - target.x, eater.y - target.y);
                if (dist < eater.r) {
                    eater.r += isFood ? 0.5 : target.r * 0.2;
                    return true;
                }
            }
            return false;
        };

        // Players eating Food
        this.food = this.food.filter(f => {
            if (checkEat(this.p1, f, true)) { this.scoreP1++; return false; }
            if (checkEat(this.p2, f, true)) { this.scoreP2++; return false; }
            return true;
        });
        while(this.food.length < 30) this.spawnFood();

        // Players eating NPCs
        this.npcs = this.npcs.filter(n => {
            if (checkEat(this.p1, n, false)) { this.scoreP1 += 5; return false; }
            if (checkEat(this.p2, n, false)) { this.scoreP2 += 5; return false; }
            return true;
        });
        while(this.npcs.length < 20) this.spawnNPC();

        // Players eating each other
        if (checkEat(this.p1, this.p2, false)) GameManager.gameOver(1);
        if (checkEat(this.p2, this.p1, false)) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.fg;
        for (let f of this.food) {
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
        }

        ctx.lineWidth = 3;
        for (let n of this.npcs) {
            ctx.fillStyle = "#888"; ctx.strokeStyle = Theme.fg;
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        }

        let drawFish = (p, color) => {
            ctx.fillStyle = color; ctx.strokeStyle = Theme.fg;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // Eye
            ctx.fillStyle = Theme.fg;
            ctx.beginPath(); ctx.arc(p.x + p.r/2, p.y - p.r/3, p.r/5, 0, Math.PI*2); ctx.fill();
        };

        drawFish(this.p1, Theme.p1);
        drawFish(this.p2, GameManager.isSinglePlayer ? "#8C52FF" : Theme.p2);
    }
}
GameManager.registerGame(new BiggerFish());