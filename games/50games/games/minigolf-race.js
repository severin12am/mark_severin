class GameMiniGolfRace extends GameBase {
    constructor() {
        super("Mini-Golf (Race)", "First ball in the hole wins!");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.margin = 36;
        this.friction = 0.985;
        this.roundMsg = '';
        this.roundPause = 0;
        this.resetRound();
    }

    resetRound() {
        this.green = {
            x: this.margin,
            y: this.margin + 20,
            w: this.width - this.margin * 2,
            h: this.height - this.margin * 2 - 40
        };
        this.hole = { x: this.width / 2, y: this.green.y + 70, r: 15 };
        this.ball1 = this.makeBall(this.width * 0.22, this.green.y + this.green.h - 50, 0);
        this.ball2 = this.makeBall(this.width * 0.78, this.green.y + this.green.h - 50, Math.PI);
        // Simple obstacles
        this.obs = [
            { x: this.width / 2 - 90, y: this.height * 0.42, w: 180, h: 18 },
            { x: this.width * 0.28, y: this.height * 0.28, w: 18, h: 90 },
            { x: this.width * 0.72 - 18, y: this.height * 0.28, w: 18, h: 90 }
        ];
        this.cpuWait = 0.4 + Math.random() * 0.4;
        this.winner = 0;
    }

    makeBall(x, y, angle) {
        return {
            x, y, vx: 0, vy: 0, r: 11,
            angle, charge: 0, charging: false, aiming: true, sunk: false
        };
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                GameManager.gameOver(this.winner);
            }
            return;
        }

        this.handlePlayer(this.ball1, 'KeyA', 'KeyD', 'Space', false, dt);
        if (GameManager.isSinglePlayer) {
            this.handleCPU(this.ball2, dt);
        } else {
            this.handlePlayer(this.ball2, 'ArrowLeft', 'ArrowRight', 'Enter', false, dt);
        }

        this.physics(this.ball1, dt);
        this.physics(this.ball2, dt);

        if (!this.ball1.sunk && this.checkHole(this.ball1)) {
            this.ball1.sunk = true;
            this.winner = 1;
            this.roundMsg = 'P1 HOLES OUT!';
            this.roundPause = 1.2;
            this.scoreP1++;
            AudioManager.correct();
        } else if (!this.ball2.sunk && this.checkHole(this.ball2)) {
            this.ball2.sunk = true;
            this.winner = 2;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU HOLES OUT!' : 'P2 HOLES OUT!';
            this.roundPause = 1.2;
            this.scoreP2++;
            AudioManager.correct();
        }
    }

    handlePlayer(b, left, right, action, isAi, dt) {
        if (b.sunk) return;
        const moving = Math.hypot(b.vx, b.vy) > 8;
        if (moving) {
            b.aiming = false;
            b.charging = false;
            b.charge = 0;
            return;
        }
        b.aiming = true;
        if (Input.isDown(left)) b.angle -= 2.6 * dt;
        if (Input.isDown(right)) b.angle += 2.6 * dt;
        if (Input.isDown(action)) {
            if (!b.charging) {
                b.charging = true;
                b.charge = 0;
            }
            b.charge = Math.min(b.charge + 520 * dt, 680);
        } else if (b.charging) {
            this.putt(b, b.angle, b.charge);
            b.charging = false;
            b.charge = 0;
            b.aiming = false;
        }
    }

    handleCPU(b, dt) {
        if (b.sunk) return;
        const moving = Math.hypot(b.vx, b.vy) > 8;
        if (moving) {
            b.aiming = false;
            return;
        }
        b.aiming = true;
        this.cpuWait -= dt;
        const target = Math.atan2(this.hole.y - b.y, this.hole.x - b.x);
        // imperfect aim
        const wobble = (Math.random() - 0.5) * 0.15;
        let diff = target + wobble - b.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        b.angle += Math.sign(diff) * Math.min(Math.abs(diff), 2.2 * dt);

        if (this.cpuWait > 0) return;
        if (!b.charging) {
            b.charging = true;
            b.charge = 0;
        }
        const dist = Math.hypot(this.hole.x - b.x, this.hole.y - b.y);
        const want = Math.min(620, 180 + dist * 0.85 + (Math.random() - 0.5) * 60);
        b.charge = Math.min(b.charge + 480 * dt, 680);
        if (b.charge >= want * 0.92) {
            this.putt(b, b.angle, b.charge);
            b.charging = false;
            b.charge = 0;
            b.aiming = false;
            this.cpuWait = 0.35 + Math.random() * 0.5;
        }
    }

    putt(b, angle, power) {
        const spd = 80 + power * 0.85;
        b.vx = Math.cos(angle) * spd;
        b.vy = Math.sin(angle) * spd;
        AudioManager.move();
    }

    physics(b, dt) {
        if (b.sunk) return;
        b.vx *= Math.pow(this.friction, dt * 60);
        b.vy *= Math.pow(this.friction, dt * 60);
        if (Math.hypot(b.vx, b.vy) < 6) {
            b.vx = 0;
            b.vy = 0;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        const g = this.green;
        if (b.x < g.x + b.r) { b.x = g.x + b.r; b.vx = Math.abs(b.vx) * 0.7; AudioManager.tick(); }
        if (b.x > g.x + g.w - b.r) { b.x = g.x + g.w - b.r; b.vx = -Math.abs(b.vx) * 0.7; AudioManager.tick(); }
        if (b.y < g.y + b.r) { b.y = g.y + b.r; b.vy = Math.abs(b.vy) * 0.7; AudioManager.tick(); }
        if (b.y > g.y + g.h - b.r) { b.y = g.y + g.h - b.r; b.vy = -Math.abs(b.vy) * 0.7; AudioManager.tick(); }

        for (const o of this.obs) {
            if (b.x + b.r > o.x && b.x - b.r < o.x + o.w &&
                b.y + b.r > o.y && b.y - b.r < o.y + o.h) {
                const cx = o.x + o.w / 2;
                const cy = o.y + o.h / 2;
                if (Math.abs(b.x - cx) / o.w > Math.abs(b.y - cy) / o.h) {
                    b.vx *= -0.75;
                    b.x += Math.sign(b.x - cx) * 4;
                } else {
                    b.vy *= -0.75;
                    b.y += Math.sign(b.y - cy) * 4;
                }
                AudioManager.tick();
            }
        }
    }

    checkHole(b) {
        const d = Math.hypot(b.x - this.hole.x, b.y - this.hole.y);
        const spd = Math.hypot(b.vx, b.vy);
        return d < this.hole.r + 2 && spd < 90;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Green
        ctx.fillStyle = 'rgba(255,230,0,0.07)';
        ctx.fillRect(this.green.x, this.green.y, this.green.w, this.green.h);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.green.x, this.green.y, this.green.w, this.green.h);

        // Obstacles
        ctx.fillStyle = Theme.fg;
        for (const o of this.obs) {
            ctx.fillRect(o.x, o.y, o.w, o.h);
        }

        // Hole
        ctx.fillStyle = Theme.bg;
        ctx.beginPath();
        ctx.arc(this.hole.x, this.hole.y, this.hole.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Flag
        ctx.strokeStyle = Theme.accent;
        ctx.beginPath();
        ctx.moveTo(this.hole.x + this.hole.r - 2, this.hole.y);
        ctx.lineTo(this.hole.x + this.hole.r - 2, this.hole.y - 36);
        ctx.stroke();
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.moveTo(this.hole.x + this.hole.r - 2, this.hole.y - 36);
        ctx.lineTo(this.hole.x + this.hole.r + 16, this.hole.y - 28);
        ctx.lineTo(this.hole.x + this.hole.r - 2, this.hole.y - 20);
        ctx.fill();

        this.drawBall(ctx, this.ball1, Theme.p1, 'P1');
        this.drawBall(ctx, this.ball2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RACE TO THE HOLE', this.width / 2, 28);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('A/D aim · hold Space charge · release to putt', this.width / 2, this.height - 14);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }

    drawBall(ctx, b, color, label) {
        if (b.sunk) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, b.x, b.y + b.r + 14);

        if (b.aiming) {
            const len = 28 + (b.charge / 680) * 50;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + Math.cos(b.angle) * len, b.y + Math.sin(b.angle) * len);
            ctx.stroke();
            if (b.charge > 0) {
                ctx.fillStyle = Theme.accent;
                const pct = b.charge / 680;
                ctx.fillRect(b.x - 20, b.y - b.r - 16, 40 * pct, 5);
            }
        }
    }
}

GameManager.registerGame(new GameMiniGolfRace());
