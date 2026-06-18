// juggling-act.js
class JugglingAct extends GameBase {
    constructor() {
        super("Juggling Act", "Keep three items in the air! Move left/right to bounce them. Most successful juggles wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.half = w / 2;
        this.timeLeft = 55;

        // P1 side (left)
        this.p1Paddle = {x: this.half * 0.5 - 55, y: h - 55, w: 110, h: 18};
        this.p1Items = this.createItems(this.half * 0.5);

        // P2 side (right)
        this.p2Paddle = {x: this.half * 1.5 - 55, y: h - 55, w: 110, h: 18};
        this.p2Items = this.createItems(this.half * 1.5);
    }

    createItems(centerX) {
        const items = [];
        for (let i = 0; i < 3; i++) {
            items.push({
                x: centerX + (i - 1) * 45,
                y: 120 + i * 55,
                vy: 80 + Math.random() * 60,
                r: 13,
                active: true
            });
        }
        return items;
    }

    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            const winner = this.scoreP1 > this.scoreP2 ? 1 : (this.scoreP2 > this.scoreP1 ? 2 : 0);
            GameManager.gameOver(winner);
            return;
        }

        // P1 controls
        if (Input.isDown('KeyA')) this.p1Paddle.x -= 380 * dt;
        if (Input.isDown('KeyD')) this.p1Paddle.x += 380 * dt;
        this.p1Paddle.x = Math.max(25, Math.min(this.half - this.p1Paddle.w - 25, this.p1Paddle.x));

        // P2 / CPU
        if (GameManager.isSinglePlayer) {
            let avgX = 0;
            let count = 0;
            for (let item of this.p2Items) {
                if (item.active) { avgX += item.x; count++; }
            }
            if (count > 0) {
                const target = avgX / count - this.p2Paddle.w / 2;
                if (this.p2Paddle.x + this.p2Paddle.w * 0.45 < target) this.p2Paddle.x += 355 * dt;
                if (this.p2Paddle.x + this.p2Paddle.w * 0.55 > target) this.p2Paddle.x -= 355 * dt;
            }
        } else {
            if (Input.isDown('ArrowLeft')) this.p2Paddle.x -= 380 * dt;
            if (Input.isDown('ArrowRight')) this.p2Paddle.x += 380 * dt;
        }
        this.p2Paddle.x = Math.max(this.half + 25, Math.min(this.width - this.p2Paddle.w - 25, this.p2Paddle.x));

        // Update P1 items
        this.updateItems(this.p1Items, this.p1Paddle, true, dt);
        // Update P2 items
        this.updateItems(this.p2Items, this.p2Paddle, false, dt);

        if (this.scoreP1 >= 40) GameManager.gameOver(1);
        if (this.scoreP2 >= 40) GameManager.gameOver(2);
    }

    updateItems(items, paddle, isP1, dt) {
        for (let item of items) {
            if (!item.active) continue;

            item.vy += 680 * dt;
            item.y += item.vy * dt;
            item.x += (Math.sin(item.y / 30) * 8) * dt; // slight wobble

            // Bounce on paddle
            if (item.vy > 0 && 
                item.y + item.r > paddle.y && 
                item.y - item.r < paddle.y + paddle.h &&
                item.x > paddle.x && item.x < paddle.x + paddle.w) {
                
                item.vy = - (260 + Math.random() * 90);
                item.y = paddle.y - item.r;
                if (isP1) this.scoreP1 += 1;
                else this.scoreP2 += 1;
            }

            // Hit ground
            if (item.y > this.height + 30) {
                item.active = false;
                if (isP1) this.scoreP1 = Math.max(0, this.scoreP1 - 3);
                else this.scoreP2 = Math.max(0, this.scoreP2 - 3);
                
                // Respawn after short delay (simulated by resetting)
                setTimeout(() => {
                    if (this.p1Items.includes(item) || this.p2Items.includes(item)) {
                        item.x = (isP1 ? this.half * 0.5 : this.half * 1.5) + (Math.random() * 80 - 40);
                        item.y = 80;
                        item.vy = 60;
                        item.active = true;
                    }
                }, 800);
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Split divider
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(this.half, 0);
        ctx.lineTo(this.half, this.height);
        ctx.stroke();

        this.drawSide(ctx, true, Theme.p1);
        this.drawSide(ctx, false, Theme.p2);

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.fillText(this.scoreP1, this.half * 0.5, 55);
        ctx.fillText(this.scoreP2, this.half * 1.5, 55);
        ctx.fillText(Math.ceil(this.timeLeft) + "s", this.width / 2, 55);
    }

    drawSide(ctx, isP1, color) {
        const ox = isP1 ? 0 : this.half;
        const paddle = isP1 ? this.p1Paddle : this.p2Paddle;
        const items = isP1 ? this.p1Items : this.p2Items;

        // Paddle
        ctx.fillStyle = color;
        ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

        // Items
        ctx.fillStyle = Theme.accent;
        for (let item of items) {
            if (!item.active) continue;
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

GameManager.registerGame(new JugglingAct());