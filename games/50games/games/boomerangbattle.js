class BoomerangBattle extends GameBase {
    constructor() {
        super("Boomerang Battle", "Throw returning boomerangs — hit your rival! First to 5.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.arenaPad = 28;
        this.resetRound();
    }

    resetRound() {
        this.p1 = {
            x: 110, y: this.height / 2, r: 18,
            dirX: 1, dirY: 0, throwCd: 0, spaceHeld: false
        };
        this.p2 = {
            x: this.width - 110, y: this.height / 2, r: 18,
            dirX: -1, dirY: 0, throwCd: 0, spaceHeld: false
        };
        this.b1 = null;
        this.b2 = null;
        this.roundMsg = '';
        this.roundPause = 0;
        this.cpuThink = 0;
        this.cpuCharge = 0;
    }

    scoreHit(winner) {
        if (winner === 1) {
            this.scoreP1++;
            this.roundMsg = 'P1 HIT!';
            AudioManager.correct();
        } else {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU HIT!' : 'P2 HIT!';
            AudioManager.correct();
        }
        this.roundPause = 1.15;
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

        const moveSpeed = 240;
        const boomSpeed = 420;
        const turnRate = 3.2;

        const movePlayer = (p, up, down, left, right) => {
            let dx = 0, dy = 0;
            if (Input.isDown(up)) dy -= 1;
            if (Input.isDown(down)) dy += 1;
            if (Input.isDown(left)) dx -= 1;
            if (Input.isDown(right)) dx += 1;
            if (dx !== 0 || dy !== 0) {
                const mag = Math.hypot(dx, dy);
                dx /= mag; dy /= mag;
                p.dirX = dx; p.dirY = dy;
                p.x += dx * moveSpeed * dt;
                p.y += dy * moveSpeed * dt;
            }
            p.x = Math.max(this.arenaPad + p.r, Math.min(this.width - this.arenaPad - p.r, p.x));
            p.y = Math.max(this.arenaPad + p.r + 40, Math.min(this.height - this.arenaPad - p.r - 20, p.y));
        };

        const tryThrow = (p, boomRef, key, isCpu) => {
            p.throwCd = Math.max(0, p.throwCd - dt);
            if (boomRef) return boomRef;
            if (p.throwCd > 0) return null;

            let wantThrow = false;
            if (isCpu) {
                wantThrow = this.cpuCharge <= 0;
            } else {
                const down = Input.isDown(key);
                wantThrow = down && !p.spaceHeld;
                p.spaceHeld = down;
            }

            if (wantThrow) {
                const mag = Math.hypot(p.dirX, p.dirY) || 1;
                AudioManager.move();
                p.throwCd = 0.35;
                return {
                    x: p.x + (p.dirX / mag) * (p.r + 8),
                    y: p.y + (p.dirY / mag) * (p.r + 8),
                    vx: (p.dirX / mag) * boomSpeed,
                    vy: (p.dirY / mag) * boomSpeed,
                    life: 0,
                    spin: 0
                };
            }
            return null;
        };

        movePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD');
        this.b1 = tryThrow(this.p1, this.b1, 'Space', false) || this.b1;

        if (GameManager.isSinglePlayer) {
            this.cpuThink -= dt;
            this.cpuCharge = Math.max(0, this.cpuCharge - dt);

            const dx = this.p1.x - this.p2.x;
            const dy = this.p1.y - this.p2.y;
            const dist = Math.hypot(dx, dy) || 1;

            // Keep mid-range, imperfect tracking
            let tdx = 0, tdy = 0;
            if (dist < 120) {
                tdx = -dx / dist;
                tdy = -dy / dist;
            } else if (dist > 220) {
                tdx = dx / dist;
                tdy = dy / dist;
            } else {
                // Strafe
                tdx = -dy / dist;
                tdy = dx / dist;
                if (Math.sin(this.cpuThink * 3) > 0) { tdx = -tdx; tdy = -tdy; }
            }

            // Dodge incoming boomerang
            if (this.b1) {
                const bdx = this.b1.x - this.p2.x;
                const bdy = this.b1.y - this.p2.y;
                if (Math.hypot(bdx, bdy) < 100) {
                    tdx = -bdy / (Math.hypot(bdx, bdy) || 1);
                    tdy = bdx / (Math.hypot(bdx, bdy) || 1);
                }
            }

            const aimJitter = (Math.random() - 0.5) * 0.35;
            this.p2.dirX = Math.cos(Math.atan2(dy, dx) + aimJitter);
            this.p2.dirY = Math.sin(Math.atan2(dy, dx) + aimJitter);

            const mag = Math.hypot(tdx, tdy) || 1;
            this.p2.x += (tdx / mag) * moveSpeed * 0.78 * dt;
            this.p2.y += (tdy / mag) * moveSpeed * 0.78 * dt;
            this.p2.x = Math.max(this.arenaPad + this.p2.r, Math.min(this.width - this.arenaPad - this.p2.r, this.p2.x));
            this.p2.y = Math.max(this.arenaPad + this.p2.r + 40, Math.min(this.height - this.arenaPad - this.p2.r - 20, this.p2.y));

            if (!this.b2 && this.cpuCharge <= 0 && dist < 280 && Math.random() < 0.9 * dt) {
                this.cpuCharge = 0.4 + Math.random() * 0.7;
            }
            const thrown = tryThrow(this.p2, this.b2, 'Enter', true);
            if (thrown && !this.b2) {
                this.b2 = thrown;
                this.cpuCharge = 0.8 + Math.random() * 0.6;
            }
        } else {
            movePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
            this.b2 = tryThrow(this.p2, this.b2, 'Enter', false) || this.b2;
        }

        const updateBoom = (b, owner, opp, ownerId) => {
            if (!b) return null;
            b.life += dt;
            b.spin += 14 * dt;

            // Return toward owner after a short outward phase
            const pull = b.life > 0.28 ? 1 : 0.15;
            const tx = owner.x - b.x;
            const ty = owner.y - b.y;
            const tdist = Math.hypot(tx, ty) || 1;
            b.vx += (tx / tdist) * boomSpeed * turnRate * pull * dt;
            b.vy += (ty / tdist) * boomSpeed * turnRate * pull * dt;

            const sp = Math.hypot(b.vx, b.vy) || 1;
            const targetSp = boomSpeed * (b.life < 0.2 ? 1.05 : 0.95);
            b.vx = (b.vx / sp) * targetSp;
            b.vy = (b.vy / sp) * targetSp;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Soft arena bounce
            if (b.x < this.arenaPad || b.x > this.width - this.arenaPad) b.vx *= -1;
            if (b.y < this.arenaPad + 50 || b.y > this.height - this.arenaPad - 10) b.vy *= -1;
            b.x = Math.max(this.arenaPad, Math.min(this.width - this.arenaPad, b.x));
            b.y = Math.max(this.arenaPad + 50, Math.min(this.height - this.arenaPad - 10, b.y));

            // Catch return
            if (b.life > 0.35 && Math.hypot(b.x - owner.x, b.y - owner.y) < owner.r + 12) {
                AudioManager.tick();
                return null;
            }
            // Expire long flights
            if (b.life > 3.5) return null;

            // Hit opponent
            if (Math.hypot(b.x - opp.x, b.y - opp.y) < opp.r + 12) {
                this.scoreHit(ownerId);
                return null;
            }
            return b;
        };

        this.b1 = updateBoom(this.b1, this.p1, this.p2, 1);
        if (this.roundPause > 0) return;
        this.b2 = updateBoom(this.b2, this.p2, this.p1, 2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Arena
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.arenaPad, this.arenaPad + 40, this.width - this.arenaPad * 2, this.height - this.arenaPad * 2 - 50);
        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.moveTo(this.width / 2, this.arenaPad + 40);
        ctx.lineTo(this.width / 2, this.height - this.arenaPad - 10);
        ctx.stroke();
        ctx.setLineDash([]);

        const drawPlayer = (p, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            // Facing notch
            ctx.fillStyle = Theme.fg;
            const mag = Math.hypot(p.dirX, p.dirY) || 1;
            ctx.beginPath();
            ctx.arc(p.x + (p.dirX / mag) * 12, p.y + (p.dirY / mag) * 12, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, p.x, p.y + p.r + 14);
        };

        const drawBoom = (b, color) => {
            if (!b) return;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.spin);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 10, Math.PI + 0.2, Math.PI * 2 - 0.2);
            ctx.stroke();
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(10, 0, 3, 0, Math.PI * 2);
            ctx.arc(-10, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        drawPlayer(this.p1, Theme.p1, 'P1');
        drawPlayer(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2');
        drawBoom(this.b1, Theme.p1);
        drawBoom(this.b2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hits: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 28);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('WASD / Arrows move · Space / Enter throw (returns)', this.width / 2, 50);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new BoomerangBattle());
