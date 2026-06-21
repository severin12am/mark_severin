class ArtilleryArc extends GameBase {
    constructor() {
        super("Artillery Arc", "Set angle & power, account for wind! First to 3 hits.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.startRound();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startRound() {
        this.terrain = [];
        for (let x = 0; x < this.width; x++) {
            const hill = Math.sin(x * 0.012) * 35 + Math.sin(x * 0.004) * 20;
            this.terrain.push(this.height - 120 + hill);
        }
        this.p1 = { x: 80, angle: 55, charging: false, power: 0 };
        this.p2 = { x: this.width - 80, angle: 55, charging: false, power: 0 };
        this.wind = (Math.random() - 0.5) * 18;
        this.turn = 1;
        this.shots = [];
        this.state = 'aim';
        this.hitFlash = 0;
        this.roundMsg = '';
    }

    groundY(x) {
        const ix = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
        return this.terrain[ix];
    }

    tankY(side) {
        const x = side === 1 ? this.p1.x : this.p2.x;
        return this.groundY(x) - 14;
    }

    fire(side) {
        const tank = side === 1 ? this.p1 : this.p2;
        const rad = tank.angle * Math.PI / 180;
        const speed = 4 + tank.power * 0.55;
        const vx = (side === 1 ? 1 : -1) * Math.cos(rad) * speed + this.wind * 0.04;
        const vy = -Math.sin(rad) * speed;
        this.shots.push({
            x: tank.x,
            y: this.tankY(side) - 8,
            vx,
            vy,
            owner: side,
            trail: []
        });
        tank.power = 0;
        tank.charging = false;
        this.state = 'flying';
        AudioManager.select();
    }

    update(dt) {
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
            if (this.hitFlash <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        if (this.state === 'flying') {
            for (let i = this.shots.length - 1; i >= 0; i--) {
                const s = this.shots[i];
                s.trail.push({ x: s.x, y: s.y });
                if (s.trail.length > 12) s.trail.shift();
                s.vy += 0.22;
                s.vx += this.wind * 0.002;
                s.x += s.vx;
                s.y += s.vy;

                const gy = this.groundY(s.x);
                if (s.y >= gy || s.x < 0 || s.x > this.width) {
                    this.shots.splice(i, 1);
                    continue;
                }

                const targetX = s.owner === 1 ? this.p2.x : this.p1.x;
                const targetY = this.tankY(s.owner === 1 ? 2 : 1);
                if (Math.hypot(s.x - targetX, s.y - targetY) < 28) {
                    if (s.owner === 1) {
                        this.scoreP1++;
                        this.roundMsg = 'P1 DIRECT HIT!';
                    } else {
                        this.scoreP2++;
                        this.roundMsg = GameManager.isSinglePlayer ? 'CPU DIRECT HIT!' : 'P2 DIRECT HIT!';
                    }
                    AudioManager.correct();
                    this.hitFlash = 1.2;
                    this.shots = [];
                    return;
                }
            }
            if (this.shots.length === 0) {
                this.turn = 3 - this.turn;
                this.wind += (Math.random() - 0.5) * 4;
                this.wind = Math.max(-22, Math.min(22, this.wind));
                this.state = 'aim';
            }
            return;
        }

        const tank = this.turn === 1 ? this.p1 : this.p2;
        const isCpu = GameManager.isSinglePlayer && this.turn === 2;

        if (this.turn === 1) {
            if (Input.isDown('KeyW')) tank.angle = Math.min(85, tank.angle + 40 * dt);
            if (Input.isDown('KeyS')) tank.angle = Math.max(15, tank.angle - 40 * dt);
            if (Input.isDown('Space')) {
                tank.charging = true;
                tank.power = Math.min(40, tank.power + 28 * dt);
            } else if (tank.charging && tank.power > 0) {
                this.fire(1);
            }
        } else if (isCpu) {
            this.cpuTimer = (this.cpuTimer || 0) - dt;
            if (this.cpuTimer <= 0) {
                tank.angle = 55 + (Math.random() - 0.5) * 12;
                tank.power = 16 + Math.random() * 14;
                this.fire(2);
                this.cpuTimer = 0.5;
            }
        } else {
            if (Input.isDown('ArrowUp')) tank.angle = Math.min(85, tank.angle + 40 * dt);
            if (Input.isDown('ArrowDown')) tank.angle = Math.max(15, tank.angle - 40 * dt);
            if (Input.isDown('Enter')) {
                tank.charging = true;
                tank.power = Math.min(40, tank.power + 28 * dt);
            } else if (tank.charging && tank.power > 0) {
                this.fire(2);
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#0d1520';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hits: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 32);

        ctx.beginPath();
        ctx.moveTo(0, this.height);
        for (let x = 0; x < this.width; x++) {
            ctx.lineTo(x, this.terrain[x]);
        }
        ctx.lineTo(this.width, this.height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,229,155,0.25)';
        ctx.fill();
        ctx.strokeStyle = Theme.p2;
        ctx.lineWidth = 2;
        ctx.stroke();

        this.shots.forEach(s => {
            s.trail.forEach((t, i) => {
                ctx.globalAlpha = (i + 1) / s.trail.length * 0.5;
                ctx.fillStyle = Theme.accent;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        const drawTank = (side, color, label) => {
            const t = side === 1 ? this.p1 : this.p2;
            const x = t.x;
            const y = this.tankY(side);
            const active = this.turn === side && this.state === 'aim';

            ctx.fillStyle = color;
            ctx.fillRect(x - 18, y - 10, 36, 14);
            ctx.fillRect(x - 8, y - 18, 16, 10);

            const rad = t.angle * Math.PI / 180;
            const dir = side === 1 ? 1 : -1;
            ctx.strokeStyle = active ? Theme.accent : Theme.fg;
            ctx.lineWidth = active ? 4 : 2;
            ctx.beginPath();
            ctx.moveTo(x, y - 14);
            ctx.lineTo(x + Math.cos(rad) * 28 * dir, y - 14 - Math.sin(rad) * 28);
            ctx.stroke();

            if (t.charging || t.power > 0) {
                ctx.fillStyle = Theme.accent;
                ctx.fillRect(x - 20, y - 34, t.power * 1.2, 6);
            }

            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, y + 22);
        };

        drawTank(1, Theme.p1, 'P1');
        drawTank(2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.accent;
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Wind: ${this.wind > 0 ? '→' : '←'} ${Math.abs(this.wind).toFixed(0)}`, 20, 56);
        ctx.textAlign = 'center';
        const turnLabel = this.state === 'flying' ? 'INCOMING...' :
            (this.turn === 1 ? 'P1 AIM — W/S angle, hold SPACE power' :
                (GameManager.isSinglePlayer ? 'CPU AIMING...' : 'P2 AIM — ↑/↓ angle, hold ENTER power'));
        ctx.fillText(turnLabel, this.width / 2, 56);

        if (this.hitFlash > 0) {
            ctx.fillStyle = 'rgba(255,230,0,0.45)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 36px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new ArtilleryArc());
