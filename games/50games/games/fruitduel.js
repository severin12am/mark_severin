class FruitDuel extends GameBase {
    constructor() {
        super("Fruit Duel", "Catch fruits, dodge bombs! First to 15 points.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: this.width * 0.28, y: this.height - 55, w: 70, h: 18 };
        this.p2 = { x: this.width * 0.72, y: this.height - 55, w: 70, h: 18 };
        this.items = [];
        this.spawnTimer = 0;
        this.spawnRate = 0.45;
        this.speedMul = 1;
        this.popups = [];
        this.roundTime = 0;
    }

    spawnItem() {
        const roll = Math.random();
        let type = 'fruit';
        let value = 1;
        if (roll < 0.18) { type = 'bomb'; value = -2; }
        else if (roll < 0.26) { type = 'golden'; value = 3; }
        this.items.push({
            x: 40 + Math.random() * (this.width - 80),
            y: -20,
            vy: (120 + Math.random() * 80) * this.speedMul,
            type,
            value,
            r: type === 'bomb' ? 14 : 16
        });
    }

    catchItem(item, player) {
        if (player === 1) {
            this.scoreP1 = Math.max(0, this.scoreP1 + item.value);
        } else {
            this.scoreP2 = Math.max(0, this.scoreP2 + item.value);
        }
        const bx = player === 1 ? this.p1.x : this.p2.x;
        this.popups.push({
            x: bx,
            y: this.height - 90,
            text: item.value > 0 ? `+${item.value}` : `${item.value}`,
            color: item.value > 0 ? Theme.accent : Theme.p1,
            life: 0.6
        });
        if (item.value > 0) AudioManager.correct();
        else AudioManager.wrong();
    }

    update(dt) {
        const move = 320 * dt;
        this.roundTime += dt;
        this.speedMul = 1 + Math.min(1.2, this.roundTime * 0.015);

        if (Input.isDown('KeyA')) this.p1.x = Math.max(this.p1.w / 2 + 10, this.p1.x - move);
        if (Input.isDown('KeyD')) this.p1.x = Math.min(this.width / 2 - 30, this.p1.x + move);

        if (GameManager.isSinglePlayer) {
            let target = null;
            let bestY = -1;
            for (const item of this.items) {
                if (item.type === 'bomb') continue;
                if (item.x > this.width / 2 + 20 && item.y > bestY) {
                    bestY = item.y;
                    target = item;
                }
            }
            if (target) {
                if (this.p2.x < target.x - 8) this.p2.x += move * 0.82;
                else if (this.p2.x > target.x + 8) this.p2.x -= move * 0.82;
            }
            for (const item of this.items) {
                if (item.type === 'bomb' && Math.abs(item.x - this.p2.x) < 50 && item.y > this.height - 160) {
                    if (this.p2.x < item.x) this.p2.x -= move * 0.9;
                    else this.p2.x += move * 0.9;
                }
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x = Math.max(this.width / 2 + 30, this.p2.x - move);
            if (Input.isDown('ArrowRight')) this.p2.x = Math.min(this.width - this.p2.w / 2 - 10, this.p2.x + move);
        }

        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnRate) {
            this.spawnTimer = 0;
            this.spawnRate = Math.max(0.22, 0.45 - this.roundTime * 0.004);
            this.spawnItem();
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.vy * dt;

            if (item.y > this.height + 30) {
                this.items.splice(i, 1);
                continue;
            }

            const hitP1 = Math.abs(this.p1.x - item.x) < this.p1.w / 2 + item.r &&
                Math.abs(this.p1.y - item.y) < 28;
            const hitP2 = Math.abs(this.p2.x - item.x) < this.p2.w / 2 + item.r &&
                Math.abs(this.p2.y - item.y) < 28;

            if (hitP1 && item.x < this.width / 2) {
                this.catchItem(item, 1);
                this.items.splice(i, 1);
            } else if (hitP2 && item.x > this.width / 2) {
                this.catchItem(item, 2);
                this.items.splice(i, 1);
            }
        }

        this.popups.forEach(p => { p.y -= 40 * dt; p.life -= dt; });
        this.popups = this.popups.filter(p => p.life > 0);

        if (this.scoreP1 >= 15) GameManager.gameOver(1);
        if (this.scoreP2 >= 15) GameManager.gameOver(2);
    }

    drawBasket(ctx, b, color, label) {
        ctx.fillStyle = color;
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, b.x, b.y + 28);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = 'rgba(255,230,0,0.06)';
        ctx.fillRect(0, 0, this.width, this.height - 80);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 60);
        ctx.lineTo(this.width / 2, this.height - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        this.items.forEach(item => {
            if (item.type === 'bomb') {
                ctx.fillStyle = Theme.fg;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = Theme.bg;
                ctx.fillRect(item.x - 5, item.y - 5, 10, 10);
            } else if (item.type === 'golden') {
                ctx.fillStyle = Theme.accent;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.r + 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = Theme.fg;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = Theme.p2;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        this.drawBasket(ctx, this.p1, Theme.p1, 'P1');
        this.drawBasket(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        this.popups.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 22px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.globalAlpha = 1;
        });

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}  —  ${this.scoreP2}   (first to 15)`, this.width / 2, 36);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Golden +3  |  Fruit +1  |  Bomb -2  |  Stay on your side!', this.width / 2, 58);
        ctx.fillStyle = Theme.fg;
        ctx.fillText('P1: A/D   |   P2: ←/→', this.width / 2, this.height - 14);
    }
}

GameManager.registerGame(new FruitDuel());
