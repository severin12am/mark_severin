// games/pactag.js
class PacTag extends GameBase {
    constructor() {
        super("Pac-Tag", "Tag the other player — longest survival wins!");
        this.reset();
    }

    reset() {
        this.players = [
            { x: 200, y: 300, color: Theme.p1, isHunter: true, score: 0 },
            { x: 600, y: 300, color: Theme.p2, isHunter: false, score: 0 }
        ];
        this.timeLeft = 45;
        this.scoreP1 = 0;
        this.scoreP2 = 0;
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            // time up — hunter wins
            let hunter = this.players[0].isHunter ? 0 : 1;
            if (hunter === 0) this.scoreP1++; else this.scoreP2++;
            GameManager.gameOver(hunter === 0 ? 1 : 2);
            return;
        }

        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            let speed = p.isHunter ? 210 : 245; // runner slightly faster

            let dx = 0, dy = 0;
            const keys = i === 0 ?
                {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'} :
                (GameManager.isSinglePlayer ? {} : {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'});

            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.up)) dy -= 1;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.down)) dy += 1;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.left)) dx -= 1;
            if ((!GameManager.isSinglePlayer || i === 0) && Input.isDown(keys.right)) dx += 1;

            if (GameManager.isSinglePlayer && i === 1) {
                // CPU flees or chases depending on role
                let target = this.players[0];
                dx = (p.isHunter ? target.x - p.x : p.x - target.x);
                dy = (p.isHunter ? target.y - p.y : p.y - target.y);
            }

            let len = Math.hypot(dx, dy) || 1;
            p.x += (dx / len) * speed * dt;
            p.y += (dy / len) * speed * dt;

            p.x = Math.max(40, Math.min(this.width - 40, p.x));
            p.y = Math.max(40, Math.min(this.height - 40, p.y));
        }

        // tag collision
        let p1 = this.players[0];
        let p2 = this.players[1];
        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 48) {
            // swap roles
            let temp = p1.isHunter;
            p1.isHunter = p2.isHunter;
            p2.isHunter = temp;

            // small survival bonus
            if (p1.isHunter) this.scoreP1 += 0.3;
            else this.scoreP2 += 0.3;
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // timer
        ctx.fillStyle = Theme.accent;
        ctx.font = "bold 32px Bungee";
        ctx.textAlign = "center";
        ctx.fillText(Math.ceil(this.timeLeft) + "s", 400, 70);

        for (let p of this.players) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
            ctx.fill();

            // role indicator
            ctx.fillStyle = p.isHunter ? "#fff" : Theme.accent;
            ctx.font = "bold 18px Space Grotesk";
            ctx.fillText(p.isHunter ? "HUNTER" : "RUNNER", p.x, p.y - 52);
        }
    }
}

GameManager.registerGame(new PacTag());