class GameVolleyBomb extends GameBase {
    constructor() {
        super("Volley-Bomb", "Volleyball with exploding bomb! First to 5 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.floorY = h - 48;
        this.net = { x: w / 2 - 5, y: this.floorY - 120, w: 10, h: 120 };
        this.gravity = 980;
        this.roundMsg = '';
        this.roundPause = 0;
        this.flashTimer = 0;
        this.serve(Math.random() > 0.5 ? 1 : 2);
    }

    serve(server) {
        this.p1 = { x: this.width * 0.25, y: this.floorY, vx: 0, vy: 0, w: 42, h: 68, grounded: true };
        this.p2 = { x: this.width * 0.75, y: this.floorY, vx: 0, vy: 0, w: 42, h: 68, grounded: true };
        this.ball = {
            x: server === 1 ? this.p1.x : this.p2.x,
            y: this.height * 0.32,
            vx: server === 1 ? 90 : -90,
            vy: -60,
            r: 16
        };
        this.bombTimer = 3.6 + Math.random() * 0.6;
        this.fusePulse = 0;
        this.serveDelay = 0.55;
        this.hitCd1 = 0;
        this.hitCd2 = 0;
    }

    jump(p) {
        if (p.grounded) {
            p.vy = -560;
            p.grounded = false;
            AudioManager.move();
        }
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.serve(this.lastPoint === 1 ? 2 : 1);
                }
            }
            return;
        }

        if (this.serveDelay > 0) {
            this.serveDelay -= dt;
            return;
        }

        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.hitCd1 > 0) this.hitCd1 -= dt;
        if (this.hitCd2 > 0) this.hitCd2 -= dt;
        this.fusePulse += dt * 10;
        this.bombTimer -= dt;

        const speed = 300;
        this.p1.vx = 0;
        if (Input.isDown('KeyA')) this.p1.vx = -speed;
        if (Input.isDown('KeyD')) this.p1.vx = speed;
        if (Input.isDown('KeyW') || Input.isDown('Space')) this.jump(this.p1);

        this.p2.vx = 0;
        if (GameManager.isSinglePlayer) {
            this.updateCPU(speed);
        } else {
            if (Input.isDown('ArrowLeft')) this.p2.vx = -speed;
            if (Input.isDown('ArrowRight')) this.p2.vx = speed;
            if (Input.isDown('ArrowUp') || Input.isDown('Enter')) this.jump(this.p2);
        }

        [this.p1, this.p2].forEach((p, i) => {
            p.vy += this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y >= this.floorY) {
                p.y = this.floorY;
                p.vy = 0;
                p.grounded = true;
            } else {
                p.grounded = false;
            }
            if (i === 0) {
                p.x = Math.max(p.w / 2 + 10, Math.min(this.net.x - p.w / 2 - 2, p.x));
            } else {
                p.x = Math.max(this.net.x + this.net.w + p.w / 2 + 2, Math.min(this.width - p.w / 2 - 10, p.x));
            }
        });

        const b = this.ball;
        b.vy += this.gravity * 0.72 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x < b.r + 6) {
            b.x = b.r + 6;
            b.vx = Math.abs(b.vx) * 0.8;
            AudioManager.tick();
        }
        if (b.x > this.width - b.r - 6) {
            b.x = this.width - b.r - 6;
            b.vx = -Math.abs(b.vx) * 0.8;
            AudioManager.tick();
        }
        if (b.y < b.r + 24) {
            b.y = b.r + 24;
            b.vy = Math.abs(b.vy) * 0.5;
        }

        // Net collision
        if (b.x + b.r > this.net.x && b.x - b.r < this.net.x + this.net.w && b.y + b.r > this.net.y) {
            if (b.x < this.width / 2) {
                b.x = this.net.x - b.r;
                b.vx = -Math.abs(b.vx) * 0.85;
            } else {
                b.x = this.net.x + this.net.w + b.r;
                b.vx = Math.abs(b.vx) * 0.85;
            }
            AudioManager.tick();
        }

        this.hitPlayer(this.p1, 1);
        this.hitPlayer(this.p2, 2);

        // Floor / explode
        if (b.y + b.r >= this.floorY) {
            b.y = this.floorY - b.r;
            if (this.bombTimer <= 0) {
                const side = b.x < this.width / 2 ? 1 : 2;
                if (side === 1) {
                    this.scoreP2++;
                    this.lastPoint = 2;
                    this.roundMsg = GameManager.isSinglePlayer ? 'BOMB! CPU SCORES' : 'BOMB! P2 SCORES';
                } else {
                    this.scoreP1++;
                    this.lastPoint = 1;
                    this.roundMsg = 'BOMB! P1 SCORES';
                }
                this.roundPause = 1.2;
                this.flashTimer = 0.5;
                AudioManager.wrong();
            } else {
                // soft bounce resets fuse a bit
                b.vy = -Math.abs(b.vy) * 0.55 - 80;
                b.vx *= 0.85;
                this.bombTimer = Math.min(this.bombTimer + 0.35, 3.2);
                AudioManager.tick();
            }
        }
    }

    hitPlayer(p, id) {
        const b = this.ball;
        const cd = id === 1 ? this.hitCd1 : this.hitCd2;
        if (cd > 0) return;
        const cx = p.x;
        const cy = p.y - p.h * 0.45;
        const dx = b.x - cx;
        const dy = b.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < b.r + 34) {
            const nx = dx / dist;
            const ny = dy / dist;
            const power = 340 + Math.abs(p.vx) * 0.4;
            b.vx = nx * power + p.vx * 0.9 + (id === 1 ? 40 : -40);
            b.vy = Math.min(ny * power, -220) - (p.grounded ? 40 : 120);
            b.x = cx + nx * (b.r + 34);
            b.y = cy + ny * (b.r + 34);
            this.bombTimer = Math.max(this.bombTimer, 2.0);
            if (id === 1) this.hitCd1 = 0.18; else this.hitCd2 = 0.18;
            AudioManager.move();
        }
    }

    updateCPU(speed) {
        const b = this.ball;
        const p = this.p2;
        if (b.x > this.width / 2 - 30) {
            const predict = b.x + b.vx * 0.22 + (Math.random() - 0.5) * 28;
            const dx = predict - p.x;
            if (Math.abs(dx) > 12) p.vx = Math.sign(dx) * speed * 0.84;
            if (b.y > this.floorY - 150 && Math.abs(b.x - p.x) < 70 && Math.random() < 0.06) {
                this.jump(p);
            }
            // panic jump when fuse low and ball near
            if (this.bombTimer < 1.1 && Math.abs(b.x - p.x) < 90 && p.grounded && Math.random() < 0.05) {
                this.jump(p);
            }
        } else {
            const home = this.width * 0.72;
            if (Math.abs(p.x - home) > 10) p.vx = Math.sign(home - p.x) * speed * 0.45;
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Court halves
        ctx.fillStyle = 'rgba(255,80,80,0.06)';
        ctx.fillRect(16, 50, this.width / 2 - 16, this.floorY - 50);
        ctx.fillStyle = 'rgba(140,82,255,0.06)';
        ctx.fillRect(this.width / 2, 50, this.width / 2 - 16, this.floorY - 50);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 50, this.width - 32, this.floorY - 50);

        // Floor
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.floorY, this.width, this.height - this.floorY);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, this.floorY, this.width, 3);

        // Net
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(this.net.x, this.net.y, this.net.w, this.net.h);
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        for (let y = this.net.y; y < this.floorY; y += 14) {
            ctx.beginPath();
            ctx.moveTo(this.net.x - 8, y);
            ctx.lineTo(this.net.x + this.net.w + 8, y);
            ctx.stroke();
        }

        // Players
        this.drawPlayer(ctx, this.p1, Theme.p1, 'P1');
        this.drawPlayer(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        // Bomb ball
        const b = this.ball;
        const danger = this.bombTimer < 1.2;
        const pulse = danger ? 1 + Math.sin(this.fusePulse) * 0.12 : 1;
        ctx.fillStyle = danger ? Theme.accent : Theme.fg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.bombTimer < 0.8 ? Theme.accent : Theme.bg;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.max(0, Math.ceil(this.bombTimer))), b.x, b.y + 5);

        // Fuse bar
        const barW = 120;
        const barX = this.width / 2 - barW / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(barX, 64, barW, 10);
        ctx.fillStyle = this.bombTimer < 1.2 ? Theme.accent : Theme.fg;
        ctx.fillRect(barX, 64, barW * Math.max(0, Math.min(1, this.bombTimer / 4)), 10);

        // HUD
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 32px Arial';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.25, 40);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.75, 40);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('keep the bomb alive · fuse hits 0 = boom on floor', this.width / 2, this.height - 14);
        ctx.fillText('A/D move · W/Space jump', this.width / 2, 22);

        if (this.serveDelay > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Arial';
            ctx.fillText('SERVE', this.width / 2, this.height * 0.4);
        }

        if (this.flashTimer > 0) {
            ctx.fillStyle = `rgba(255,80,40,${this.flashTimer * 0.25})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }

    drawPlayer(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.h - 6, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + 14);
    }
}

GameManager.registerGame(new GameVolleyBomb());
