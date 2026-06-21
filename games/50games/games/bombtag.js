class BombTag extends GameBase {
    constructor() {
        super("Bomb Tag", "Pass the bomb before it blows! First to 3 round wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.startRound();
    }

    startRound() {
        this.p1 = { x: 180, y: this.height / 2, s: 22 };
        this.p2 = { x: this.width - 180, y: this.height / 2, s: 22 };
        this.holder = Math.random() < 0.5 ? 1 : 2;
        this.fuseMax = 6 + Math.random() * 6;
        this.fuse = this.fuseMax;
        this.passCd = 0;
        this.exploded = false;
        this.roundMsg = '';
        this.resultTimer = 0;
    }

    update(dt) {
        if (this.exploded) {
            this.resultTimer += dt;
            if (this.resultTimer > 1.4) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        const base = 220 * dt;
        const p1Spd = base * (this.holder === 1 ? 1.12 : 1);
        const p2Spd = base * (this.holder === 2 ? 1.12 : 1);

        if (Input.isDown('KeyW')) this.p1.y -= p1Spd;
        if (Input.isDown('KeyS')) this.p1.y += p1Spd;
        if (Input.isDown('KeyA')) this.p1.x -= p1Spd;
        if (Input.isDown('KeyD')) this.p1.x += p1Spd;

        if (GameManager.isSinglePlayer) {
            const target = this.holder === 2 ? this.p1 : this.p2;
            const flee = this.holder === 1;
            const dx = flee ? this.p2.x - this.p1.x : this.p1.x - this.p2.x;
            const dy = flee ? this.p2.y - this.p1.y : this.p1.y - this.p2.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.p2.x += (dx / dist) * p2Spd * (flee ? 1.05 : 0.92);
            this.p2.y += (dy / dist) * p2Spd * (flee ? 1.05 : 0.92);
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= p2Spd;
            if (Input.isDown('ArrowDown')) this.p2.y += p2Spd;
            if (Input.isDown('ArrowLeft')) this.p2.x -= p2Spd;
            if (Input.isDown('ArrowRight')) this.p2.x += p2Spd;
        }

        [this.p1, this.p2].forEach(p => {
            p.x = Math.max(60, Math.min(this.width - 60, p.x));
            p.y = Math.max(90, Math.min(this.height - 60, p.y));
        });

        this.passCd = Math.max(0, this.passCd - dt);
        if (this.passCd <= 0 && Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.s + this.p2.s + 6) {
            this.holder = this.holder === 1 ? 2 : 1;
            this.passCd = 0.35;
            AudioManager.select();
        }

        const urgency = 1 - this.fuse / this.fuseMax;
        this.fuse -= dt * (1 + urgency * 2.5);
        if (this.fuse <= 0) {
            this.exploded = true;
            this.resultTimer = 0;
            if (this.holder === 1) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 WINS ROUND!';
            } else {
                this.scoreP1++;
                this.roundMsg = 'P1 WINS ROUND!';
            }
            AudioManager.wrong();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 80, this.width - 80, this.height - 120);

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

        const holder = this.holder === 1 ? this.p1 : this.p2;
        const pulse = 10 + Math.sin(Date.now() * 0.02 * (1 + (1 - this.fuse / this.fuseMax) * 4)) * 4;
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(holder.x, holder.y - 28, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 12px Arial';
        ctx.fillText('BOMB', holder.x, holder.y - 24);

        const barW = 280;
        const bx = this.width / 2 - barW / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(bx, 24, barW, 16);
        ctx.fillStyle = this.fuse / this.fuseMax < 0.25 ? Theme.p1 : Theme.accent;
        ctx.fillRect(bx, 24, barW * Math.max(0, this.fuse / this.fuseMax), 16);
        ctx.strokeStyle = Theme.fg;
        ctx.strokeRect(bx, 24, barW, 16);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Round wins: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 56);
        ctx.font = '14px Arial';
        ctx.fillText('Bump rival to pass — fuse ticks faster over time!', this.width / 2, this.height - 14);

        if (this.exploded) {
            ctx.fillStyle = 'rgba(255,40,40,0.55)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 40px Impact';
            ctx.fillText('BOOM!', this.width / 2, this.height / 2 - 10);
            ctx.font = '22px Arial';
            ctx.fillStyle = Theme.fg;
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2 + 30);
        }
    }
}

GameManager.registerGame(new BombTag());
