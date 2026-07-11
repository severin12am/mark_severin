class GoldMiner extends GameBase {
    constructor() {
        super("Gold Miner", "Swing the claw, grab gold! Highest score after 50s or first to 60.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.half = w / 2;
        this.timeLeft = 50;
        this.flashTimer = 0;
        this.popups = [];
        this.dirtY = h * 0.52;

        this.p1 = this.makeMiner(this.half * 0.5);
        this.p2 = this.makeMiner(this.half * 1.5);

        this.nuggets = [];
        this.spawnNuggets(10);
    }

    makeMiner(anchorX) {
        return {
            ax: anchorX,
            angle: 0,
            angVel: 1.7 + Math.random() * 0.15,
            phase: Math.random() * Math.PI * 2,
            state: 'swing', // swing | drop | retract
            len: 40,
            maxLen: this.height * 0.75,
            held: null,
            dropCd: 0
        };
    }

    spawnNuggets(n) {
        for (let i = 0; i < n; i++) {
            const side = i % 2;
            const value = Math.random() < 0.2 ? 12 + Math.floor(Math.random() * 10)
                : 4 + Math.floor(Math.random() * 8);
            const size = 8 + value * 0.7;
            this.nuggets.push({
                x: side === 0
                    ? 30 + Math.random() * (this.half - 60)
                    : this.half + 30 + Math.random() * (this.half - 60),
                y: this.dirtY + 30 + Math.random() * (this.height - this.dirtY - 50),
                size,
                value,
                rock: Math.random() < 0.18
            });
            if (this.nuggets[this.nuggets.length - 1].rock) {
                this.nuggets[this.nuggets.length - 1].value = 1;
                this.nuggets[this.nuggets.length - 1].size = 16 + Math.random() * 10;
            }
        }
    }

    clawPos(m) {
        const rad = m.angle;
        return {
            x: m.ax + Math.sin(rad) * m.len,
            y: 78 + Math.cos(rad) * m.len
        };
    }

    dropClaw(m) {
        if (m.state === 'swing' && m.dropCd <= 0) {
            m.state = 'drop';
            AudioManager.select();
        }
    }

    updateMiner(m, isP1, dt) {
        if (m.dropCd > 0) m.dropCd -= dt;

        if (m.state === 'swing') {
            m.phase += m.angVel * dt;
            m.angle = Math.sin(m.phase) * 0.95;
            m.len = 48;
        } else if (m.state === 'drop') {
            const slow = m.held ? 0.55 : 1;
            m.len += 380 * slow * dt;
            const claw = this.clawPos(m);
            for (let i = 0; i < this.nuggets.length; i++) {
                const n = this.nuggets[i];
                // only grab own side
                if (isP1 && n.x > this.half - 4) continue;
                if (!isP1 && n.x < this.half + 4) continue;
                if (Math.hypot(n.x - claw.x, n.y - claw.y) < n.size + 14) {
                    m.held = this.nuggets.splice(i, 1)[0];
                    m.state = 'retract';
                    AudioManager.tick();
                    break;
                }
            }
            if (m.len > m.maxLen || claw.y > this.height - 20) {
                m.state = 'retract';
            }
        } else if (m.state === 'retract') {
            const slow = m.held ? (m.held.rock ? 0.35 : 0.55 + m.held.size * 0.01) : 1.1;
            m.len -= 300 * slow * dt;
            if (m.len <= 48) {
                m.len = 48;
                m.state = 'swing';
                m.dropCd = 0.15;
                if (m.held) {
                    const pts = m.held.rock ? 1 : m.held.value;
                    if (isP1) this.scoreP1 += pts;
                    else this.scoreP2 += pts;
                    this.popups.push({
                        x: m.ax,
                        y: 100,
                        text: m.held.rock ? '+1 rock' : `+${pts}`,
                        life: 0.7,
                        color: m.held.rock ? Theme.fg : Theme.accent
                    });
                    if (m.held.rock) AudioManager.wrong();
                    else AudioManager.correct();
                    m.held = null;
                    // respawn one nugget on that side
                    this.spawnNuggets(1);
                    // fix last spawn side
                    const last = this.nuggets[this.nuggets.length - 1];
                    if (isP1 && last.x > this.half) last.x -= this.half;
                    if (!isP1 && last.x < this.half) last.x += this.half;
                }
            }
        }
    }

    checkWin() {
        if (this.scoreP1 >= 60) {
            GameManager.gameOver(1);
            return true;
        }
        if (this.scoreP2 >= 60) {
            GameManager.gameOver(2);
            return true;
        }
        return false;
    }

    update(dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            if (this.scoreP1 > this.scoreP2) GameManager.gameOver(1);
            else if (this.scoreP2 > this.scoreP1) GameManager.gameOver(2);
            else GameManager.gameOver(0);
            return;
        }
        if (this.flashTimer > 0) this.flashTimer -= dt;

        if (Input.isDown('Space')) this.dropClaw(this.p1);

        if (GameManager.isSinglePlayer) {
            if (this.p2.state === 'swing') {
                const claw = this.clawPos(this.p2);
                let best = null;
                let bestV = 0;
                for (const n of this.nuggets) {
                    if (n.x < this.half || n.rock) continue;
                    const dx = Math.abs(n.x - claw.x);
                    if (dx < 38 && n.value > bestV) {
                        bestV = n.value;
                        best = n;
                    }
                }
                // imperfect: sometimes drop early / late
                if (best && Math.random() < 0.06) this.dropClaw(this.p2);
                else if (!best && Math.random() < 0.008) this.dropClaw(this.p2);
            }
        } else if (Input.isDown('Enter')) {
            this.dropClaw(this.p2);
        }

        this.updateMiner(this.p1, true, dt);
        this.updateMiner(this.p2, false, dt);

        for (let i = this.popups.length - 1; i >= 0; i--) {
            this.popups[i].y -= 30 * dt;
            this.popups[i].life -= dt;
            if (this.popups[i].life <= 0) this.popups.splice(i, 1);
        }

        if (this.checkWin()) return;
    }

    drawMiner(ctx, m, color, label) {
        const claw = this.clawPos(m);

        // miner head / winch
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(m.ax, 62, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, m.ax, 48);

        // rope
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(m.ax, 74);
        ctx.lineTo(claw.x, claw.y);
        ctx.stroke();

        // claw
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(claw.x - 12, claw.y);
        ctx.lineTo(claw.x + 12, claw.y);
        ctx.lineTo(claw.x + 8, claw.y + 14);
        ctx.lineTo(claw.x - 8, claw.y + 14);
        ctx.closePath();
        ctx.fill();

        if (m.held) {
            ctx.fillStyle = m.held.rock ? Theme.fg : Theme.accent;
            ctx.beginPath();
            ctx.arc(claw.x, claw.y + 16 + m.held.size * 0.3, m.held.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // sky gradient band
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, 0, this.width, this.dirtY);

        // dirt
        ctx.fillStyle = 'rgba(139, 90, 43, 0.35)';
        if (Theme.fg) {
            ctx.fillStyle = Theme.fg;
            ctx.globalAlpha = 0.18;
        }
        ctx.fillRect(0, this.dirtY, this.width, this.height - this.dirtY);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.dirtY);
        ctx.lineTo(this.width, this.dirtY);
        ctx.stroke();

        // divider
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.half, 0);
        ctx.lineTo(this.half, this.height);
        ctx.stroke();

        // platform bars
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(this.p1.ax - 28, 74, 56, 6);
        ctx.fillRect(this.p2.ax - 28, 74, 56, 6);

        for (const n of this.nuggets) {
            ctx.fillStyle = n.rock ? Theme.fg : Theme.accent;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
            ctx.fill();
            if (!n.rock) {
                ctx.fillStyle = Theme.bg;
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(String(n.value), n.x, n.y + 3);
            }
        }

        this.drawMiner(ctx, this.p1, Theme.p1, 'P1');
        this.drawMiner(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        for (const p of this.popups) {
            ctx.globalAlpha = Math.max(0, p.life * 1.4);
            ctx.fillStyle = p.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.half * 0.5, 28);
        ctx.fillText(`${this.scoreP2}`, this.half * 1.5, 28);
        ctx.fillStyle = Theme.accent;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`${Math.ceil(this.timeLeft)}s`, this.width / 2, 28);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.fg;
        ctx.fillText('SPACE / ENTER drop claw · first to 60 or most when time ends', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GoldMiner());
