class PinballVersus extends GameBase {
    constructor() {
        super("Pinball Versus", "Twin pinball tables! Flip to rack points. First to 20.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.half = w / 2;
        this.gravity = 480;
        this.tableW = this.half - 36;
        this.tableH = h - 70;
        this.p1 = this.makeTable(18);
        this.p2 = this.makeTable(this.half + 18);
        this.popups = [];
    }

    makeTable(ox) {
        const tw = this.tableW;
        const th = this.tableH;
        return {
            ox,
            oy: 40,
            tw,
            th,
            ball: {
                x: tw * 0.72,
                y: th * 0.55,
                vx: 40,
                vy: -120,
                r: 10,
                launched: true,
                inv: 0
            },
            leftFlip: { active: false, angle: 0.35, target: 0.35 },
            rightFlip: { active: false, angle: -0.35, target: -0.35 },
            bumpers: [
                { x: tw * 0.35, y: th * 0.28, r: 18, flash: 0 },
                { x: tw * 0.62, y: th * 0.22, r: 16, flash: 0 },
                { x: tw * 0.48, y: th * 0.42, r: 20, flash: 0 }
            ],
            launchCd: 0
        };
    }

    flipperKick(table, ball) {
        const fy = table.th - 55;
        const leftBaseX = table.tw * 0.28;
        const rightBaseX = table.tw * 0.72;
        const reach = 52;

        // left flipper
        if (table.leftFlip.active && ball.y > fy - 28 && ball.y < fy + 18) {
            const tipX = leftBaseX + Math.cos(table.leftFlip.angle) * reach;
            if (ball.x > leftBaseX - 10 && ball.x < tipX + 16) {
                ball.vy = -Math.abs(ball.vy) * 0.2 - 360;
                ball.vx += 90 + (ball.x - leftBaseX) * 1.2;
                ball.y = fy - ball.r;
                AudioManager.move();
            }
        }
        // right flipper
        if (table.rightFlip.active && ball.y > fy - 28 && ball.y < fy + 18) {
            const tipX = rightBaseX - Math.cos(-table.rightFlip.angle) * reach;
            if (ball.x < rightBaseX + 10 && ball.x > tipX - 16) {
                ball.vy = -Math.abs(ball.vy) * 0.2 - 360;
                ball.vx -= 90 + (rightBaseX - ball.x) * 1.2;
                ball.y = fy - ball.r;
                AudioManager.move();
            }
        }
    }

    updateTable(table, isP1, dt) {
        const b = table.ball;
        const L = table.leftFlip;
        const R = table.rightFlip;

        L.target = L.active ? -0.45 : 0.4;
        R.target = R.active ? 0.45 : -0.4;
        L.angle += (L.target - L.angle) * Math.min(1, 18 * dt);
        R.angle += (R.target - R.angle) * Math.min(1, 18 * dt);

        for (const bmp of table.bumpers) {
            if (bmp.flash > 0) bmp.flash -= dt;
        }

        if (table.launchCd > 0) table.launchCd -= dt;
        if (b.inv > 0) b.inv -= dt;

        if (!b.launched) {
            b.x = table.tw * 0.85;
            b.y = table.th * 0.7;
            b.vx = 0;
            b.vy = 0;
            return;
        }

        b.vy += this.gravity * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // walls
        if (b.x - b.r < 10) {
            b.x = 10 + b.r;
            b.vx = Math.abs(b.vx) * 0.85;
            AudioManager.tick();
        }
        if (b.x + b.r > table.tw - 10) {
            b.x = table.tw - 10 - b.r;
            b.vx = -Math.abs(b.vx) * 0.85;
            AudioManager.tick();
        }
        if (b.y - b.r < 10) {
            b.y = 10 + b.r;
            b.vy = Math.abs(b.vy) * 0.8;
            AudioManager.tick();
        }

        // drain
        if (b.y > table.th + 10) {
            b.launched = false;
            b.x = table.tw * 0.85;
            b.y = table.th * 0.7;
            b.vx = 0;
            b.vy = 0;
            table.launchCd = 0.2;
            AudioManager.wrong();
            return;
        }

        this.flipperKick(table, b);

        // bumpers
        for (const bmp of table.bumpers) {
            const dx = b.x - bmp.x;
            const dy = b.y - bmp.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < b.r + bmp.r) {
                const nx = dx / dist;
                const ny = dy / dist;
                const push = b.r + bmp.r - dist;
                b.x += nx * push;
                b.y += ny * push;
                const dot = b.vx * nx + b.vy * ny;
                if (dot < 0) {
                    b.vx -= 2.1 * dot * nx;
                    b.vy -= 2.1 * dot * ny;
                }
                b.vx += nx * 80;
                b.vy += ny * 80;
                // speed clamp
                const sp = Math.hypot(b.vx, b.vy);
                if (sp > 620) {
                    b.vx = (b.vx / sp) * 620;
                    b.vy = (b.vy / sp) * 620;
                }
                if (b.inv <= 0) {
                    if (isP1) this.scoreP1 += 2;
                    else this.scoreP2 += 2;
                    bmp.flash = 0.2;
                    b.inv = 0.12;
                    this.popups.push({
                        x: table.ox + bmp.x,
                        y: table.oy + bmp.y - 18,
                        text: '+2',
                        life: 0.4
                    });
                    AudioManager.correct();
                }
            }
        }

        // gentle friction
        b.vx *= 0.999;
    }

