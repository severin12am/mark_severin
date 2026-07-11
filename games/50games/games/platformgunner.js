class PlatformGunner extends GameBase {
    constructor() {
        super("Platform Gunner", "Jump and shoot on platforms. First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.platforms = [
            { x: 0, y: h - 36, w: w, h: 36 },
            { x: w * 0.5 - 110, y: h - 160, w: 220, h: 16 },
            { x: 40, y: h - 280, w: 160, h: 16 },
            { x: w - 200, y: h - 280, w: 160, h: 16 },
            { x: w * 0.5 - 70, y: h - 400, w: 140, h: 16 }
        ];
        this.resetRound();
    }

    resetRound() {
        this.p1 = {
            x: 80, y: 80, vx: 0, vy: 0, w: 22, h: 32,
            grounded: false, dir: 1, shootCd: 0, jumpHeld: false
        };
        this.p2 = {
            x: this.width - 100, y: 80, vx: 0, vy: 0, w: 22, h: 32,
            grounded: false, dir: -1, shootCd: 0, jumpHeld: false
        };
        this.bullets = [];
        this.roundMsg = '';
        this.roundPause = 0;
        this.cpuShootTimer = 0.4;
        this.cpuJumpTimer = 0.6;
    }

    scoreKill(winner) {
        if (winner === 1) {
            this.scoreP1++;
            this.roundMsg = 'P1 SCORES!';
            AudioManager.correct();
        } else {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU SCORES!' : 'P2 SCORES!';
            AudioManager.correct();
        }
        this.roundPause = 1.1;
        this.bullets = [];
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        const grav = 1400;
        const moveSp = 280;
        const jumpV = -520;
        const bulletSp = 520;
        const shootCd = 0.38;

        // P1
        this.p1.vx = 0;
        if (Input.isDown('KeyA')) { this.p1.vx = -moveSp; this.p1.dir = -1; }
        if (Input.isDown('KeyD')) { this.p1.vx = moveSp; this.p1.dir = 1; }
        const p1Jump = Input.isDown('KeyW');
        if (p1Jump && !this.p1.jumpHeld && this.p1.grounded) {
            this.p1.vy = jumpV;
            this.p1.grounded = false;
            AudioManager.move();
        }
        this.p1.jumpHeld = p1Jump;
        this.p1.shootCd = Math.max(0, this.p1.shootCd - dt);
        if (Input.isDown('Space') && this.p1.shootCd <= 0) {
            this.bullets.push({
                x: this.p1.x + this.p1.w / 2 + this.p1.dir * 14,
                y: this.p1.y + 12,
                vx: this.p1.dir * bulletSp,
                owner: 1
            });
            this.p1.shootCd = shootCd;
            AudioManager.tick();
        }

        // P2 / CPU
        if (GameManager.isSinglePlayer) {
            this.cpuShootTimer -= dt;
            this.cpuJumpTimer -= dt;
            const dx = this.p1.x - this.p2.x;
            const dy = this.p1.y - this.p2.y;

            // Seek player with lag / spacing
            if (Math.abs(dx) > 70) {
                this.p2.vx = Math.sign(dx) * moveSp * 0.82;
                this.p2.dir = Math.sign(dx) || this.p2.dir;
            } else if (Math.abs(dx) < 40) {
                this.p2.vx = -Math.sign(dx || 1) * moveSp * 0.5;
            } else {
                this.p2.vx = 0;
            }

            // Jump toward higher platforms or player above
            if (this.p2.grounded && this.cpuJumpTimer <= 0) {
                if (dy < -40 || Math.random() < 0.15) {
                    this.p2.vy = jumpV;
                    this.p2.grounded = false;
                    this.cpuJumpTimer = 0.5 + Math.random() * 0.9;
                } else {
                    this.cpuJumpTimer = 0.2 + Math.random() * 0.4;
                }
            }

            this.p2.shootCd = Math.max(0, this.p2.shootCd - dt);
            if (this.cpuShootTimer <= 0 && this.p2.shootCd <= 0) {
                // Face player and shoot with imperfect aim window
                this.p2.dir = dx >= 0 ? 1 : -1;
                if (Math.abs(dy) < 55 || Math.random() < 0.25) {
                    this.bullets.push({
                        x: this.p2.x + this.p2.w / 2 + this.p2.dir * 14,
                        y: this.p2.y + 12,
                        vx: this.p2.dir * bulletSp,
                        owner: 2
                    });
                    this.p2.shootCd = shootCd * 1.15;
                    AudioManager.tick();
                }
                this.cpuShootTimer = 0.35 + Math.random() * 0.55;
            }
        } else {
            this.p2.vx = 0;
            if (Input.isDown('ArrowLeft')) { this.p2.vx = -moveSp; this.p2.dir = -1; }
            if (Input.isDown('ArrowRight')) { this.p2.vx = moveSp; this.p2.dir = 1; }
            const p2Jump = Input.isDown('ArrowUp');
            if (p2Jump && !this.p2.jumpHeld && this.p2.grounded) {
                this.p2.vy = jumpV;
                this.p2.grounded = false;
                AudioManager.move();
            }
            this.p2.jumpHeld = p2Jump;
            this.p2.shootCd = Math.max(0, this.p2.shootCd - dt);
            if (Input.isDown('Enter') && this.p2.shootCd <= 0) {
                this.bullets.push({
                    x: this.p2.x + this.p2.w / 2 + this.p2.dir * 14,
                    y: this.p2.y + 12,
                    vx: this.p2.dir * bulletSp,
                    owner: 2
                });
                this.p2.shootCd = shootCd;
                AudioManager.tick();
            }
        }

        // Physics
        [this.p1, this.p2].forEach(p => {
            p.vy += grav * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.grounded = false;

            if (p.x + p.w < 0) p.x = this.width;
            if (p.x > this.width) p.x = -p.w;

            // Fall reset
            if (p.y > this.height + 40) {
                p.x = p === this.p1 ? 80 : this.width - 100;
                p.y = 40;
                p.vx = 0;
                p.vy = 0;
            }

            this.platforms.forEach(plat => {
                if (p.x < plat.x + plat.w && p.x + p.w > plat.x &&
                    p.y + p.h > plat.y && p.y < plat.y + plat.h) {
                    // Landing from above
                    const prevBottom = p.y + p.h - p.vy * dt;
                    if (p.vy >= 0 && prevBottom <= plat.y + 8) {
                        p.y = plat.y - p.h;
                        p.vy = 0;
                        p.grounded = true;
                    }
                }
            });
        });

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            if (b.x < -20 || b.x > this.width + 20) {
                this.bullets.splice(i, 1);
                continue;
            }

            const hit = (pl) =>
                b.x > pl.x && b.x < pl.x + pl.w &&
                b.y > pl.y && b.y < pl.y + pl.h;

            if (b.owner === 1 && hit(this.p2)) {
                this.scoreKill(1);
                break;
            }
            if (b.owner === 2 && hit(this.p1)) {
                this.scoreKill(2);
                break;
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Backdrop strips
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(0, 80 + i * 70, this.width, 2);
        }

        ctx.fillStyle = Theme.fg;
        this.platforms.forEach((p, i) => {
            ctx.fillRect(p.x, p.y, p.w, p.h);
            if (i > 0) {
                ctx.fillStyle = Theme.accent;
                ctx.fillRect(p.x, p.y, p.w, 3);
                ctx.fillStyle = Theme.fg;
            }
        });

        const drawFighter = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            // Gun
            ctx.fillStyle = Theme.fg;
            const gx = p.dir > 0 ? p.x + p.w : p.x - 10;
            ctx.fillRect(gx, p.y + 10, 12, 5);
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x + p.w / 2, p.y - 8);
        };

        drawFighter(this.p1, Theme.p1, 'P1');
        drawFighter(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');

        this.bullets.forEach(b => {
            ctx.fillStyle = b.owner === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
            ctx.fillRect(b.x - 5, b.y - 2, 10, 4);
        });

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Kills: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 28);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('A/D move · W jump · Space shoot  |  ←/→ · ↑ · Enter', this.width / 2, 50);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new PlatformGunner());
