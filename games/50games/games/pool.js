class BumperPool extends GameBase {
    constructor() {
        super("Bumper Pool", "Knock neutral balls into rival corners! First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.goalFlash = 0;
        this.setupBoard();
    }

    setupBoard() {
        this.p1Ball = { x: 130, y: this.height / 2, vx: 0, vy: 0, r: 22, type: 'p1' };
        this.p2Ball = { x: this.width - 130, y: this.height / 2, vx: 0, vy: 0, r: 22, type: 'p2' };
        this.balls = [this.p1Ball, this.p2Ball];
        for (let i = 0; i < 6; i++) {
            this.balls.push({
                x: this.width / 2 + (Math.random() * 80 - 40),
                y: this.height / 2 + (Math.random() * 160 - 80),
                vx: 0, vy: 0, r: 14, type: 'neutral'
            });
        }
        this.pockets = [
            { x: 0, y: 0, owner: 2 },
            { x: 0, y: this.height, owner: 2 },
            { x: this.width, y: 0, owner: 1 },
            { x: this.width, y: this.height, owner: 1 }
        ];
        this.pocketR = 38;
    }

    spawnNeutral() {
        this.balls.push({
            x: this.width / 2 + (Math.random() * 60 - 30),
            y: this.height / 2 + (Math.random() * 120 - 60),
            vx: 0, vy: 0, r: 14, type: 'neutral'
        });
    }

    applyControl(ball, up, down, left, right, dt) {
        const accel = 1800;
        if (Input.isDown(up)) ball.vy -= accel * dt;
        if (Input.isDown(down)) ball.vy += accel * dt;
        if (Input.isDown(left)) ball.vx -= accel * dt;
        if (Input.isDown(right)) ball.vx += accel * dt;
    }

    cpuControl(dt) {
        const b = this.p2Ball;
        let target = null;
        let best = Infinity;
        for (const n of this.balls) {
            if (n.type !== 'neutral') continue;
            const pocket = n.x < this.width / 2
                ? { x: 0, y: this.height }
                : { x: this.width, y: 0 };
            const d = Math.hypot(n.x - b.x, n.y - b.y);
            if (d < best) { best = d; target = { ball: n, pocket }; }
        }
        if (!target) return;
        const aimX = target.ball.x + (target.pocket.x - target.ball.x) * 0.35 - b.x;
        const aimY = target.ball.y + (target.pocket.y - target.ball.y) * 0.35 - b.y;
        const len = Math.hypot(aimX, aimY) || 1;
        b.vx += (aimX / len) * 1200 * dt;
        b.vy += (aimY / len) * 1200 * dt;
    }

    update(dt) {
        if (this.goalFlash > 0) this.goalFlash -= dt;

        this.applyControl(this.p1Ball, 'KeyW', 'KeyS', 'KeyA', 'KeyD', dt);
        if (GameManager.isSinglePlayer) this.cpuControl(dt);
        else this.applyControl(this.p2Ball, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', dt);

        for (let i = 0; i < this.balls.length; i++) {
            const b = this.balls[i];
            b.vx *= 0.985;
            b.vy *= 0.985;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            if (b.x < b.r) { b.x = b.r; b.vx *= -0.75; AudioManager.tick(); }
            if (b.x > this.width - b.r) { b.x = this.width - b.r; b.vx *= -0.75; AudioManager.tick(); }
            if (b.y < b.r + 50) { b.y = b.r + 50; b.vy *= -0.75; AudioManager.tick(); }
            if (b.y > this.height - b.r) { b.y = this.height - b.r; b.vy *= -0.75; AudioManager.tick(); }

            for (let j = i + 1; j < this.balls.length; j++) {
                const b2 = this.balls[j];
                const dx = b2.x - b.x;
                const dy = b2.y - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist >= b.r + b2.r || dist === 0) continue;
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = b.r + b2.r - dist;
                b.x -= nx * overlap * 0.5;
                b.y -= ny * overlap * 0.5;
                b2.x += nx * overlap * 0.5;
                b2.y += ny * overlap * 0.5;
                const rel = (b.vx - b2.vx) * nx + (b.vy - b2.vy) * ny;
                if (rel > 0) {
                    b.vx -= rel * nx * 0.9;
                    b.vy -= rel * ny * 0.9;
                    b2.vx += rel * nx * 0.9;
                    b2.vy += rel * ny * 0.9;
                    AudioManager.move();
                }
            }

            if (b.type === 'neutral') {
                for (const p of this.pockets) {
                    if (Math.hypot(b.x - p.x, b.y - p.y) < this.pocketR) {
                        if (p.owner === 1) this.scoreP1++;
                        else this.scoreP2++;
                        this.balls.splice(i, 1);
                        i--;
                        this.spawnNeutral();
                        this.goalFlash = 0.45;
                        AudioManager.correct();
                        if (this.scoreP1 >= 5) GameManager.gameOver(1);
                        if (this.scoreP2 >= 5) GameManager.gameOver(2);
                        break;
                    }
                }
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#0c2a18';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 50);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Potted: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 32);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Sink balls in rival corners (left = P2 · right = P1)', this.width / 2, 50);

        this.pockets.forEach(p => {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(p.x, p.y, this.pocketR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = p.owner === 1 ? Theme.p1 : Theme.p2;
            ctx.lineWidth = 3;
            ctx.stroke();
        });

        this.balls.forEach(b => {
            let color = Theme.accent;
            if (b.type === 'p1') color = Theme.p1;
            if (b.type === 'p2') color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        if (this.goalFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.goalFlash * 0.18})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD bumper · Arrows bumper (2P)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new BumperPool());
