class GameSheepHerder extends GameBase {
    constructor() {
        super("Sheep Herder", "Scare wandering sheep into your pen! First to 8 wins the round.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: w * 0.25, y: h * 0.55, r: 18, vx: 0, vy: 0 };
        this.p2 = { x: w * 0.75, y: h * 0.55, r: 18, vx: 0, vy: 0 };
        this.penP1 = { x: 24, y: h - 150, w: 140, h: 110 };
        this.penP2 = { x: w - 164, y: h - 150, w: 140, h: 110 };
        this.sheep = [];
        this.spawnSheep(12);
        this.flash1 = 0;
        this.flash2 = 0;
        this.msg = '';
        this.msgT = 0;
        this.fieldTop = 70;
    }

    spawnSheep(n) {
        for (let i = 0; i < n; i++) {
            this.sheep.push({
                x: this.width * 0.2 + Math.random() * this.width * 0.6,
                y: this.fieldTop + 40 + Math.random() * (this.height - this.fieldTop - 200),
                vx: (Math.random() - 0.5) * 60,
                vy: (Math.random() - 0.5) * 60,
                r: 13 + Math.random() * 3,
                wander: Math.random() * Math.PI * 2,
                blink: Math.random() * 3
            });
        }
    }

    update(dt) {
        if (this.flash1 > 0) this.flash1 -= dt;
        if (this.flash2 > 0) this.flash2 -= dt;
        if (this.msgT > 0) this.msgT -= dt;

        const speed = 270;
        this.p1.vx = 0;
        this.p1.vy = 0;
        if (Input.isDown('KeyW')) this.p1.vy = -speed;
        if (Input.isDown('KeyS')) this.p1.vy = speed;
        if (Input.isDown('KeyA')) this.p1.vx = -speed;
        if (Input.isDown('KeyD')) this.p1.vx = speed;
        // diagonal normalize
        if (this.p1.vx && this.p1.vy) {
            this.p1.vx *= 0.707;
            this.p1.vy *= 0.707;
        }
        this.p1.x += this.p1.vx * dt;
        this.p1.y += this.p1.vy * dt;
        this.clampHerder(this.p1);

        if (GameManager.isSinglePlayer) {
            this.updateCPU(dt, speed);
        } else {
            this.p2.vx = 0;
            this.p2.vy = 0;
            if (Input.isDown('ArrowUp')) this.p2.vy = -speed;
            if (Input.isDown('ArrowDown')) this.p2.vy = speed;
            if (Input.isDown('ArrowLeft')) this.p2.vx = -speed;
            if (Input.isDown('ArrowRight')) this.p2.vx = speed;
            if (this.p2.vx && this.p2.vy) {
                this.p2.vx *= 0.707;
                this.p2.vy *= 0.707;
            }
            this.p2.x += this.p2.vx * dt;
            this.p2.y += this.p2.vy * dt;
        }
        this.clampHerder(this.p2);

        // herder collision
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const dist = Math.hypot(dx, dy);
        const minD = this.p1.r + this.p2.r;
        if (dist < minD && dist > 0) {
            const push = (minD - dist) / 2;
            this.p1.x -= (dx / dist) * push;
            this.p1.y -= (dy / dist) * push;
            this.p2.x += (dx / dist) * push;
            this.p2.y += (dy / dist) * push;
        }

        for (const s of this.sheep) {
            s.blink += dt;
            s.wander += dt * 0.8;

            // gentle wander
            s.vx += Math.cos(s.wander) * 25 * dt;
            s.vy += Math.sin(s.wander * 1.3) * 25 * dt;

            // scare from herders (dt-scaled impulse)
            this.scare(s, this.p1, dt);
            this.scare(s, this.p2, dt);

            // soft flock separation
            for (const o of this.sheep) {
                if (o === s) continue;
                const ddx = s.x - o.x;
                const ddy = s.y - o.y;
                const d = Math.hypot(ddx, ddy);
                if (d < 28 && d > 0) {
                    s.vx += (ddx / d) * 40 * dt;
                    s.vy += (ddy / d) * 40 * dt;
                }
            }

            // damping
            s.vx *= Math.pow(0.92, dt * 60);
            s.vy *= Math.pow(0.92, dt * 60);
            const spd = Math.hypot(s.vx, s.vy);
            if (spd > 320) {
                s.vx = (s.vx / spd) * 320;
                s.vy = (s.vy / spd) * 320;
            }

            s.x += s.vx * dt;
            s.y += s.vy * dt;

            // bounds (bounce)
            if (s.x < 30 + s.r) { s.x = 30 + s.r; s.vx = Math.abs(s.vx); }
            if (s.x > this.width - 30 - s.r) { s.x = this.width - 30 - s.r; s.vx = -Math.abs(s.vx); }
            if (s.y < this.fieldTop + s.r) { s.y = this.fieldTop + s.r; s.vy = Math.abs(s.vy); }
            if (s.y > this.height - 40 - s.r) { s.y = this.height - 40 - s.r; s.vy = -Math.abs(s.vy); }

            // pens
            if (this.inPen(s, this.penP1)) {
                this.scoreP1++;
                this.flash1 = 0.35;
                this.respawnSheep(s);
                this.msg = 'P1 PEN!';
                this.msgT = 0.6;
                AudioManager.correct();
                if (this.scoreP1 >= 8) {
                    GameManager.gameOver(1);
                    return;
                }
            } else if (this.inPen(s, this.penP2)) {
                this.scoreP2++;
                this.flash2 = 0.35;
                this.respawnSheep(s);
                this.msg = GameManager.isSinglePlayer ? 'CPU PEN!' : 'P2 PEN!';
                this.msgT = 0.6;
                AudioManager.correct();
                if (this.scoreP2 >= 8) {
                    GameManager.gameOver(2);
                    return;
                }
            }
        }
    }

    scare(s, herder, dt) {
        const dx = s.x - herder.x;
        const dy = s.y - herder.y;
        const d = Math.hypot(dx, dy);
        const range = 78;
        if (d < range && d > 4) {
            const force = (1 - d / range) * 520;
            s.vx += (dx / d) * force * dt;
            s.vy += (dy / d) * force * dt;
            if (d < 40 && Math.random() < 0.02) AudioManager.tick();
        }
    }

    respawnSheep(s) {
        s.x = this.width * 0.3 + Math.random() * this.width * 0.4;
        s.y = this.fieldTop + 30 + Math.random() * 80;
        s.vx = (Math.random() - 0.5) * 40;
        s.vy = 20 + Math.random() * 30;
        s.wander = Math.random() * Math.PI * 2;
    }

    updateCPU(dt, speed) {
        // Find sheep closest to being scorable into P2 pen (right)
        let best = null;
        let bestScore = -Infinity;
        for (const s of this.sheep) {
            if (this.inPen(s, this.penP2) || this.inPen(s, this.penP1)) continue;
            // prefer sheep nearer the right pen, not already deep left
            const toPen = Math.hypot(s.x - (this.penP2.x + this.penP2.w / 2), s.y - (this.penP2.y + 20));
            const distMe = Math.hypot(s.x - this.p2.x, s.y - this.p2.y);
            const score = 400 - toPen * 0.6 - distMe * 0.35 + (s.x > this.width * 0.45 ? 40 : 0);
            if (score > bestScore) {
                bestScore = score;
                best = s;
            }
        }
        if (!best) return;

        // Position opposite the pen relative to sheep (drive toward pen)
        const penX = this.penP2.x + this.penP2.w * 0.35;
        const penY = this.penP2.y + 30;
        const ax = best.x - penX;
        const ay = best.y - penY;
        const al = Math.hypot(ax, ay) || 1;
        // stand behind sheep with some error
        const standX = best.x + (ax / al) * 42 + Math.sin(performance.now() * 0.002) * 16;
        const standY = best.y + (ay / al) * 42 + Math.cos(performance.now() * 0.0025) * 12;

        const dx = standX - this.p2.x;
        const dy = standY - this.p2.y;
        const d = Math.hypot(dx, dy) || 1;
        const cpuSpeed = speed * 0.8;
        this.p2.x += (dx / d) * Math.min(d, cpuSpeed * dt);
        this.p2.y += (dy / d) * Math.min(d, cpuSpeed * dt);
    }

    clampHerder(p) {
        p.x = Math.max(p.r + 20, Math.min(this.width - p.r - 20, p.x));
        p.y = Math.max(this.fieldTop + p.r + 8, Math.min(this.height - p.r - 30, p.y));
    }

    inPen(s, pen) {
        return s.x > pen.x + 8 && s.x < pen.x + pen.w - 8 &&
            s.y > pen.y + 8 && s.y < pen.y + pen.h - 8;
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Field
        ctx.fillStyle = 'rgba(255,230,0,0.06)';
        ctx.fillRect(16, this.fieldTop, this.width - 32, this.height - this.fieldTop - 20);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.strokeRect(16, this.fieldTop, this.width - 32, this.height - this.fieldTop - 20);

        // Pens
        this.drawPen(ctx, this.penP1, Theme.p1, 'P1 PEN', this.flash1);
        this.drawPen(ctx, this.penP2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU PEN' : 'P2 PEN', this.flash2);

        // Sheep
        for (const s of this.sheep) {
            this.drawSheep(ctx, s);
        }

        // Herders
        this.drawHerder(ctx, this.p1, Theme.p1, 'P1');
        this.drawHerder(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        // HUD
        ctx.textAlign = 'center';
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 26px Arial';
        ctx.fillText(`${this.scoreP1} / 8`, this.width * 0.22, 40);
        ctx.fillText(`${this.scoreP2} / 8`, this.width * 0.78, 40);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.p1;
        ctx.fillText('P1', this.width * 0.22, 56);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillText(GameManager.isSinglePlayer ? 'CPU' : 'P2', this.width * 0.78, 56);

        ctx.fillStyle = Theme.accent;
        ctx.font = '13px Arial';
        ctx.fillText('WASD herd · scare sheep into your pen · first to 8', this.width / 2, this.height - 12);

        if (this.msgT > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 28px Impact';
            ctx.fillText(this.msg, this.width / 2, this.fieldTop + 36);
        }
    }

    drawPen(ctx, pen, color, label, flash) {
        ctx.fillStyle = flash > 0 ? 'rgba(255,230,0,0.15)' : 'rgba(0,0,0,0.15)';
        ctx.fillRect(pen.x, pen.y, pen.w, pen.h);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        // open top side for entry
        ctx.beginPath();
        ctx.moveTo(pen.x, pen.y);
        ctx.lineTo(pen.x, pen.y + pen.h);
        ctx.lineTo(pen.x + pen.w, pen.y + pen.h);
        ctx.lineTo(pen.x + pen.w, pen.y);
        ctx.stroke();
        // partial top rails
        ctx.beginPath();
        ctx.moveTo(pen.x, pen.y);
        ctx.lineTo(pen.x + pen.w * 0.28, pen.y);
        ctx.moveTo(pen.x + pen.w * 0.72, pen.y);
        ctx.lineTo(pen.x + pen.w, pen.y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, pen.x + pen.w / 2, pen.y + pen.h - 12);
    }

    drawSheep(ctx, s) {
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r, s.r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        // head
        ctx.fillStyle = Theme.bg;
        ctx.beginPath();
        ctx.arc(s.x + s.r * 0.55, s.y - 2, s.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        // eye
        if (s.blink % 3 > 0.15) {
            ctx.fillStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(s.x + s.r * 0.7, s.y - 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHerder(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        // scare ring
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 78, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + p.r + 14);
    }
}

GameManager.registerGame(new GameSheepHerder());