    launch(table) {
        if (table.ball.launched || table.launchCd > 0) return;
        table.ball.launched = true;
        table.ball.x = table.tw * 0.78;
        table.ball.y = table.th * 0.62;
        table.ball.vx = -40 - Math.random() * 60;
        table.ball.vy = -420 - Math.random() * 80;
        AudioManager.select();
    }

    checkWin() {
        if (this.scoreP1 >= 20) {
            GameManager.gameOver(1);
            return true;
        }
        if (this.scoreP2 >= 20) {
            GameManager.gameOver(2);
            return true;
        }
        return false;
    }

    update(dt) {
        this.p1.leftFlip.active = Input.isDown('KeyA');
        this.p1.rightFlip.active = Input.isDown('KeyD');
        if (Input.isDown('Space')) this.launch(this.p1);
        // also W as launch alternate
        if (Input.isDown('KeyW')) this.launch(this.p1);

        if (GameManager.isSinglePlayer) {
            const b = this.p2.ball;
            const nearBottom = b.y > this.p2.th * 0.62;
            this.p2.leftFlip.active = nearBottom && b.x < this.p2.tw * 0.55 && (b.vy > 0 || Math.random() < 0.05);
            this.p2.rightFlip.active = nearBottom && b.x > this.p2.tw * 0.45 && (b.vy > 0 || Math.random() < 0.05);
            // imperfect: random miss chance
            if (Math.random() < 0.02) {
                this.p2.leftFlip.active = false;
                this.p2.rightFlip.active = false;
            }
            if (!b.launched && Math.random() < 0.04) this.launch(this.p2);
        } else {
            this.p2.leftFlip.active = Input.isDown('ArrowLeft');
            this.p2.rightFlip.active = Input.isDown('ArrowRight');
            if (Input.isDown('Enter') || Input.isDown('ArrowUp')) this.launch(this.p2);
        }

        this.updateTable(this.p1, true, dt);
        this.updateTable(this.p2, false, dt);

        for (let i = this.popups.length - 1; i >= 0; i--) {
            this.popups[i].y -= 35 * dt;
            this.popups[i].life -= dt;
            if (this.popups[i].life <= 0) this.popups.splice(i, 1);
        }

        if (this.checkWin()) return;
    }

    drawTable(ctx, table, color, label) {
        const { ox, oy, tw, th } = table;

        // cabinet
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(ox, oy, tw, th);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(ox, oy, tw, th);

        // drain notch
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(ox + tw * 0.35, oy + th - 8, tw * 0.3, 12);

        // bumpers
        for (const bmp of table.bumpers) {
            ctx.beginPath();
            ctx.arc(ox + bmp.x, oy + bmp.y, bmp.r, 0, Math.PI * 2);
            ctx.fillStyle = bmp.flash > 0 ? Theme.fg : Theme.accent;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // flippers
        const fy = oy + th - 55;
        const reach = 52;
        ctx.lineCap = 'round';
        ctx.lineWidth = 12;
        ctx.strokeStyle = color;

        const lx = ox + tw * 0.28;
        ctx.beginPath();
        ctx.moveTo(lx, fy);
        ctx.lineTo(lx + Math.cos(table.leftFlip.angle) * reach, fy + Math.sin(table.leftFlip.angle) * reach * 0.55);
        ctx.stroke();

        const rx = ox + tw * 0.72;
        ctx.beginPath();
        ctx.moveTo(rx, fy);
        ctx.lineTo(rx - Math.cos(-table.rightFlip.angle) * reach, fy + Math.sin(table.rightFlip.angle) * reach * 0.55);
        ctx.stroke();

        // ball
        ctx.fillStyle = Theme.fg;
        ctx.beginPath();
        ctx.arc(ox + table.ball.x, oy + table.ball.y, table.ball.r, 0, Math.PI * 2);
        ctx.fill();

        if (!table.ball.launched) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            const hint = label === 'P1' ? 'SPACE to launch' : (label === 'CPU' ? '…' : 'ENTER to launch');
            ctx.fillText(hint, ox + tw / 2, oy + th * 0.55);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, ox + tw / 2, oy + 18);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.half, 0);
        ctx.lineTo(this.half, this.height);
        ctx.stroke();

        this.drawTable(ctx, this.p1, Theme.p1, 'P1');
        this.drawTable(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        for (const p of this.popups) {
            ctx.globalAlpha = Math.max(0, p.life * 1.6);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Score: ${this.scoreP1} — ${this.scoreP2}  (first to 20)`, this.width / 2, 24);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('A/D or ←/→ flippers · SPACE / ENTER (or W/↑) launch', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new PinballVersus());
