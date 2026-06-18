class LumberjackChop extends GameBase {
    constructor() {
        super("Lumberjack Chop", "Chop the tree, dodge branches! First to 3 trees.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.startTree();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startTree() {
        this.treeHealth = 100;
        this.p1Side = 0;
        this.p2Side = 1;
        this.branches = [];
        this.branchTimer = 0;
        this.branchInterval = 70;
        this.p1Hits = 0;
        this.p2Hits = 0;
        this.p1ChopFlash = 0;
        this.p2ChopFlash = 0;
        this.treeDone = false;
        this.resultTimer = 0;
        this.treeEndReason = '';
    }

    update(dt) {
        if (this.treeDone) {
            this.resultTimer += dt;
            if (this.resultTimer > 1.5) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.startTree();
                }
            }
            return;
        }

        if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
            GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
            return;
        }

        this.branchTimer += dt * 60;
        if (this.branchTimer > this.branchInterval) {
            this.branches.push({
                side: Math.random() < 0.5 ? 0 : 1,
                y: 0,
                speed: 2.5 + Math.random() * 1.5,
                resolved: false
            });
            this.branchTimer = 0;
            this.branchInterval = Math.max(35, this.branchInterval * 0.97);
        }

        const playerY = 220;
        for (const b of this.branches) {
            b.y += b.speed * dt * 60;
            if (!b.resolved && b.y >= playerY) {
                b.resolved = true;
                if (b.side === this.p1Side) {
                    this.scoreP2++;
                    this.treeEndReason = 'branch_p1';
                    AudioManager.wrong();
                    this.treeDone = true;
                    this.resultTimer = 0;
                    return;
                }
                if (b.side === this.p2Side) {
                    this.scoreP1++;
                    this.treeEndReason = 'branch_p2';
                    AudioManager.wrong();
                    this.treeDone = true;
                    this.resultTimer = 0;
                    return;
                }
            }
        }
        this.branches = this.branches.filter(b => b.y < 400);

        if (this.justPressed('KeyA')) this.p1Side = 0;
        if (this.justPressed('KeyD')) this.p1Side = 1;
        if (this.justPressed('Space')) {
            this.p1Hits++;
            this.treeHealth -= 2.2;
            this.p1ChopFlash = 6;
            AudioManager.tick();
        }

        if (GameManager.isSinglePlayer) {
            const incoming = this.branches.find(b => !b.resolved && b.y > 120);
            if (incoming) this.p2Side = 1 - incoming.side;
            else if (Math.random() < 0.02) this.p2Side = 1 - this.p2Side;

            if (Math.random() < 0.14) {
                this.p2Hits++;
                this.treeHealth -= 1.8;
                this.p2ChopFlash = 6;
            }
        } else {
            if (this.justPressed('ArrowLeft')) this.p2Side = 0;
            if (this.justPressed('ArrowRight')) this.p2Side = 1;
            if (this.justPressed('Enter')) {
                this.p2Hits++;
                this.treeHealth -= 2.2;
                this.p2ChopFlash = 6;
                AudioManager.tick();
            }
        }

        if (this.p1ChopFlash > 0) this.p1ChopFlash--;
        if (this.p2ChopFlash > 0) this.p2ChopFlash--;

        if (this.treeHealth <= 0) {
            this.treeDone = true;
            this.resultTimer = 0;
            this.treeEndReason = 'chopped';
            if (this.p1Hits > this.p2Hits) {
                this.scoreP1++;
                AudioManager.correct();
            } else if (this.p2Hits > this.p1Hits) {
                this.scoreP2++;
                AudioManager.correct();
            } else {
                AudioManager.wrong();
            }
        }
    }

    render(ctx) {
        const cx = this.width / 2;
        const baseY = this.height - 100;

        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, this.width, baseY);
        ctx.fillStyle = '#5a8f3c';
        ctx.fillRect(0, baseY, this.width, this.height - baseY);

        // Tree
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(cx - 45, baseY - 340, 90, 340);
        ctx.fillStyle = '#2e6b2e';
        ctx.beginPath();
        ctx.moveTo(cx - 90, baseY - 340);
        ctx.lineTo(cx, baseY - 430);
        ctx.lineTo(cx + 90, baseY - 340);
        ctx.closePath();
        ctx.fill();

        // Health bar
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 110, 30, 220, 22);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(cx - 110, 30, (this.treeHealth / 100) * 220, 22);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - 110, 30, 220, 22);

        // Branches
        for (const b of this.branches) {
            const bx = cx - 130 + b.side * 200;
            const by = baseY - 340 + b.y;
            ctx.fillStyle = '#6b4c2a';
            ctx.fillRect(bx, by, 90, 22);
            ctx.fillStyle = '#2e6b2e';
            ctx.beginPath();
            ctx.arc(bx + (b.side === 0 ? -15 : 105), by + 10, 18, 0, Math.PI * 2);
            ctx.fill();
        }

        this.drawLumberjack(ctx, cx - 160 + this.p1Side * 200, baseY - 70, Theme.p1, this.p1ChopFlash, 'P1');
        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        this.drawLumberjack(ctx, cx - 160 + this.p2Side * 200, baseY - 70, p2Color, this.p2ChopFlash, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Trees felled: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, cx, 80);
        ctx.font = "14px Arial";
        ctx.fillText("A/D or ←/→ dodge  |  SPACE / ENTER chop", cx, this.height - 20);

        if (this.treeDone) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 32px Impact";
            let msg = 'TREE STANDS!';
            if (this.treeEndReason === 'chopped') {
                if (this.p1Hits > this.p2Hits) msg = 'P1 CHOPPED IT!';
                else if (this.p2Hits > this.p1Hits) msg = (GameManager.isSinglePlayer ? 'CPU CHOPPED IT!' : 'P2 CHOPPED IT!');
            } else if (this.treeEndReason === 'branch_p1') {
                msg = 'BRANCH HIT P1!';
            } else if (this.treeEndReason === 'branch_p2') {
                msg = 'BRANCH HIT ' + (GameManager.isSinglePlayer ? 'CPU' : 'P2') + '!';
            }
            ctx.fillText(msg, cx, this.height / 2);
            ctx.font = "20px Arial";
            ctx.fillStyle = Theme.fg;
            ctx.fillText(`Chops: P1 ${this.p1Hits} — ${this.p2Hits} ${GameManager.isSinglePlayer ? 'CPU' : 'P2'}`, cx, this.height / 2 + 35);
        }
    }

    drawLumberjack(ctx, x, y, color, flash, label) {
        ctx.fillStyle = color;
        ctx.fillRect(x - 22, y - 50, 44, 70);
        ctx.fillStyle = '#ffcc99';
        ctx.beginPath();
        ctx.arc(x, y - 62, 16, 0, Math.PI * 2);
        ctx.fill();
        if (flash > 0) {
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 20, y - 20);
            ctx.lineTo(x + 50, y - 40);
            ctx.stroke();
        }
        ctx.fillStyle = '#fff';
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, x, y + 30);
    }
}

GameManager.registerGame(new LumberjackChop());
