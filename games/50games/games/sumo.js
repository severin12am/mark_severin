class GameSumo extends GameBase {
    constructor() {
        super("Sumo", "Charge and shove rival out of the ring! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.arenaR = 220;
        this.playerR = 32;
        this.cx = w / 2;
        this.cy = h / 2 + 20;
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: this.cx - 90, y: this.cy, vx: 0, vy: 0, angle: 0 };
        this.p2 = { x: this.cx + 90, y: this.cy, vx: 0, vy: 0, angle: Math.PI };
        this.roundMsg = '';
        this.roundPause = 0;
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        const turnSpeed = 3.5;
        const pushForce = 520;

        if (Input.isDown('KeyW')) {
            this.p1.vx += Math.cos(this.p1.angle) * pushForce * dt;
            this.p1.vy += Math.sin(this.p1.angle) * pushForce * dt;
        }
        if (Input.isDown('KeyA')) this.p1.angle -= turnSpeed * dt;
        if (Input.isDown('KeyD')) this.p1.angle += turnSpeed * dt;

        if (GameManager.isSinglePlayer) {
            const dx = this.p1.x - this.p2.x;
            const dy = this.p1.y - this.p2.y;
            const target = Math.atan2(dy, dx);
            let diff = target - this.p2.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.p2.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
            if (Math.hypot(dx, dy) < 160) {
                this.p2.vx += Math.cos(this.p2.angle) * pushForce * 0.85 * dt;
                this.p2.vy += Math.sin(this.p2.angle) * pushForce * 0.85 * dt;
            }
        } else {
            if (Input.isDown('ArrowUp')) {
                this.p2.vx += Math.cos(this.p2.angle) * pushForce * dt;
                this.p2.vy += Math.sin(this.p2.angle) * pushForce * dt;
            }
            if (Input.isDown('ArrowLeft')) this.p2.angle -= turnSpeed * dt;
            if (Input.isDown('ArrowRight')) this.p2.angle += turnSpeed * dt;
        }

        const friction = 0.9;
        [this.p1, this.p2].forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= friction;
            p.vy *= friction;
        });

        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < this.playerR * 2) {
            const nx = dx / dist;
            const ny = dy / dist;
            const sep = (this.playerR * 2 - dist) / 2;
            this.p1.x -= nx * sep;
            this.p1.y -= ny * sep;
            this.p2.x += nx * sep;
            this.p2.y += ny * sep;
            const vRel = (this.p1.vx - this.p2.vx) * nx + (this.p1.vy - this.p2.vy) * ny;
            if (vRel > 0) {
                this.p1.vx -= nx * vRel * 0.9;
                this.p1.vy -= ny * vRel * 0.9;
                this.p2.vx += nx * vRel * 0.9;
                this.p2.vy += ny * vRel * 0.9;
                AudioManager.tick();
            }
        }

        const out = p => Math.hypot(p.x - this.cx, p.y - this.cy) > this.arenaR + this.playerR * 0.5;
        if (out(this.p1)) {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 WINS ROUND!';
            this.roundPause = 1.2;
            AudioManager.correct();
        } else if (out(this.p2)) {
            this.scoreP1++;
            this.roundMsg = 'P1 WINS ROUND!';
            this.roundPause = 1.2;
            AudioManager.correct();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = 'rgba(255,230,0,0.08)';
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.arenaR + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.arenaR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();

        const drawSumo = (p, color, label) => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, this.playerR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(8, -8, 18, 16);
            ctx.restore();
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + this.playerR + 14);
        };

        drawSumo(this.p1, Theme.p1, 'P1');
        drawSumo(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Ring outs: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 36);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('W/↑ charge forward · A/D or ←/→ turn', this.width / 2, 58);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new GameSumo());
