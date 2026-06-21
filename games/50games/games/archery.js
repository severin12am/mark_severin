class Archery extends GameBase {
    constructor() {
        super("Archery", "Charge and shoot the moving target! First to 5.");
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
        this.p1 = { y: this.height / 2, charge: 0, charging: false, cd: 0 };
        this.p2 = { y: this.height / 2, charge: 0, charging: false, cd: 0 };
        this.target = { y: this.height / 2, dir: 1, speed: 90 + (this.scoreP1 + this.scoreP2) * 8 };
        this.arrows = [];
        this.hitFlash = 0;
        this.hitText = '';
    }

    scoreForHit(dist) {
        if (dist < 18) return 3;
        if (dist < 40) return 2;
        if (dist < 65) return 1;
        return 0;
    }

    fire(side) {
        const archer = side === 1 ? this.p1 : this.p2;
        const power = 8 + archer.charge * 0.9;
        this.arrows.push({
            x: side === 1 ? 70 : this.width - 70,
            y: archer.y,
            vx: side === 1 ? power : -power,
            owner: side,
            trail: []
        });
        archer.charge = 0;
        archer.charging = false;
        archer.cd = 0.45;
        AudioManager.select();
    }

    update(dt) {
        if (this.p1.cd > 0) this.p1.cd -= dt;
        if (this.p2.cd > 0) this.p2.cd -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        this.target.y += this.target.dir * this.target.speed * dt;
        if (this.target.y < 100 || this.target.y > this.height - 100) this.target.dir *= -1;

        const move = 200 * dt;
        if (Input.isDown('KeyW')) this.p1.y = Math.max(80, this.p1.y - move);
        if (Input.isDown('KeyS')) this.p1.y = Math.min(this.height - 80, this.p1.y + move);
        if (this.p1.cd <= 0) {
            if (Input.isDown('Space')) {
                this.p1.charging = true;
                this.p1.charge = Math.min(30, this.p1.charge + 22 * dt);
            } else if (this.p1.charging) {
                this.fire(1);
            }
        }

        if (GameManager.isSinglePlayer) {
            const dy = this.target.y - this.p2.y;
            if (Math.abs(dy) > 8) this.p2.y += Math.sign(dy) * move * 0.82;
            this.cpuTimer = (this.cpuTimer || 0) - dt;
            if (this.p2.cd <= 0 && this.cpuTimer <= 0 && Math.abs(dy) < 35) {
                this.p2.charge = 14 + Math.random() * 10;
                this.fire(2);
                this.cpuTimer = 0.5 + Math.random() * 0.4;
            }
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y = Math.max(80, this.p2.y - move);
            if (Input.isDown('ArrowDown')) this.p2.y = Math.min(this.height - 80, this.p2.y + move);
            if (this.p2.cd <= 0) {
                if (Input.isDown('Enter')) {
                    this.p2.charging = true;
                    this.p2.charge = Math.min(30, this.p2.charge + 22 * dt);
                } else if (this.p2.charging) {
                    this.fire(2);
                }
            }
        }

        const tx = this.width / 2;
        const ty = this.target.y;
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const a = this.arrows[i];
            a.trail.push({ x: a.x, y: a.y });
            if (a.trail.length > 6) a.trail.shift();
            a.x += a.vx;
            if (a.x < 0 || a.x > this.width) {
                this.arrows.splice(i, 1);
                continue;
            }
            if (Math.abs(a.x - tx) < 12) {
                const pts = this.scoreForHit(Math.abs(a.y - ty));
                if (pts > 0) {
                    if (a.owner === 1) this.scoreP1 += pts;
                    else this.scoreP2 += pts;
                    this.hitFlash = 0.35;
                    this.hitText = pts === 3 ? 'BULLSEYE!' : `+${pts}`;
                    AudioManager.correct();
                    if (this.scoreP1 >= 5) GameManager.gameOver(1);
                    if (this.scoreP2 >= 5) GameManager.gameOver(2);
                }
                this.arrows.splice(i, 1);
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Points: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 32);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Bullseye 3 · Inner 2 · Outer 1', this.width / 2, 54);

        const tx = this.width / 2;
        const ty = this.target.y;
        [70, 48, 28].forEach((r, i) => {
            ctx.strokeStyle = i === 0 ? Theme.accent : Theme.fg;
            ctx.lineWidth = i === 0 ? 3 : 2;
            ctx.beginPath();
            ctx.arc(tx, ty, r, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(tx, ty, 8, 0, Math.PI * 2);
        ctx.fill();

        const drawArcher = (a, x, color, label, flip) => {
            ctx.fillStyle = color;
            ctx.fillRect(x - 8, a.y - 24, 16, 48);
            if (a.charging || a.charge > 0) {
                ctx.fillStyle = Theme.accent;
                const w = a.charge * 3;
                ctx.fillRect(flip ? x - 10 - w : x + 10, a.y - 3, w, 6);
            }
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, a.y + 38);
        };

        drawArcher(this.p1, 70, Theme.p1, 'P1', false);
        drawArcher(this.p2, this.width - 70, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            GameManager.isSinglePlayer ? 'CPU' : 'P2', true);

        this.arrows.forEach(a => {
            a.trail.forEach((t, i) => {
                ctx.globalAlpha = (i + 1) / a.trail.length * 0.4;
                ctx.fillStyle = a.owner === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
                ctx.fillRect(t.x - 2, t.y - 1, 8, 3);
            });
            ctx.globalAlpha = 1;
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(a.x - 10, a.y - 2, 20, 4);
        });

        if (this.hitFlash > 0) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 28px Impact';
            ctx.fillText(this.hitText, tx, ty - 80);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('W/S aim · hold SPACE/ENTER to charge & release', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new Archery());
