class GameDodge extends GameBase {
    constructor() {
        super("Dodge Survival", "Dodge the blocks — last one standing wins the round! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    startRound() {
        this.p1 = { x: this.width * 0.35, y: this.height / 2, r: 14, dead: false };
        this.p2 = { x: this.width * 0.65, y: this.height / 2, r: 14, dead: false };
        this.blocks = [];
        this.spawnTimer = 0.8;
        this.ramp = 1;
        this.roundTime = 0;
    }

    spawnBlock() {
        const side = Math.floor(Math.random() * 4);
        const spd = 180 * this.ramp;
        let x, y, vx = 0, vy = 0;
        if (side === 0) { x = Math.random() * this.width; y = -20; vy = spd; }
        else if (side === 1) { x = Math.random() * this.width; y = this.height + 20; vy = -spd; }
        else if (side === 2) { x = -20; y = Math.random() * this.height; vx = spd; }
        else { x = this.width + 20; y = Math.random() * this.height; vx = -spd; }
        this.blocks.push({ x, y, vx, vy, s: 10 + Math.random() * 14 });
    }

    clamp(p) {
        p.x = Math.max(p.r + 8, Math.min(this.width - p.r - 8, p.x));
        p.y = Math.max(p.r + 60, Math.min(this.height - p.r - 20, p.y));
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        const speed = 260 * dt;
        if (!this.p1.dead) {
            if (Input.isDown('KeyW')) this.p1.y -= speed;
            if (Input.isDown('KeyS')) this.p1.y += speed;
            if (Input.isDown('KeyA')) this.p1.x -= speed;
            if (Input.isDown('KeyD')) this.p1.x += speed;
            this.clamp(this.p1);
        }

        if (!this.p2.dead) {
            if (GameManager.isSinglePlayer) {
                const threats = this.blocks.filter(b =>
                    Math.hypot(b.x - this.p2.x, b.y - this.p2.y) < 120
                );
                let dx = 0, dy = 0;
                if (threats.length) {
                    threats.forEach(b => {
                        dx += this.p2.x - b.x;
                        dy += this.p2.y - b.y;
                    });
                } else {
                    dx = this.width * 0.65 - this.p2.x;
                    dy = this.height / 2 - this.p2.y;
                }
                const len = Math.hypot(dx, dy) || 1;
                this.p2.x += (dx / len) * speed * 0.85;
                this.p2.y += (dy / len) * speed * 0.85;
            } else {
                if (Input.isDown('ArrowUp')) this.p2.y -= speed;
                if (Input.isDown('ArrowDown')) this.p2.y += speed;
                if (Input.isDown('ArrowLeft')) this.p2.x -= speed;
                if (Input.isDown('ArrowRight')) this.p2.x += speed;
            }
            this.clamp(this.p2);
        }

        this.roundTime += dt;
        this.ramp = 1 + this.roundTime * 0.04;
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnBlock();
            this.spawnTimer = Math.max(0.25, 0.9 - this.ramp * 0.08);
        }

        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const b = this.blocks[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            const hit = p => !p.dead && Math.hypot(b.x - p.x, b.y - p.y) < p.r + b.s * 0.5;
            if (hit(this.p1)) { this.p1.dead = true; AudioManager.wrong(); }
            if (hit(this.p2)) { this.p2.dead = true; AudioManager.wrong(); }
            if (b.x < -60 || b.x > this.width + 60 || b.y < -60 || b.y > this.height + 60) {
                this.blocks.splice(i, 1);
            }
        }

        if (this.p1.dead || this.p2.dead) {
            if (this.p1.dead && !this.p2.dead) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 WINS ROUND!';
                AudioManager.correct();
            } else if (this.p2.dead && !this.p1.dead) {
                this.scoreP1++;
                this.roundMsg = 'P1 WINS ROUND!';
                AudioManager.correct();
            } else {
                this.roundMsg = 'BOTH OUT — no point';
                AudioManager.tick();
            }

            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else {
                this.msgTimer = 1.0;
                this.startRound();
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 32);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText(`speed ramp ${this.ramp.toFixed(1)}x`, this.width / 2, 52);

        this.blocks.forEach(b => {
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(b.x - b.s / 2, b.y - b.s / 2, b.s, b.s);
        });

        if (!this.p1.dead) {
            ctx.fillStyle = Theme.p1;
            ctx.beginPath();
            ctx.arc(this.p1.x, this.p1.y, this.p1.r, 0, Math.PI * 2);
            ctx.fill();
        }
        if (!this.p2.dead) {
            ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
            ctx.beginPath();
            ctx.arc(this.p2.x, this.p2.y, this.p2.r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD dodge · Arrows dodge (2P)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GameDodge());
