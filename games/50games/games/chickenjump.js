class ChickenJump extends GameBase {
    constructor() {
        super("Chicken Jump", "Cross the road! First to 3 crossings.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.lanes = [];
        const ys = [110, 190, 270, 350, 430];
        const speeds = [140, -180, 160, -220, 130];
        for (let i = 0; i < 5; i++) {
            this.lanes.push({ y: ys[i], speed: speeds[i], cars: this.makeCars(speeds[i]) });
        }
        this.winFlash = 0;
        this.resetPositions();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    makeCars(speed) {
        const cars = [];
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
            cars.push({
                x: (this.width / n) * i + Math.random() * 40,
                w: 55 + Math.random() * 35,
                h: 36
            });
        }
        return cars;
    }

    resetPositions() {
        this.p1 = { x: this.width * 0.35, y: this.height - 55, r: 18 };
        this.p2 = { x: this.width * 0.65, y: this.height - 55, r: 18 };
    }

    hop(p, dx, dy) {
        p.x = Math.max(35, Math.min(this.width - 35, p.x + dx));
        p.y = Math.max(45, Math.min(this.height - 45, p.y + dy));
        AudioManager.move();
    }

    laneDanger(lane, x) {
        for (const car of lane.cars) {
            if (Math.abs(x - (car.x + car.w / 2)) < car.w * 0.55 + 20) return true;
        }
        return false;
    }

    update(dt) {
        if (this.winFlash > 0) {
            this.winFlash -= dt;
            return;
        }

        const step = 72;
        if (this.justPressed('KeyW')) this.hop(this.p1, 0, -step);
        if (this.justPressed('KeyS')) this.hop(this.p1, 0, step);
        if (this.justPressed('KeyA')) this.hop(this.p1, -step, 0);
        if (this.justPressed('KeyD')) this.hop(this.p1, step, 0);

        if (GameManager.isSinglePlayer) {
            this.cpuTimer = (this.cpuTimer || 0) - dt;
            if (this.cpuTimer <= 0) {
                const nextY = this.p2.y - step;
                const lane = this.lanes.find(l => Math.abs(l.y - nextY) < 25);
                if (!lane || !this.laneDanger(lane, this.p2.x)) {
                    this.hop(this.p2, 0, -step);
                } else {
                    const leftSafe = !this.laneDanger(lane, this.p2.x - step);
                    const rightSafe = !this.laneDanger(lane, this.p2.x + step);
                    if (leftSafe) this.hop(this.p2, -step, 0);
                    else if (rightSafe) this.hop(this.p2, step, 0);
                }
                this.cpuTimer = 0.35 + Math.random() * 0.2;
            }
        } else {
            if (this.justPressed('ArrowUp')) this.hop(this.p2, 0, -step);
            if (this.justPressed('ArrowDown')) this.hop(this.p2, 0, step);
            if (this.justPressed('ArrowLeft')) this.hop(this.p2, -step, 0);
            if (this.justPressed('ArrowRight')) this.hop(this.p2, step, 0);
        }

        for (const lane of this.lanes) {
            for (const car of lane.cars) {
                car.x += lane.speed * dt;
                if (lane.speed > 0 && car.x > this.width + 20) car.x = -car.w - 20;
                if (lane.speed < 0 && car.x < -car.w - 20) car.x = this.width + 20;

                const hit = p =>
                    Math.abs(p.x - (car.x + car.w / 2)) < p.r + car.w * 0.45 &&
                    Math.abs(p.y - (lane.y + car.h / 2)) < p.r + car.h * 0.45;

                if (hit(this.p1)) {
                    this.resetPositions();
                    this.p1.x = this.width * 0.35;
                    AudioManager.wrong();
                }
                if (hit(this.p2)) {
                    this.resetPositions();
                    this.p2.x = this.width * 0.65;
                    AudioManager.wrong();
                }
            }
        }

        if (this.p1.y <= 55) {
            this.scoreP1++;
            this.winFlash = 0.6;
            AudioManager.correct();
            this.resetPositions();
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
        }
        if (this.p2.y <= 55) {
            this.scoreP2++;
            this.winFlash = 0.6;
            AudioManager.correct();
            this.resetPositions();
            if (this.scoreP2 >= 3) GameManager.gameOver(2);
        }
    }

    drawBird(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(p.x - 7, p.y - 8, 5, 5);
        ctx.fillRect(p.x + 2, p.y - 8, 5, 5);
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + p.r + 10);
    }

    render(ctx) {
        ctx.fillStyle = '#1a3a1a';
        ctx.fillRect(0, 0, this.width, 50);
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(0, this.height - 50, this.width, 50);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Crossings: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 32);

        for (const lane of this.lanes) {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, lane.y - 4, this.width, 44);
            ctx.fillStyle = Theme.fg;
            for (let i = 0; i < this.width; i += 50) {
                ctx.fillRect(i, lane.y + 16, 24, 4);
            }
            for (const car of lane.cars) {
                ctx.fillStyle = Theme.accent;
                ctx.fillRect(car.x, lane.y, car.w, car.h);
                ctx.strokeStyle = Theme.fg;
                ctx.lineWidth = 2;
                ctx.strokeRect(car.x, lane.y, car.w, car.h);
            }
        }

        this.drawBird(ctx, this.p1, Theme.p1, 'P1');
        this.drawBird(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.winFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.winFlash * 0.25})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD hop one tile · reach the top grass!', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new ChickenJump());
