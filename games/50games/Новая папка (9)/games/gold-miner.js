// gold-miner.js
class GoldMiner extends GameBase {
    constructor() {
        super("Gold Miner", "Swing claw to grab gold nuggets from dirt! Highest score after 60s or first to 50 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) {
            this.scoreP1 = 0;
            this.scoreP2 = 0;
        }
        this.half = w / 2;
        this.timeLeft = 60;

        // P1 (left)
        this.p1Angle = 0;
        this.p1State = "swing"; // swing, drop, retract, hold
        this.p1ClawY = 80;
        this.p1ClawX = this.half * 0.25;
        this.p1Held = null;

        // P2 (right)
        this.p2Angle = 0;
        this.p2State = "swing";
        this.p2ClawY = 80;
        this.p2ClawX = this.half * 1.25;
        this.p2Held = null;

        // Nuggets (shared but split sides)
        this.nuggets = [];
        for (let i = 0; i < 12; i++) {
            this.nuggets.push({
                x: 40 + Math.random() * (w - 80),
                y: 380 + Math.random() * 160,
                size: 12 + Math.random() * 18,
                value: Math.floor(5 + Math.random() * 15)
            });
        }
    }

    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            const winner = this.scoreP1 > this.scoreP2 ? 1 : (this.scoreP2 > this.scoreP1 ? 2 : 0);
            GameManager.gameOver(winner);
            return;
        }

        // Swing logic (shared pendulum speed)
        const swingSpeed = 1.8;
        this.p1Angle = Math.sin(Date.now() / 300) * 45;
        this.p2Angle = Math.sin(Date.now() / 320) * 45;

        // P1 controls
        if (Input.isDown('Space')) this.dropClaw(true);
        this.updateClaw(true, dt);

        // P2 or CPU
        if (GameManager.isSinglePlayer) {
            // CPU: drop when aligned with big nugget
            let bestNugget = null;
            let bestScore = 0;
            for (let n of this.nuggets) {
                if (n.x > this.half && Math.abs(n.x - this.p2ClawX) < 45 && n.value > bestScore) {
                    bestScore = n.value;
                    bestNugget = n;
                }
            }
            if (bestNugget && this.p2State === "swing" && Math.random() < 0.04) this.dropClaw(false);
        } else if (Input.isDown('Enter')) {
            this.dropClaw(false);
        }
        this.updateClaw(false, dt);

        if (this.scoreP1 >= 50) GameManager.gameOver(1);
        if (this.scoreP2 >= 50) GameManager.gameOver(2);
    }

    dropClaw(isP1) {
        const claw = isP1 ? this : this; // ref
        const state = isP1 ? "p1State" : "p2State";
        if (this[state] === "swing") this[state] = "drop";
    }

    updateClaw(isP1, dt) {
        const clawX = isP1 ? this.p1ClawX : this.p2ClawX;
        const clawY = isP1 ? this.p1ClawY : this.p2ClawY;
        const angle = isP1 ? this.p1Angle : this.p2Angle;
        let stateKey = isP1 ? "p1State" : "p2State";
        let heldKey = isP1 ? "p1Held" : "p2Held";
        let scoreKey = isP1 ? "scoreP1" : "scoreP2";

        let x = isP1 ? this.half * 0.25 + Math.sin(angle * Math.PI / 180) * 80 : this.half * 1.25 + Math.sin(angle * Math.PI / 180) * 80;
        if (this[stateKey] === "swing") {
            if (isP1) this.p1ClawX = x; else this.p2ClawX = x;
            if (isP1) this.p1ClawY = 80; else this.p2ClawY = 80;
        } else if (this[stateKey] === "drop") {
            if (isP1) this.p1ClawY += 420 * dt; else this.p2ClawY += 420 * dt;
            if ((isP1 ? this.p1ClawY : this.p2ClawY) > 520) this[stateKey] = "retract";
            // Check nugget hit
            for (let i = 0; i < this.nuggets.length; i++) {
                let n = this.nuggets[i];
                if (Math.hypot(n.x - (isP1 ? this.p1ClawX : this.p2ClawX), n.y - (isP1 ? this.p1ClawY : this.p2ClawY)) < n.size + 18) {
                    this[heldKey] = this.nuggets.splice(i, 1)[0];
                    this[stateKey] = "retract";
                    break;
                }
            }
        } else if (this[stateKey] === "retract") {
            if (isP1) this.p1ClawY -= 260 * dt; else this.p2ClawY -= 260 * dt;
            if ((isP1 ? this.p1ClawY : this.p2ClawY) < 90) {
                this[stateKey] = "swing";
                if (this[heldKey]) {
                    this[scoreKey] += this[heldKey].value;
                    this[heldKey] = null;
                    // Respawn nugget
                    this.nuggets.push({x: 40 + Math.random() * (this.width - 80), y: 380 + Math.random() * 160, size: 12 + Math.random() * 18, value: Math.floor(5 + Math.random() * 15)});
                }
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Split
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(this.half, 0);
        ctx.lineTo(this.half, this.height);
        ctx.stroke();

        // Dirt
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, 360, this.width, this.height - 360);

        this.drawMiner(ctx, true, Theme.p1);
        this.drawMiner(ctx, false, Theme.p2);

        // Nuggets
        ctx.fillStyle = Theme.accent;
        for (let n of this.nuggets) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // HUD
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText(Math.ceil(this.timeLeft) + "s", this.width / 2, 45);
        ctx.fillText(this.scoreP1, this.half * 0.5, 45);
        ctx.fillText(this.scoreP2, this.half * 1.5, 45);
    }

    drawMiner(ctx, isP1, color) {
        const ox = isP1 ? 0 : this.half;
        const clawX = isP1 ? this.p1ClawX : this.p2ClawX;
        const clawY = isP1 ? this.p1ClawY : this.p2ClawY;
        const held = isP1 ? this.p1Held : this.p2Held;

        // Arm line
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ox + this.half * 0.25, 70);
        ctx.lineTo(clawX, clawY - 12);
        ctx.stroke();

        // Claw
        ctx.fillStyle = color;
        ctx.fillRect(clawX - 14, clawY, 28, 18);

        if (held) {
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(clawX, clawY + 20, held.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

GameManager.registerGame(new GoldMiner());