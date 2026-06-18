class LumberjackChop extends GameBase {
    constructor() {
        super("Lumberjack Chop", "Mash buttons to chop — dodge falling branches!");
    }

    init(w, h) {
        super.init(w, h);
        this.resetRound();
    }

    resetRound() {
        this.treeHealth = 100;
        this.p1Side = 0;   // 0 = left, 1 = right
        this.p2Side = 1;

        this.branches = [];
        this.branchTimer = 0;
        this.branchInterval = 80;

        this.p1Hits = 0;
        this.p2Hits = 0;
    }

    update(dt) {
        const delta = dt / 16;

        this.branchTimer += delta;
        if (this.branchTimer > this.branchInterval) {
            this.branches.push({
                side: Math.random() < 0.5 ? 0 : 1,
                y: -40,
                speed: 2.8 + Math.random() * 0.7
            });
            this.branchTimer = 0;
            this.branchInterval *= 0.97; // slowly faster
        }

        // Move branches down
        for (let b of this.branches) {
            b.y += b.speed * delta;
            if (b.y > 300 && !b.hit) {
                // branch passed safe zone
                if ((b.side === 0 && this.p1Side === 0) || (b.side === 1 && this.p1Side === 1)) {
                    GameManager.gameOver(2);
                    return;
                }
                if ((b.side === 0 && this.p2Side === 0) || (b.side === 1 && this.p2Side === 1)) {
                    GameManager.gameOver(1);
                    return;
                }
            }
        }

        // ──────────────── Player 1 ────────────────
        if (Input.isJustPressed('KeyA')) this.p1Side = 0;
        if (Input.isJustPressed('KeyD')) this.p1Side = 1;
        if (Input.isJustPressed('Space')) {
            this.p1Hits++;
            this.treeHealth -= 1.4;
        }

        // ──────────────── Player 2 or CPU ────────────────
        if (GameManager.isSinglePlayer) {
            // Dumb but amusing CPU
            if (Math.random() < 0.04) this.p2Side = 1 - this.p2Side;
            if (Math.random() < 0.13) {
                this.p2Hits++;
                this.treeHealth -= 1.2;
            }
        } else {
            if (Input.isJustPressed('ArrowLeft'))  this.p2Side = 0;
            if (Input.isJustPressed('ArrowRight')) this.p2Side = 1;
            if (Input.isJustPressed('Enter')) {
                this.p2Hits++;
                this.treeHealth -= 1.4;
            }
        }

        if (this.treeHealth <= 0) {
            if (this.p1Hits > this.p2Hits) GameManager.gameOver(1);
            else if (this.p2Hits > this.p1Hits) GameManager.gameOver(2);
            else GameManager.gameOver(0);
        }
    }

    render(ctx) {
        const centerX = this.width / 2;
        const treeBaseY = this.height - 120;

        // Tree trunk
        ctx.fillStyle = "#4a3728";
        ctx.fillRect(centerX - 50, treeBaseY - 380, 100, 380);

        // Tree top (falling animation placeholder — simple)
        ctx.fillStyle = "#2e6b2e";
        ctx.beginPath();
        ctx.moveTo(centerX - 80, treeBaseY - 380);
        ctx.lineTo(centerX, treeBaseY - 460);
        ctx.lineTo(centerX + 80, treeBaseY - 380);
        ctx.closePath();
        ctx.fill();

        // Health bar
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(centerX - 100, 40, (this.treeHealth / 100) * 200, 24);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - 100, 40, 200, 24);

        // Players / lumberjacks
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(centerX - 180 + this.p1Side * 200 - 30, treeBaseY - 60, 60, 100);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(centerX - 180 + this.p2Side * 200 - 30, treeBaseY - 60, 60, 100);

        // Branches
        for (let b of this.branches) {
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(centerX - 140 + b.side * 200, treeBaseY - 380 + b.y, 80, 30);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MASH + DODGE", this.width / 2, this.height - 30);
    }
}

GameManager.registerGame(new LumberjackChop());