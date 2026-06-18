class WhackAMole extends GameBase {
    constructor() {
        super("Whack-A-Mole", "Race to whack the mole! First to 10 points.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.cols = 3;
        this.rows = 3;
        this.cellSize = 90;
        this.gridW = this.cols * this.cellSize;
        this.gridH = this.rows * this.cellSize;
        this.ox = (w - this.gridW) / 2;
        this.oy = 140;
        this.resetMole();
        this.p1 = { x: w / 4, y: h - 80, s: 18 };
        this.p2 = { x: w * 0.75, y: h - 80, s: 18 };
        this.hitFlash = 0;
        this.hitX = 0;
        this.hitY = 0;
        this.whackCd1 = 0;
        this.whackCd2 = 0;
    }

    resetMole() {
        this.activeMole = -1;
        this.moleTimer = 0;
        this.moleMaxTime = 0;
        this.molePop = 0;
        this.spawnDelay = 30 + Math.floor(Math.random() * 40);
    }

    molePos(idx) {
        const col = idx % this.cols;
        const row = Math.floor(idx / this.cols);
        return {
            x: this.ox + col * this.cellSize + this.cellSize / 2,
            y: this.oy + row * this.cellSize + this.cellSize / 2
        };
    }

    spawnMole() {
        this.activeMole = Math.floor(Math.random() * 9);
        this.moleMaxTime = 90 + Math.floor(Math.random() * 40);
        this.moleTimer = this.moleMaxTime;
        this.molePop = 0;
    }

    whack(player, px, py) {
        if (this.activeMole === -1) return;
        const m = this.molePos(this.activeMole);
        if (Math.hypot(px - m.x, py - m.y) > 42) return;

        if (player === 1) {
            if (this.whackCd1 > 0) return;
            this.whackCd1 = 15;
            this.scoreP1++;
        } else {
            if (this.whackCd2 > 0) return;
            this.whackCd2 = 15;
            this.scoreP2++;
        }

        this.hitFlash = 12;
        this.hitX = m.x;
        this.hitY = m.y;
        AudioManager.correct();
        this.resetMole();
    }

    update(dt) {
        const speed = 280 * dt;

        if (this.whackCd1 > 0) this.whackCd1--;
        if (this.whackCd2 > 0) this.whackCd2--;

        if (Input.isDown('KeyW')) this.p1.y -= speed;
        if (Input.isDown('KeyS')) this.p1.y += speed;
        if (Input.isDown('KeyA')) this.p1.x -= speed;
        if (Input.isDown('KeyD')) this.p1.x += speed;

        this.p1.x = Math.max(30, Math.min(this.width / 2 - 20, this.p1.x));
        this.p1.y = Math.max(this.oy + 20, Math.min(this.height - 40, this.p1.y));

        if (GameManager.isSinglePlayer) {
            if (this.activeMole !== -1) {
                const target = this.molePos(this.activeMole);
                const dx = target.x - this.p2.x;
                const dy = target.y - this.p2.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    this.p2.x += (dx / dist) * speed * 0.75;
                    this.p2.y += (dy / dist) * speed * 0.75;
                }
                if (dist < 38 && this.whackCd2 <= 0) {
                    this.whack(2, this.p2.x, this.p2.y);
                }
            }
            this.p2.x = Math.max(this.width / 2 + 20, Math.min(this.width - 30, this.p2.x));
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= speed;
            if (Input.isDown('ArrowDown')) this.p2.y += speed;
            if (Input.isDown('ArrowLeft')) this.p2.x -= speed;
            if (Input.isDown('ArrowRight')) this.p2.x += speed;
            this.p2.x = Math.max(this.width / 2 + 20, Math.min(this.width - 30, this.p2.x));
            this.p2.y = Math.max(this.oy + 20, Math.min(this.height - 40, this.p2.y));
        }

        if (this.activeMole === -1) {
            this.spawnDelay--;
            if (this.spawnDelay <= 0) this.spawnMole();
        } else {
            this.moleTimer--;
            this.molePop = Math.min(1, this.molePop + 0.08);
            if (this.moleTimer <= 0) {
                AudioManager.wrong();
                this.resetMole();
            }
        }

        if (Input.isDown('Space')) this.whack(1, this.p1.x, this.p1.y);
        if (!GameManager.isSinglePlayer && Input.isDown('Enter')) this.whack(2, this.p2.x, this.p2.y);

        if (this.hitFlash > 0) this.hitFlash--;

        if (this.scoreP1 >= 10) GameManager.gameOver(1);
        if (this.scoreP2 >= 10) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(0, 0, this.width, this.height);

        // Title area
        ctx.fillStyle = Theme.accent;
        ctx.font = "bold 28px Impact";
        ctx.textAlign = "center";
        ctx.fillText("WHACK-A-MOLE", this.width / 2, 50);

        // Draw holes and moles
        for (let i = 0; i < 9; i++) {
            const pos = this.molePos(i);
            // Hole
            ctx.fillStyle = '#1a3318';
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y + 20, 38, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            if (i === this.activeMole) {
                const popY = pos.y + 25 - this.molePop * 35;
                // Mole body
                ctx.fillStyle = '#8B6914';
                ctx.beginPath();
                ctx.ellipse(pos.x, popY, 28, 32, 0, 0, Math.PI * 2);
                ctx.fill();
                // Face
                ctx.fillStyle = '#5a3e1b';
                ctx.beginPath();
                ctx.ellipse(pos.x, popY - 8, 22, 20, 0, 0, Math.PI * 2);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(pos.x - 8, popY - 10, 5, 0, Math.PI * 2);
                ctx.arc(pos.x + 8, popY - 10, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(pos.x - 8, popY - 10, 2, 0, Math.PI * 2);
                ctx.arc(pos.x + 8, popY - 10, 2, 0, Math.PI * 2);
                ctx.fill();
                // Nose
                ctx.fillStyle = '#ff9999';
                ctx.beginPath();
                ctx.arc(pos.x, popY - 2, 4, 0, Math.PI * 2);
                ctx.fill();

                // Timer bar
                const barW = 60;
                ctx.fillStyle = '#333';
                ctx.fillRect(pos.x - barW / 2, pos.y - 55, barW, 6);
                ctx.fillStyle = this.moleTimer < 30 ? '#ff4444' : Theme.accent;
                ctx.fillRect(pos.x - barW / 2, pos.y - 55, barW * (this.moleTimer / this.moleMaxTime), 6);
            }
        }

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 32px Impact";
            ctx.textAlign = "center";
            ctx.fillText("WHACK!", this.hitX, this.hitY - 50);
        }

        // Player cursors (hammers)
        this.drawHammer(ctx, this.p1.x, this.p1.y, Theme.p1, 'P1');
        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        this.drawHammer(ctx, this.p2.x, this.p2.y, p2Color, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        // Zone labels
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, this.height - 120, this.width / 2, 120);
        ctx.fillRect(this.width / 2, this.height - 120, this.width / 2, 120);

        ctx.fillStyle = Theme.fg;
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("P1: WASD + SPACE", this.width / 4, this.height - 15);
        ctx.fillText(GameManager.isSinglePlayer ? "CPU auto-whacks" : "P2: Arrows + ENTER", this.width * 0.75, this.height - 15);
    }

    drawHammer(ctx, x, y, color, label) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, x, y + 4);
        // Hammer head
        ctx.fillStyle = '#888';
        ctx.fillRect(x + 10, y - 18, 14, 10);
    }
}

GameManager.registerGame(new WhackAMole());
