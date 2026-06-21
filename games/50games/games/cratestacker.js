class CrateStacker extends GameBase {
    constructor() {
        super("Crate Stacker", "Catch falling crates on your stack! First to 8 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: w * 0.3, stack: [] };
        this.p2 = { x: w * 0.7, stack: [] };
        this.falling = null;
        this.dropTimer = 1.2;
        this.groundY = h - 50;
    }

    spawnCrate() {
        this.falling = {
            x: 80 + Math.random() * (this.width - 160),
            y: -40,
            size: 48 + Math.random() * 20,
            vy: 0
        };
        AudioManager.tick();
    }

    stackTop(stack) {
        if (!stack.length) return this.groundY;
        const top = stack[stack.length - 1];
        return top.y - top.size / 2;
    }

    update(dt) {
        const move = 260 * dt;
        if (Input.isDown('KeyA')) this.p1.x -= move;
        if (Input.isDown('KeyD')) this.p1.x += move;
        this.p1.x = Math.max(60, Math.min(this.width / 2 - 40, this.p1.x));

        if (GameManager.isSinglePlayer) {
            if (this.falling) {
                const tx = this.falling.x;
                this.p2.x += Math.sign(tx - this.p2.x) * Math.min(Math.abs(tx - this.p2.x), move * 0.85);
            }
            this.p2.x = Math.max(this.width / 2 + 40, Math.min(this.width - 60, this.p2.x));
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.x -= move;
            if (Input.isDown('ArrowRight')) this.p2.x += move;
            this.p2.x = Math.max(this.width / 2 + 40, Math.min(this.width - 60, this.p2.x));
        }

        this.dropTimer -= dt;
        if (!this.falling && this.dropTimer <= 0) {
            this.spawnCrate();
            this.dropTimer = 1.4 + Math.random() * 0.6;
        }

        if (this.falling) {
            this.falling.vy += 420 * dt;
            this.falling.y += this.falling.vy * dt;

            const assign = (player, side) => {
                const topY = this.stackTop(player.stack);
                const landY = topY - this.falling.size / 2;
                if (this.falling.y + this.falling.size / 2 >= landY &&
                    Math.abs(this.falling.x - player.x) < this.falling.size * 0.55 + 20) {
                    player.stack.push({
                        x: player.x,
                        y: landY,
                        size: this.falling.size
                    });
                    this.falling = null;
                    AudioManager.move();
                    if (player.stack.length >= 8) {
                        if (side === 1) {
                            this.scoreP1++;
                            GameManager.gameOver(1);
                        } else {
                            this.scoreP2++;
                            GameManager.gameOver(2);
                        }
                    }
                    return true;
                }
                return false;
            };

            if (this.falling.y > this.groundY + 40) {
                this.falling = null;
                AudioManager.wrong();
            } else {
                assign(this.p1, 1) || assign(this.p2, 2);
            }
        }
    }

    drawStack(ctx, player, color, label, flip) {
        player.stack.forEach(c => {
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 2;
            ctx.strokeRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
        });
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(player.x - 28, this.groundY + 8);
        ctx.lineTo(player.x + 28, this.groundY + 8);
        ctx.lineTo(player.x, this.groundY - 38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} (${player.stack.length}/8)`, player.x, this.groundY + 24);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Stack height race — first to 8 crates!`, this.width / 2, 32);

        ctx.strokeStyle = Theme.accent;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 50);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();

        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

        this.drawStack(ctx, this.p1, Theme.p1, 'P1', false);
        this.drawStack(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2', true);

        if (this.falling) {
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(
                this.falling.x - this.falling.size / 2,
                this.falling.y - this.falling.size / 2,
                this.falling.size,
                this.falling.size
            );
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('A/D position under falling crates · Arrows (2P)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new CrateStacker());
