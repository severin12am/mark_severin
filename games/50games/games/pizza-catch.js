// pizza-catch.js
class PizzaCatch extends GameBase {
    constructor() {
        super("Pizza Catch", "Catch falling toppings on your pizza! Dodge the trash. First to 25 or highest after 45s.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.width = w;
        this.height = h;
        this.half = w / 2;
        this.timeLeft = 45;

        this.p1Pizza = {x: this.half * 0.5 - 70, y: 480, width: 140, height: 30};
        this.p2Pizza = {x: this.half * 1.5 - 70, y: 480, width: 140, height: 30};

        this.items = [];
        this.spawnTimer = 0;
    }

    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            const winner = this.scoreP1 > this.scoreP2 ? 1 : (this.scoreP2 > this.scoreP1 ? 2 : 0);
            GameManager.gameOver(winner);
            return;
        }

        // Spawn
        this.spawnTimer += dt;
        if (this.spawnTimer > 0.6) {
            this.spawnItem();
            this.spawnTimer = 0;
        }

        // P1
        if (Input.isDown('KeyA')) this.p1Pizza.x -= 340 * dt;
        if (Input.isDown('KeyD')) this.p1Pizza.x += 340 * dt;
        this.p1Pizza.x = Math.max(30, Math.min(this.half - this.p1Pizza.width - 20, this.p1Pizza.x));

        // P2 or CPU
        if (GameManager.isSinglePlayer) {
            let targetX = this.p2Pizza.x + this.p2Pizza.width / 2;
            let closest = Infinity;
            for (let item of this.items) {
                if (item.value > 0 && item.x > this.half) {
                    let d = Math.abs(item.x - targetX);
                    if (d < closest) {
                        closest = d;
                        targetX = item.x + (Math.random() * 26 - 13);
                    }
                }
            }
            if (this.p2Pizza.x + this.p2Pizza.width / 2 < targetX) this.p2Pizza.x += 290 * dt * 0.88;
            else if (this.p2Pizza.x + this.p2Pizza.width / 2 > targetX) this.p2Pizza.x -= 290 * dt * 0.88;
        } else {
            if (Input.isDown('ArrowLeft')) this.p2Pizza.x -= 340 * dt;
            if (Input.isDown('ArrowRight')) this.p2Pizza.x += 340 * dt;
        }
        this.p2Pizza.x = Math.max(this.half + 20, Math.min(this.width - this.p2Pizza.width - 30, this.p2Pizza.x));

        // Update items
        for (let i = this.items.length - 1; i >= 0; i--) {
            let it = this.items[i];
            it.y += 190 * dt;
            it.angle += 3 * dt;

            let caughtP1 = it.y + it.r > this.p1Pizza.y && it.y - it.r < this.p1Pizza.y + this.p1Pizza.height &&
                           it.x > this.p1Pizza.x && it.x < this.p1Pizza.x + this.p1Pizza.width;
            let caughtP2 = it.y + it.r > this.p2Pizza.y && it.y - it.r < this.p2Pizza.y + this.p2Pizza.height &&
                           it.x > this.p2Pizza.x && it.x < this.p2Pizza.x + this.p2Pizza.width;

            if (caughtP1 || caughtP2) {
                let points = it.value;
                if (caughtP1) this.scoreP1 += points;
                else this.scoreP2 += points;
                if (this.scoreP1 < 0) this.scoreP1 = 0;
                if (this.scoreP2 < 0) this.scoreP2 = 0;
                this.items.splice(i, 1);
                if (this.scoreP1 >= 25) GameManager.gameOver(1);
                if (this.scoreP2 >= 25) GameManager.gameOver(2);
                continue;
            }
            if (it.y > this.height + 40) this.items.splice(i, 1);
        }
    }

    spawnItem() {
        const x = 50 + Math.random() * (this.width - 100);
        const types = [
            {value: 4, r: 13, isTrash: false}, // pepperoni
            {value: 6, r: 11, isTrash: false}, // cheese
            {value: 5, r: 14, isTrash: false}, // mushroom
            {value: -7, r: 15, isTrash: true}
        ];
        const t = types[Math.floor(Math.random() * types.length)];
        this.items.push({x, y: -20, value: t.value, r: t.r, angle: 0, isTrash: t.isTrash});
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Divider
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(this.half, 0);
        ctx.lineTo(this.half, this.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pizzas
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(this.p1Pizza.x, this.p1Pizza.y, this.p1Pizza.width, this.p1Pizza.height);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.p1Pizza.x + 12, this.p1Pizza.y + 6, this.p1Pizza.width - 24, 10);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(this.p2Pizza.x, this.p2Pizza.y, this.p2Pizza.width, this.p2Pizza.height);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.p2Pizza.x + 12, this.p2Pizza.y + 6, this.p2Pizza.width - 24, 10);

        // Items
        for (let it of this.items) {
            ctx.save();
            ctx.translate(it.x, it.y);
            ctx.rotate(it.angle);
            ctx.fillStyle = it.isTrash ? Theme.fg : Theme.accent;
            ctx.beginPath();
            ctx.arc(0, 0, it.r, 0, Math.PI * 2);
            ctx.fill();
            if (it.isTrash) {
                ctx.strokeStyle = Theme.bg;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-8, -8);
                ctx.lineTo(8, 8);
                ctx.moveTo(8, -8);
                ctx.lineTo(-8, 8);
                ctx.stroke();
            }
            ctx.restore();
        }

        // HUD
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`P1 ${this.scoreP1}`, this.half * 0.5, 45);
        ctx.fillText(`P2 ${this.scoreP2}`, this.half * 1.5, 45);
        ctx.fillText(Math.ceil(this.timeLeft) + "s", this.width / 2, 45);
        if (GameManager.isSinglePlayer) ctx.fillText("CPU", this.width - 70, 80);
    }
}

GameManager.registerGame(new PizzaCatch());