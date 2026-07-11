class GameHoops extends GameBase {
    constructor() {
        super("Hoops", "Jump and shoot! First to 5 baskets wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.floorY = h - 70;
        this.gravity = 1400;
        this.roundMsg = '';
        this.roundPause = 0;
        this.flashTimer = 0;
        this.resetPlayers();
        this.resetBall(0);
    }

    resetPlayers() {
        this.p1 = { x: this.width * 0.22, y: this.floorY, vx: 0, vy: 0, w: 36, h: 62, grounded: true, face: 1 };
        this.p2 = { x: this.width * 0.78, y: this.floorY, vx: 0, vy: 0, w: 36, h: 62, grounded: true, face: -1 };
        this.hoopR = { x: this.width - 95, y: 150, w: 64, h: 8 }; // P1 scores here (right)
        this.hoopL = { x: 31, y: 150, w: 64, h: 8 }; // P2 scores here (left)
    }

    resetBall(toward) {
        this.ball = {
            x: this.width / 2,
            y: this.height * 0.35,
            vx: (toward || (Math.random() > 0.5 ? 1 : -1)) * (80 + Math.random() * 60),
            vy: -120,
            r: 14,
            holder: 0
        };
        this.cooldown = 0.35;
        this.shotCd1 = 0;
        this.shotCd2 = 0;
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
                    GameManager.gameOver(this.scoreP1 >= 5 ? 1 : 2);
                } else {
                    this.resetPlayers();
                    this.resetBall(this.lastScorer === 1 ? -1 : 1);
                }
            }
            return;
        }

        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.cooldown > 0) this.cooldown -= dt;
        if (this.shotCd1 > 0) this.shotCd1 -= dt;
        if (this.shotCd2 > 0) this.shotCd2 -= dt;

        const speed = 280;
        const jumpV = -620;

        // P1
        this.p1.vx = 0;
        if (Input.isDown('KeyA')) { this.p1.vx = -speed; this.p1.face = -1; }
        if (Input.isDown('KeyD')) { this.p1.vx = speed; this.p1.face = 1; }
        if (Input.isDown('KeyW') && this.p1.grounded) {
            this.p1.vy = jumpV;
            this.p1.grounded = false;
            AudioManager.move();
        }
        if (Input.isDown('Space') && this.shotCd1 <= 0) this.tryShoot(1);

        // P2 / CPU
        this.p2.vx = 0;
        if (GameManager.isSinglePlayer) {
            this.updateCPU(dt, speed, jumpV);
        } else {
            if (Input.isDown('ArrowLeft')) { this.p2.vx = -speed; this.p2.face = -1; }
            if (Input.isDown('ArrowRight')) { this.p2.vx = speed; this.p2.face = 1; }
            if (Input.isDown('ArrowUp') && this.p2.grounded) {
                this.p2.vy = jumpV;
                this.p2.grounded = false;
                AudioManager.move();
            }
            if (Input.isDown('Enter') && this.shotCd2 <= 0) this.tryShoot(2);
        }

        this.integratePlayer(this.p1, dt);
        this.integratePlayer(this.p2, dt);

        // Ball physics
        const b = this.ball;
        if (b.holder === 1) {
            b.x = this.p1.x + this.p1.face * 22;
            b.y = this.p1.y - this.p1.h * 0.55;
            b.vx = this.p1.vx;
            b.vy = this.p1.vy;
        } else if (b.holder === 2) {
            b.x = this.p2.x + this.p2.face * 22;
            b.y = this.p2.y - this.p2.h * 0.55;
            b.vx = this.p2.vx;
            b.vy = this.p2.vy;
        } else {
            b.vy += this.gravity * 0.75 * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vx *= Math.pow(0.992, dt * 60);

            if (b.x < b.r + 8) { b.x = b.r + 8; b.vx = Math.abs(b.vx) * 0.7; AudioManager.tick(); }
            if (b.x > this.width - b.r - 8) { b.x = this.width - b.r - 8; b.vx = -Math.abs(b.vx) * 0.7; AudioManager.tick(); }
            if (b.y > this.floorY - b.r) {
                b.y = this.floorY - b.r;
                b.vy = -Math.abs(b.vy) * 0.55;
                b.vx *= 0.85;
                if (Math.abs(b.vy) < 40) b.vy = 0;
                if (Math.abs(b.vy) > 60) AudioManager.tick();
            }
            if (b.y < b.r + 20) { b.y = b.r + 20; b.vy = Math.abs(b.vy) * 0.5; }

            this.pickupCheck(this.p1, 1);
            this.pickupCheck(this.p2, 2);
        }

        this.checkRim(this.hoopR, 1);
        this.checkRim(this.hoopL, 2);
        this.collidePlayers();
    }

    integratePlayer(p, dt) {
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
        p.x = Math.max(28 + p.w / 2, Math.min(this.width - 28 - p.w / 2, p.x));
    }

    pickupCheck(p, id) {
        if (this.cooldown > 0) return;
        const b = this.ball;
        const dx = b.x - p.x;
        const dy = b.y - (p.y - p.h * 0.4);
        if (Math.hypot(dx, dy) < 38) {
            b.holder = id;
            AudioManager.tick();
        }
    }

    tryShoot(id) {
        const b = this.ball;
        if (b.holder !== id) {
            // swipe at loose ball
            const p = id === 1 ? this.p1 : this.p2;
            const dx = b.x - p.x;
            const dy = b.y - (p.y - p.h * 0.4);
            if (Math.hypot(dx, dy) < 50) {
                const hoop = id === 1 ? this.hoopR : this.hoopL;
                const ang = Math.atan2(hoop.y - b.y, hoop.x + hoop.w / 2 - b.x);
                b.vx = Math.cos(ang) * 420 + p.vx * 0.3;
                b.vy = Math.sin(ang) * 420 - 220;
                b.holder = 0;
                if (id === 1) this.shotCd1 = 0.35; else this.shotCd2 = 0.35;
                AudioManager.move();
            }
            return;
        }
        const p = id === 1 ? this.p1 : this.p2;
        const hoop = id === 1 ? this.hoopR : this.hoopL;
        const tx = hoop.x + hoop.w / 2;
        const ty = hoop.y;
        const dx = tx - b.x;
        const dy = ty - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        const power = 380 + Math.min(dist * 0.35, 180);
        b.vx = (dx / dist) * power + p.vx * 0.25;
        b.vy = (dy / dist) * power - 280 - (p.grounded ? 0 : 60);
        b.holder = 0;
        this.cooldown = 0.2;
        if (id === 1) this.shotCd1 = 0.4; else this.shotCd2 = 0.4;
        AudioManager.move();
    }

    checkRim(hoop, scorer) {
        const b = this.ball;
        if (b.holder) return;
        if (b.vy > 0 &&
            b.x > hoop.x + 4 && b.x < hoop.x + hoop.w - 4 &&
            b.y > hoop.y - 6 && b.y < hoop.y + 22) {
            if (scorer === 1) this.scoreP1++; else this.scoreP2++;
            this.lastScorer = scorer;
            this.roundMsg = scorer === 1 ? 'P1 SCORES!' : (GameManager.isSinglePlayer ? 'CPU SCORES!' : 'P2 SCORES!');
            this.roundPause = 1.1;
            this.flashTimer = 0.45;
            AudioManager.correct();
        }
        // rim bounce
        if (b.x > hoop.x - 4 && b.x < hoop.x + hoop.w + 4 &&
            b.y > hoop.y - 10 && b.y < hoop.y + 14) {
            const nearLeft = Math.abs(b.x - hoop.x) < 12;
            const nearRight = Math.abs(b.x - (hoop.x + hoop.w)) < 12;
            if (nearLeft || nearRight) {
                b.vx = nearLeft ? -Math.abs(b.vx) * 0.6 - 40 : Math.abs(b.vx) * 0.6 + 40;
                b.vy = -Math.abs(b.vy) * 0.4 - 30;
                AudioManager.tick();
            }
        }
    }

    collidePlayers() {
        const dx = this.p2.x - this.p1.x;
        const dist = Math.abs(dx);
        const min = (this.p1.w + this.p2.w) * 0.45;
        if (dist < min && dist > 0) {
            const push = (min - dist) / 2;
            this.p1.x -= Math.sign(dx) * push;
            this.p2.x += Math.sign(dx) * push;
        }
    }

    updateCPU(dt, speed, jumpV) {
        const b = this.ball;
        const p = this.p2;
        let targetX = this.width * 0.72;

        if (b.holder === 2) {
            // drive toward left hoop with imperfect aim
            targetX = this.hoopL.x + 90 + Math.sin(performance.now() * 0.003) * 30;
            if (Math.abs(p.x - targetX) < 90 || (!p.grounded && Math.random() < 0.04)) {
                if (this.shotCd2 <= 0 && Math.random() < 0.08) this.tryShoot(2);
            }
            if (p.grounded && Math.random() < 0.015) {
                p.vy = jumpV * 0.95;
                p.grounded = false;
            }
        } else if (b.holder === 1) {
            targetX = this.p1.x + 40;
            if (p.grounded && Math.abs(p.x - this.p1.x) < 70 && Math.random() < 0.02) {
                p.vy = jumpV * 0.9;
                p.grounded = false;
            }
        } else {
            // chase loose ball with lag
            targetX = b.x + b.vx * 0.18 + (Math.random() - 0.5) * 20;
            if (b.y < p.y - 80 && p.grounded && Math.abs(b.x - p.x) < 100 && Math.random() < 0.04) {
                p.vy = jumpV * 0.92;
                p.grounded = false;
            }
            if (this.shotCd2 <= 0 && Math.hypot(b.x - p.x, b.y - (p.y - 30)) < 48 && Math.random() < 0.1) {
                this.tryShoot(2);
            }
        }

        const diff = targetX - p.x;
        if (Math.abs(diff) > 10) {
            p.vx = Math.sign(diff) * speed * 0.86;
            p.face = Math.sign(diff) || p.face;
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Court
        ctx.fillStyle = 'rgba(255,230,0,0.05)';
        ctx.fillRect(20, 40, this.width - 40, this.floorY - 40);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 40, this.width - 40, this.floorY - 40);
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 40);
        ctx.lineTo(this.width / 2, this.floorY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.width / 2, this.floorY - 40, 50, Math.PI, 0);
        ctx.stroke();

        // Floor
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(0, this.floorY, this.width, this.height - this.floorY);
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, this.floorY, this.width, 4);

        // Hoops
        this.drawHoop(ctx, this.hoopL, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, true);
        this.drawHoop(ctx, this.hoopR, Theme.p1, false);

        // Players
        this.drawPlayer(ctx, this.p1, Theme.p1, 'P1');
        this.drawPlayer(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        // Ball
        const b = this.ball;
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.55, 0.2, 2.5);
        ctx.stroke();

        // HUD
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.28, 36);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.72, 36);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('first to 5 · W jump · Space shoot', this.width / 2, this.height - 14);

        if (this.flashTimer > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 0.2})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }

    drawHoop(ctx, hoop, color, left) {
        ctx.fillStyle = color;
        if (left) {
            ctx.fillRect(hoop.x - 14, hoop.y - 55, 12, 70);
            ctx.fillRect(8, hoop.y - 55, 22, 10);
        } else {
            ctx.fillRect(hoop.x + hoop.w + 2, hoop.y - 55, 12, 70);
            ctx.fillRect(this.width - 30, hoop.y - 55, 22, 10);
        }
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(hoop.x, hoop.y, hoop.w, hoop.h);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hoop.x + 4, hoop.y + hoop.h);
        ctx.lineTo(hoop.x + 8, hoop.y + 28);
        ctx.lineTo(hoop.x + hoop.w - 8, hoop.y + 28);
        ctx.lineTo(hoop.x + hoop.w - 4, hoop.y + hoop.h);
        ctx.stroke();
    }

    drawPlayer(ctx, p, color, label) {
        ctx.fillStyle = color;
        ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.h - 8, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + 14);
    }
}

GameManager.registerGame(new GameHoops());
