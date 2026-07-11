class GameMusicalChairs extends GameBase {
    constructor() {
        super("Musical Chairs", "Walk the circle. Sit when music stops! First to 5 wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.roundMsg = '';
        this.roundPause = 0;
        this.resetRound();
    }

    resetRound() {
        this.cx = this.width / 2;
        this.cy = this.height / 2 + 20;
        this.rx = Math.min(this.width, this.height) * 0.32;
        this.ry = this.rx * 0.62;
        this.p1 = { angle: Math.PI * 1.15, sitting: false, bob: 0 };
        this.p2 = { angle: Math.PI * 0.15, sitting: false, bob: 0 };
        this.chairs = [];
        const n = 5;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            this.chairs.push({
                angle: a,
                x: this.cx + Math.cos(a) * this.rx,
                y: this.cy + Math.sin(a) * this.ry,
                taken: false,
                by: 0
            });
        }
        this.musicTimer = 2.4 + Math.random() * 3.2;
        this.musicPlaying = true;
        this.sitWindow = false;
        this.sitTimeout = 0;
        this.beat = 0;
        this.cpuSitDelay = 0.15 + Math.random() * 0.55;
        this.cpuReacted = false;
        this.falseStart = false;
    }

    pos(angle) {
        return {
            x: this.cx + Math.cos(angle) * this.rx,
            y: this.cy + Math.sin(angle) * this.ry
        };
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

        this.beat += dt * (this.musicPlaying ? 8 : 2);
        this.p1.bob += dt * 10;
        this.p2.bob += dt * 10;

        if (this.musicPlaying) {
            this.musicTimer -= dt;
            // subtle music ticks
            if (Math.floor(this.beat) !== Math.floor(this.beat - dt * 8) && Math.floor(this.beat) % 2 === 0) {
                AudioManager.tick();
            }

            const turn = 3.6;
            if (Input.isDown('KeyA')) this.p1.angle -= turn * dt;
            if (Input.isDown('KeyD')) this.p1.angle += turn * dt;

            // Early sit = false start (penalize lightly by spinning away)
            if (Input.isDown('Space')) {
                this.p1.angle += 1.5 * dt;
                if (!this.falseStart) {
                    this.falseStart = true;
                    AudioManager.wrong();
                }
            }

            if (GameManager.isSinglePlayer) {
                // Walk toward nearest chair-ish path with wobble
                const nearest = this.nearestChairAngle(this.p2.angle);
                let diff = nearest - this.p2.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const cruise = 2.2 + Math.sin(this.musicTimer * 3.5) * 0.9;
                // mostly circle, occasionally nudge toward chair
                this.p2.angle += cruise * dt + Math.sign(diff) * 0.6 * dt;
            } else {
                if (Input.isDown('ArrowLeft')) this.p2.angle -= turn * dt;
                if (Input.isDown('ArrowRight')) this.p2.angle += turn * dt;
                if (Input.isDown('Enter')) {
                    this.p2.angle -= 1.5 * dt;
                }
            }

            if (this.musicTimer <= 0) {
                this.musicPlaying = false;
                this.sitWindow = true;
                this.sitTimeout = 0;
                this.cpuSitDelay = 0.12 + Math.random() * 0.5;
                this.cpuReacted = false;
                this.falseStart = false;
                AudioManager.move();
            }
        } else if (this.sitWindow) {
            this.sitTimeout += dt;

            if (Input.isDown('Space') && !this.p1.sitting) this.trySit(this.p1, 1);

            if (GameManager.isSinglePlayer) {
                if (!this.cpuReacted && !this.p2.sitting) {
                    this.cpuSitDelay -= dt;
                    if (this.cpuSitDelay <= 0) {
                        // sometimes miss if far
                        this.trySit(this.p2, 2);
                        this.cpuReacted = true;
                    }
                }
            } else if (Input.isDown('Enter') && !this.p2.sitting) {
                this.trySit(this.p2, 2);
            }

            // Auto-timeout: if neither sat, no point
            if (this.sitTimeout > 2.2) {
                this.roundMsg = 'TOO SLOW!';
                this.roundPause = 0.9;
                AudioManager.wrong();
            }
        }
    }

    nearestChairAngle(angle) {
        let best = this.chairs[0].angle;
        let bestD = 999;
        for (const c of this.chairs) {
            if (c.taken) continue;
            let d = c.angle - angle;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            if (Math.abs(d) < bestD) {
                bestD = Math.abs(d);
                best = c.angle;
            }
        }
        return best;
    }

    trySit(player, id) {
        const p = this.pos(player.angle);
        let best = null;
        let bestD = 56;
        for (const c of this.chairs) {
            if (c.taken) continue;
            const d = Math.hypot(p.x - c.x, p.y - c.y);
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }
        if (best) {
            best.taken = true;
            best.by = id;
            player.sitting = true;
            player.angle = best.angle;
            if (id === 1) {
                this.scoreP1++;
                this.roundMsg = 'P1 SITS!';
            } else {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU SITS!' : 'P2 SITS!';
            }
            this.sitWindow = false;
            this.roundPause = 1.1;
            AudioManager.correct();
        } else {
            AudioManager.wrong();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floor ellipse
        ctx.fillStyle = 'rgba(255,230,0,0.06)';
        ctx.beginPath();
        ctx.ellipse(this.cx, this.cy + 10, this.rx + 50, this.ry + 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Chairs
        for (const c of this.chairs) {
            if (c.taken) {
                ctx.globalAlpha = 0.35;
            }
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(c.x - 18, c.y - 8, 36, 16);
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 2;
            ctx.strokeRect(c.x - 18, c.y - 8, 36, 16);
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(c.x - 16, c.y - 22, 6, 16);
            ctx.fillRect(c.x + 10, c.y - 22, 6, 16);
            ctx.globalAlpha = 1;
        }

        // Players
        this.drawPlayer(ctx, this.p1, Theme.p1, 'P1');
        this.drawPlayer(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        // Status banner
        ctx.textAlign = 'center';
        if (this.musicPlaying) {
            const pulse = 1 + Math.sin(this.beat) * 0.06;
            ctx.save();
            ctx.translate(this.width / 2, 70);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 42px Impact';
            ctx.fillText('MUSIC!', 0, 0);
            ctx.restore();
            // notes
            ctx.fillStyle = Theme.accent;
            ctx.font = '20px Arial';
            ctx.fillText('♪  ♫  ♪', this.width / 2, 100);
        } else {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 48px Impact';
            ctx.fillText('SIT!!!', this.width / 2, 80);
        }

        // Scores
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 28px Arial';
        ctx.fillText(`${this.scoreP1}`, this.width * 0.22, 40);
        ctx.fillText(`${this.scoreP2}`, this.width * 0.78, 40);
        ctx.font = '12px Arial';
        ctx.fillStyle = Theme.p1;
        ctx.fillText('P1', this.width * 0.22, 56);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillText(GameManager.isSinglePlayer ? 'CPU' : 'P2', this.width * 0.78, 56);

        ctx.fillStyle = Theme.accent;
        ctx.font = '13px Arial';
        ctx.fillText('A/D walk · Space sit when music stops · first to 5', this.width / 2, this.height - 14);

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }

    drawPlayer(ctx, p, color, label) {
        const pos = this.pos(p.angle);
        const bob = p.sitting ? 0 : Math.sin(p.bob) * 4;
        ctx.fillStyle = color;
        if (p.sitting) {
            ctx.fillRect(pos.x - 16, pos.y - 22, 32, 28);
        } else {
            ctx.fillRect(pos.x - 14, pos.y - 40 + bob, 28, 44);
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - (p.sitting ? 28 : 48) + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, pos.x, pos.y + 18);
    }
}

GameManager.registerGame(new GameMusicalChairs());
