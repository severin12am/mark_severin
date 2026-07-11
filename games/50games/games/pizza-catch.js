class GamePizzaCatch extends GameBase {
    constructor() {
        super("Pizza Catch", "Catch falling toppings on your pizza! Dodge the trash. First to 25 or highest after 45s.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.half = w / 2;
        this.timeLeft = 45;
        this.floorY = h - 70;
        this.p1 = { x: this.half * 0.5, y: this.floorY, w: 120, h: 22, face: 0 };
        this.p2 = { x: this.half * 1.5, y: this.floorY, w: 120, h: 22, face: 0 };
        this.items = [];
        this.spawnTimer = 0;
        this.spawnInterval = 0.55;
        this.flash1 = 0;
        this.flash2 = 0;
        this.combo1 = 0;
        this.combo2 = 0;
    }

    update(dt) {
        this.timeLeft -= dt;
        if (this.flash1 > 0) this.flash1 -= dt;
        if (this.flash2 > 0) this.flash2 -= dt;

        if (this.timeLeft <= 0) {
            const winner = this.scoreP1 > this.scoreP2 ? 1
                : this.scoreP2 > this.scoreP1 ? 2 : 0;
            GameManager.gameOver(winner);
            return;
        }

        this.spawnTimer += dt;
        // speed up slightly over time
        const interval = Math.max(0.32, this.spawnInterval - (45 - this.timeLeft) * 0.004);
        if (this.spawnTimer >= interval) {
            this.spawnItem();
            this.spawnTimer = 0;
        }

        const speed = 360;
        this.p1.face = 0;
        if (Input.isDown('KeyA')) { this.p1.x -= speed * dt; this.p1.face = -1; }
        if (Input.isDown('KeyD')) { this.p1.x += speed * dt; this.p1.face = 1; }
        // Space unused but allowed as tiny nudge up bounce visual only
        this.p1.x = Math.max(this.p1.w / 2 + 16, Math.min(this.half - this.p1.w / 2 - 12, this.p1.x));

        if (GameManager.isSinglePlayer) {
            this.updateCPU(dt, speed);
        } else {
            this.p2.face = 0;
            if (Input.isDown('ArrowLeft')) { this.p2.x -= speed * dt; this.p2.face = -1; }
            if (Input.isDown('ArrowRight')) { this.p2.x += speed * dt; this.p2.face = 1; }
        }
        this.p2.x = Math.max(this.half + this.p2.w / 2 + 12, Math.min(this.width - this.p2.w / 2 - 16, this.p2.x));

        for (let i = this.items.length - 1; i >= 0; i--) {
            const it = this.items[i];
            it.vy += 40 * dt;
            it.y += it.vy * dt;
            it.x += it.vx * dt;
            it.rot += it.spin * dt;

            // side walls per half
            if (it.side === 1) {
                if (it.x < 20) { it.x = 20; it.vx = Math.abs(it.vx); }
                if (it.x > this.half - 20) { it.x = this.half - 20; it.vx = -Math.abs(it.vx); }
            } else {
                if (it.x < this.half + 20) { it.x = this.half + 20; it.vx = Math.abs(it.vx); }
                if (it.x > this.width - 20) { it.x = this.width - 20; it.vx = -Math.abs(it.vx); }
            }

            const pizza = it.side === 1 ? this.p1 : this.p2;
            const caught = it.y + it.r > pizza.y - pizza.h &&
                it.y - it.r < pizza.y + 8 &&
                it.x > pizza.x - pizza.w / 2 &&
                it.x < pizza.x + pizza.w / 2;

            if (caught) {
                if (it.side === 1) {
                    this.applyCatch(1, it);
                } else {
                    this.applyCatch(2, it);
                }
                this.items.splice(i, 1);
                if (this.scoreP1 >= 25) { GameManager.gameOver(1); return; }
                if (this.scoreP2 >= 25) { GameManager.gameOver(2); return; }
                continue;
            }

            if (it.y > this.height + 40) {
                // missed good topping
                if (!it.isTrash) {
                    if (it.side === 1) this.combo1 = 0;
                    else this.combo2 = 0;
                }
                this.items.splice(i, 1);
            }
        }
    }

    applyCatch(player, it) {
        if (player === 1) {
            this.scoreP1 = Math.max(0, this.scoreP1 + it.value);
            this.flash1 = 0.2;
            if (it.isTrash) {
                this.combo1 = 0;
                AudioManager.wrong();
            } else {
                this.combo1++;
                if (this.combo1 >= 3) this.scoreP1 += 1;
                AudioManager.correct();
            }
        } else {
            this.scoreP2 = Math.max(0, this.scoreP2 + it.value);
            this.flash2 = 0.2;
            if (it.isTrash) {
                this.combo2 = 0;
                AudioManager.wrong();
            } else {
                this.combo2++;
                if (this.combo2 >= 3) this.scoreP2 += 1;
                AudioManager.correct();
            }
        }
    }

    updateCPU(dt, speed) {
        // Track nearest good item on right half; dodge trash
        let target = this.p2.x;
        let best = Infinity;
        for (const it of this.items) {
            if (it.side !== 2) continue;
            const eta = (this.p2.y - it.y) / Math.max(it.vy, 40);
            if (eta < 0 || eta > 2.2) continue;
            const predX = it.x + it.vx * eta;
            if (it.isTrash) {
                if (Math.abs(predX - this.p2.x) < this.p2.w * 0.55 && eta < 0.9) {
                    // dodge
                    target = this.p2.x + (predX > this.p2.x ? -70 : 70);
                    best = 0;
                }
                continue;
            }
            const d = Math.abs(predX - this.p2.x) + eta * 30;
            if (d < best) {
                best = d;
                // imperfect tracking
                target = predX + Math.sin(this.timeLeft * 4) * 18;
            }
        }
        const diff = target - this.p2.x;
        if (Math.abs(diff) > 6) {
            this.p2.x += Math.sign(diff) * speed * 0.82 * dt;
            this.p2.face = Math.sign(diff);
        } else {
            this.p2.face = 0;
        }
    }

    spawnItem() {
        const side = Math.random() < 0.5 ? 1 : 2;
        const types = [
            { value: 3, r: 12, isTrash: false, kind: 'pep' },
            { value: 5, r: 11, isTrash: false, kind: 'cheese' },
            { value: 4, r: 13, isTrash: false, kind: 'mush' },
            { value: -6, r: 14, isTrash: true, kind: 'trash' },
            { value: -6, r: 14, isTrash: true, kind: 'trash' }
        ];
        // slightly fewer trash early
        if (this.timeLeft > 30 && Math.random() < 0.35) {
            types.pop();
        }
        const t = types[Math.floor(Math.random() * types.length)];
        const minX = side === 1 ? 40 : this.half + 40;
        const maxX = side === 1 ? this.half - 40 : this.width - 40;
        this.items.push({
            x: minX + Math.random() * (maxX - minX),
            y: -20,
            vx: (Math.random() - 0.5) * 40,
            vy: 140 + Math.random() * 80 + (45 - this.timeLeft) * 1.5,
            r: t.r,
            value: t.value,
            isTrash: t.isTrash,
            kind: t.kind,
            side,
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 6
        });
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Split kitchen
        ctx.fillStyle = 'rgba(255,230,0,0.04)';
        ctx.fillRect(12, 50, this.half - 18, this.floorY - 50);
        ctx.fillStyle = 'rgba(140,82,255,0.05)';
        ctx.fillRect(this.half + 6, 50, this.half - 18, this.floorY - 50);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(this.half, 50);
        ctx.lineTo(this.half, this.floorY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Counter
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.floorY + 8, this.width, this.height - this.floorY - 8);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, this.floorY + 8, this.width, 3);

        this.drawPizza(ctx, this.p1, Theme.p1, this.flash1);
        this.drawPizza(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, this.flash2);

        for (const it of this.items) {
            this.drawItem(ctx, it);
        }

        // HUD
        ctx.textAlign = 'center';
        ctx.fillStyle = Theme.p1;
        ctx.font = 'bold 28px Arial';
        ctx.fillText(`${this.scoreP1}`, this.half * 0.5, 36);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillText(`${this.scoreP2}`, this.half * 1.5, 36);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`${Math.ceil(this.timeLeft)}s`, this.width / 2, 36);

        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.p1;
        ctx.fillText(this.combo1 >= 3 ? `COMBO x${this.combo1}` : 'P1', this.half * 0.5, 54);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillText(
            this.combo2 >= 3 ? `COMBO x${this.combo2}` : (GameManager.isSinglePlayer ? 'CPU' : 'P2'),
            this.half * 1.5, 54
        );

        ctx.fillStyle = Theme.accent;
        ctx.font = '13px Arial';
        ctx.fillText('A/D move pizza · catch toppings · avoid trash · 25 or time', this.width / 2, this.height - 14);
    }

    drawPizza(ctx, p, color, flash) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w / 2, p.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.w / 2 - 14, p.h - 6, 0, 0, Math.PI * 2);
        ctx.fill();
        if (flash > 0) {
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.w / 2 + 6, p.h + 4, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawItem(ctx, it) {
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot);
        if (it.isTrash) {
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(-it.r, -it.r, it.r * 2, it.r * 2);
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-it.r + 3, -it.r + 3);
            ctx.lineTo(it.r - 3, it.r - 3);
            ctx.moveTo(it.r - 3, -it.r + 3);
            ctx.lineTo(-it.r + 3, it.r - 3);
            ctx.stroke();
        } else if (it.kind === 'pep') {
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(0, 0, it.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.bg;
            ctx.beginPath();
            ctx.arc(-3, -2, 2, 0, Math.PI * 2);
            ctx.arc(3, 1, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (it.kind === 'cheese') {
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.moveTo(0, -it.r);
            ctx.lineTo(it.r, it.r);
            ctx.lineTo(-it.r, it.r);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(0, 0, it.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(0, 0, it.r * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

GameManager.registerGame(new GamePizzaCatch());
