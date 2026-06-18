class GameCoinRush extends GameBase {
    constructor() {
        super("Coin Rush", "Grab 10 coins first! Bump your rival. WASD vs Arrows.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: 120, y: h / 2, r: 22 };
        this.p2 = { x: w - 120, y: h / 2, r: 22 };
        this.coinPulse = 0;
        this.spawnCoin();
    }

    spawnCoin() {
        let attempts = 0;
        do {
            this.coin = {
                x: 80 + Math.random() * (this.width - 160),
                y: 80 + Math.random() * (this.height - 160),
                r: 14
            };
            attempts++;
        } while (attempts < 20 && (
            Math.hypot(this.coin.x - this.p1.x, this.coin.y - this.p1.y) < 80 ||
            Math.hypot(this.coin.x - this.p2.x, this.coin.y - this.p2.y) < 80
        ));
    }

    update(dt) {
        const speed = 300 * dt;
        this.coinPulse += dt * 6;

        if (Input.isDown('KeyW')) this.p1.y -= speed;
        if (Input.isDown('KeyS')) this.p1.y += speed;
        if (Input.isDown('KeyA')) this.p1.x -= speed;
        if (Input.isDown('KeyD')) this.p1.x += speed;

        if (GameManager.isSinglePlayer) {
            const dx = this.coin.x - this.p2.x;
            const dy = this.coin.y - this.p2.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.p2.x += (dx / dist) * speed * 0.82;
            this.p2.y += (dy / dist) * speed * 0.82;
            // CPU nudges player occasionally
            const pdx = this.p1.x - this.p2.x;
            const pdy = this.p1.y - this.p2.y;
            const pdist = Math.hypot(pdx, pdy);
            if (pdist < 100 && pdist > 0) {
                this.p2.x -= (pdx / pdist) * speed * 0.3;
                this.p2.y -= (pdy / pdist) * speed * 0.3;
            }
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= speed;
            if (Input.isDown('ArrowDown')) this.p2.y += speed;
            if (Input.isDown('ArrowLeft')) this.p2.x -= speed;
            if (Input.isDown('ArrowRight')) this.p2.x += speed;
        }

        const push = (a, b) => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            const minDist = a.r + b.r;
            if (dist < minDist && dist > 0) {
                const overlap = (minDist - dist) / 2;
                a.x -= (dx / dist) * overlap;
                a.y -= (dy / dist) * overlap;
                b.x += (dx / dist) * overlap;
                b.y += (dy / dist) * overlap;
            }
        };
        push(this.p1, this.p2);

        const clamp = (p) => {
            p.x = Math.max(p.r + 10, Math.min(this.width - p.r - 10, p.x));
            p.y = Math.max(p.r + 10, Math.min(this.height - p.r - 10, p.y));
        };
        clamp(this.p1);
        clamp(this.p2);

        const collect = (player, scoreField) => {
            if (Math.hypot(player.x - this.coin.x, player.y - this.coin.y) < player.r + this.coin.r) {
                this[scoreField]++;
                AudioManager.correct();
                this.spawnCoin();
            }
        };
        collect(this.p1, 'scoreP1');
        collect(this.p2, 'scoreP2');

        if (this.scoreP1 >= 10 || this.scoreP2 >= 10) {
            GameManager.gameOver(this.scoreP1 >= 10 ? 1 : 2);
        }
    }

    render(ctx) {
        ctx.fillStyle = '#1e2a1e';
        ctx.fillRect(0, 0, this.width, this.height);

        // Arena border
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, this.width - 24, this.height - 24);

        // Coin sparkle
        const pulse = 1 + Math.sin(this.coinPulse) * 0.15;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.coin.x, this.coin.y, this.coin.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8dc';
        ctx.beginPath();
        ctx.arc(this.coin.x - 4, this.coin.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.accent;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("$", this.coin.x, this.coin.y + 6);

        this.drawPlayer(ctx, this.p1, Theme.p1, 'P1');
        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        this.drawPlayer(ctx, this.p2, p2Color, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("First to 10 coins", this.width / 2, 36);
    }

    drawPlayer(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, p.x, p.y + 5);
    }
}

GameManager.registerGame(new GameCoinRush());
