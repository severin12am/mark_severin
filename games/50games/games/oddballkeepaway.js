class OddballKeepaway extends GameBase {
    constructor() {
        super("Oddball", "Hold the orb to score! Tackle to steal. First to 100.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: 160, y: this.height / 2, s: 22 };
        this.p2 = { x: this.width - 160, y: this.height / 2, s: 22 };
        this.orb = { holder: 0, pulse: 0 };
        this.stealCd = 0;
        this.pickupCd = 0.5;
    }

    update(dt) {
        const base = 210 * dt;
        const p1Spd = base * (this.orb.holder === 1 ? 0.82 : 1);
        const p2Spd = base * (this.orb.holder === 2 ? 0.82 : 1);

        if (Input.isDown('KeyW')) this.p1.y -= p1Spd;
        if (Input.isDown('KeyS')) this.p1.y += p1Spd;
        if (Input.isDown('KeyA')) this.p1.x -= p1Spd;
        if (Input.isDown('KeyD')) this.p1.x += p1Spd;

        if (GameManager.isSinglePlayer) {
            if (this.orb.holder === 2) {
                const dx = this.p2.x - this.p1.x;
                const dy = this.p2.y - this.p1.y;
                const dist = Math.hypot(dx, dy) || 1;
                this.p2.x += (dx / dist) * p2Spd;
                this.p2.y += (dy / dist) * p2Spd;
            } else {
                const tx = this.orb.holder === 0 ? this.width / 2 : this.p1.x;
                const ty = this.orb.holder === 0 ? this.height / 2 : this.p1.y;
                const dx = tx - this.p2.x;
                const dy = ty - this.p2.y;
                const dist = Math.hypot(dx, dy) || 1;
                this.p2.x += (dx / dist) * p2Spd * 0.9;
                this.p2.y += (dy / dist) * p2Spd * 0.9;
            }
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= p2Spd;
            if (Input.isDown('ArrowDown')) this.p2.y += p2Spd;
            if (Input.isDown('ArrowLeft')) this.p2.x -= p2Spd;
            if (Input.isDown('ArrowRight')) this.p2.x += p2Spd;
        }

        [this.p1, this.p2].forEach(p => {
            p.x = Math.max(50, Math.min(this.width - 50, p.x));
            p.y = Math.max(90, Math.min(this.height - 50, p.y));
        });

        this.stealCd = Math.max(0, this.stealCd - dt);
        this.pickupCd = Math.max(0, this.pickupCd - dt);

        if (this.orb.holder === 0 && this.pickupCd <= 0) {
            const midX = this.width / 2;
            const midY = this.height / 2;
            if (Math.hypot(this.p1.x - midX, this.p1.y - midY) < 40) {
                this.orb.holder = 1;
                AudioManager.select();
            } else if (Math.hypot(this.p2.x - midX, this.p2.y - midY) < 40) {
                this.orb.holder = 2;
                AudioManager.select();
            }
        }

        if (this.orb.holder !== 0 && this.stealCd <= 0 &&
            Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.s + this.p2.s + 4) {
            this.orb.holder = this.orb.holder === 1 ? 2 : 1;
            this.stealCd = 0.5;
            AudioManager.correct();
            const push = 35;
            const dx = this.p2.x - this.p1.x;
            const dy = this.p2.y - this.p1.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.p1.x -= (dx / dist) * push;
            this.p1.y -= (dy / dist) * push;
            this.p2.x += (dx / dist) * push;
            this.p2.y += (dy / dist) * push;
        }

        if (this.orb.holder === 1) {
            this.scoreP1 += dt * 12;
            this.orb.pulse += dt * 8;
        } else if (this.orb.holder === 2) {
            this.scoreP2 += dt * 12;
            this.orb.pulse += dt * 8;
        }

        this.scoreP1 = Math.min(100, this.scoreP1);
        this.scoreP2 = Math.min(100, this.scoreP2);

        if (this.scoreP1 >= 100) GameManager.gameOver(1);
        if (this.scoreP2 >= 100) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(50, 80, this.width - 100, this.height - 120);
        ctx.setLineDash([]);

        const orbX = this.orb.holder === 1 ? this.p1.x : this.orb.holder === 2 ? this.p2.x : this.width / 2;
        const orbY = this.orb.holder === 0 ? this.height / 2 : (this.orb.holder === 1 ? this.p1.y : this.p2.y) - 26;
        const glow = 16 + Math.sin(this.orb.pulse) * 3;

        ctx.fillStyle = Theme.accent;
        ctx.shadowColor = Theme.accent;
        ctx.shadowBlur = this.orb.holder ? 18 : 8;
        ctx.beginPath();
        ctx.arc(orbX, orbY, glow, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const drawPlayer = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + p.s + 16);
        };

        drawPlayer(this.p1, Theme.p1, 'P1');
        drawPlayer(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        const barW = 260;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(30, 24, barW, 14);
        ctx.fillRect(this.width - 30 - barW, 24, barW, 14);
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(30, 24, barW * (this.scoreP1 / 100), 14);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillRect(this.width - 30 - barW, 24, barW * (this.scoreP2 / 100), 14);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(this.scoreP1)}  —  ${Math.floor(this.scoreP2)}   (first to 100)`, this.width / 2, 56);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Carrier moves slower — bump rival to steal the orb!', this.width / 2, this.height - 14);
    }
}

GameManager.registerGame(new OddballKeepaway());
