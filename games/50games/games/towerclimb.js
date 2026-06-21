class TowerClimb extends GameBase {
    constructor() {
        super("Tower Climb", "Jump up the scrolling tower! First to 3 summit wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.roundMsg = '';
        this.msgTimer = 0;
        this.summitY = 80;
        this.startRound();
    }

    startRound() {
        this.platforms = [];
        this.scroll = 0;
        this.time = 0;
        this.p1 = { x: this.width * 0.35, y: this.height - 80, vy: 0, grounded: false };
        this.p2 = { x: this.width * 0.65, y: this.height - 80, vy: 0, grounded: false };
        for (let i = 0; i < 14; i++) {
            this.platforms.push({
                x: 80 + Math.random() * (this.width - 220),
                y: this.height - 60 - i * 70,
                w: 120 + Math.random() * 80
            });
        }
    }

    updatePlayer(p, left, right, jumpKey, isCpu, dt) {
        const gravity = 900;
        const move = 240 * dt;

        if (isCpu) {
            const target = this.platforms
                .filter(pl => pl.y < p.y && pl.y > p.y - 180)
                .sort((a, b) => b.y - a.y)[0];
            if (target) {
                const tx = target.x + target.w / 2;
                if (Math.abs(p.x - tx) > 8) p.x += Math.sign(tx - p.x) * move * 0.85;
                if (p.grounded && p.y - target.y > 40) p.vy = -420;
            }
        } else {
            if (Input.isDown(left)) p.x -= move;
            if (Input.isDown(right)) p.x += move;
            if (Input.isDown(jumpKey) && p.grounded) {
                p.vy = -420;
                p.grounded = false;
                AudioManager.move();
            }
        }

        p.vy += gravity * dt;
        p.x += 0;
        p.y += p.vy * dt;

        if (p.x < 20) p.x = this.width - 20;
        if (p.x > this.width - 20) p.x = 20;

        p.grounded = false;
        for (const pl of this.platforms) {
            if (p.vy >= 0 &&
                p.y + 14 >= pl.y && p.y + 14 - p.vy * dt <= pl.y + 4 &&
                p.x > pl.x && p.x < pl.x + pl.w) {
                p.y = pl.y - 14;
                p.vy = isCpu && p.grounded === false ? -420 : 0;
                p.grounded = true;
            }
        }

        if (p.y > this.height + 40) return 'fall';
        if (p.y < this.summitY) return 'win';
        return null;
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        this.time += dt;
        const scrollSpd = 50 + this.time * 8;
        this.scroll += scrollSpd * dt;

        this.platforms.forEach(pl => { pl.y += scrollSpd * dt; });
        this.p1.y += scrollSpd * dt;
        this.p2.y += scrollSpd * dt;

        while (this.platforms.length && this.platforms[0].y > this.height + 20) {
            this.platforms.shift();
        }
        while (this.platforms.length < 14) {
            const top = this.platforms.length ? this.platforms[this.platforms.length - 1].y : this.height;
            this.platforms.push({
                x: 80 + Math.random() * (this.width - 220),
                y: top - (55 + Math.random() * 35),
                w: 120 + Math.random() * 80
            });
        }

        const r1 = this.updatePlayer(this.p1, 'KeyA', 'KeyD', 'KeyW', false, dt);
        const r2 = this.updatePlayer(this.p2, 'ArrowLeft', 'ArrowRight', 'ArrowUp', GameManager.isSinglePlayer, dt);

        const endRound = (winner, msg, sound) => {
            if (winner === 1) this.scoreP1++;
            else this.scoreP2++;
            this.roundMsg = msg;
            AudioManager[sound]();
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else {
                this.msgTimer = 1.2;
                this.startRound();
            }
        };

        if (r1 === 'win') endRound(1, 'P1 REACHES SUMMIT!', 'correct');
        else if (r2 === 'win') endRound(2, GameManager.isSinglePlayer ? 'CPU REACHES SUMMIT!' : 'P2 REACHES SUMMIT!', 'wrong');
        else if (r1 === 'fall') endRound(2, GameManager.isSinglePlayer ? 'CPU WINS — P1 FELL!' : 'P2 WINS — P1 FELL!', 'wrong');
        else if (r2 === 'fall') endRound(1, 'P1 WINS — rival fell!', 'correct');
    }

    render(ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0a2040');
        grad.addColorStop(1, Theme.bg);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, this.summitY - 20, this.width, 4);
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SUMMIT', this.width / 2, this.summitY - 28);

        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Summits: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 28);

        this.platforms.forEach(pl => {
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(pl.x, pl.y, pl.w, 10);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(pl.x, pl.y, pl.w, 3);
        });

        const drawP = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 9px Arial';
            ctx.fillText(label, p.x, p.y + 26);
        };

        drawP(this.p1, Theme.p1, 'P1');
        drawP(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('A/D move · W jump · reach the summit before the tower scrolls you off!', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new TowerClimb());
