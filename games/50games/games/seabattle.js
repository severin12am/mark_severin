class SeaBattle extends GameBase {
    constructor() {
        super("Sea Battle", "Sail and fire broadside cannons! First to 5 hits.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: 120, y: this.height / 2, cd: 0, flash: 0, hp: 3 };
        this.p2 = { x: this.width - 120, y: this.height / 2, cd: 0, flash: 0, hp: 3 };
        this.shots = [];
        this.wavePhase = 0;
    }

    fire(player) {
        const ship = player === 1 ? this.p1 : this.p2;
        if (ship.cd > 0) return;
        const dir = player === 1 ? 1 : -1;
        const spread = (Math.random() - 0.5) * 0.08;
        this.shots.push({
            x: ship.x + dir * 28,
            y: ship.y + (Math.random() - 0.5) * 16,
            vx: dir * (340 + Math.random() * 40),
            vy: spread * 200,
            owner: player,
            life: 1.8
        });
        ship.cd = 0.55;
        ship.flash = 0.15;
        AudioManager.select();
    }

    hitShip(target, owner) {
        target.hp--;
        target.flash = 0.35;
        AudioManager.correct();
        if (owner === 1) this.scoreP1++;
        else this.scoreP2++;
        if (this.scoreP1 >= 5) GameManager.gameOver(1);
        else if (this.scoreP2 >= 5) GameManager.gameOver(2);
    }

    update(dt) {
        const speed = 180 * dt;
        this.wavePhase += dt * 2;

        if (this.p1.cd > 0) this.p1.cd -= dt;
        if (this.p2.cd > 0) this.p2.cd -= dt;
        if (this.p1.flash > 0) this.p1.flash -= dt;
        if (this.p2.flash > 0) this.p2.flash -= dt;

        if (Input.isDown('KeyW')) this.p1.y = Math.max(80, this.p1.y - speed);
        if (Input.isDown('KeyS')) this.p1.y = Math.min(this.height - 80, this.p1.y + speed);
        if (Input.isDown('Space') && this.p1.cd <= 0) this.fire(1);

        if (GameManager.isSinglePlayer) {
            const dy = this.p1.y - this.p2.y;
            if (Math.abs(dy) > 12) this.p2.y += Math.sign(dy) * speed * 0.78;
            else this.p2.y += (Math.random() - 0.5) * speed * 0.3;
            this.p2.y = Math.max(80, Math.min(this.height - 80, this.p2.y));
            this.cpuTimer = (this.cpuTimer || 0) - dt;
            if (this.cpuTimer <= 0 && this.p2.cd <= 0 && Math.abs(this.p1.y - this.p2.y) < 55) {
                this.fire(2);
                this.cpuTimer = 0.4 + Math.random() * 0.35;
            }
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y = Math.max(80, this.p2.y - speed);
            if (Input.isDown('ArrowDown')) this.p2.y = Math.min(this.height - 80, this.p2.y + speed);
            if (Input.isDown('Enter') && this.p2.cd <= 0) this.fire(2);
        }

        for (let i = this.shots.length - 1; i >= 0; i--) {
            const s = this.shots[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= dt;
            if (s.life <= 0 || s.x < -20 || s.x > this.width + 20) {
                this.shots.splice(i, 1);
                continue;
            }

            const target = s.owner === 1 ? this.p2 : this.p1;
            if (Math.abs(s.x - target.x) < 36 && Math.abs(s.y - target.y) < 28) {
                this.hitShip(target, s.owner);
                this.shots.splice(i, 1);
            }
        }
    }

    drawShip(ctx, ship, facing, color, label) {
        const bob = Math.sin(this.wavePhase + ship.y * 0.02) * 3;
        const y = ship.y + bob;
        const x = ship.x;

        ctx.save();
        ctx.translate(x, y);
        if (facing < 0) ctx.scale(-1, 1);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-22, -18);
        ctx.lineTo(26, 0);
        ctx.lineTo(-22, 18);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = Theme.accent;
        ctx.fillRect(8, -4, 10, 8);

        if (ship.flash > 0) {
            ctx.fillStyle = `rgba(255,230,0,${ship.flash * 2})`;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} HP:${ship.hp}`, x, y + 34);
    }

    render(ctx) {
        ctx.fillStyle = '#0d1a28';
        ctx.fillRect(0, 0, this.width, this.height);

        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = `rgba(0,229,155,${0.04 + i * 0.01})`;
            const wy = 80 + i * 70 + Math.sin(this.wavePhase + i) * 8;
            ctx.fillRect(0, wy, this.width, 8);
        }

        this.shots.forEach(s => {
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = Theme.fg;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        this.drawShip(ctx, this.p1, 1, Theme.p1, 'P1');
        this.drawShip(ctx, this.p2, -1, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hits: ${this.scoreP1} — ${this.scoreP2}  (first to 5)`, this.width / 2, 36);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Line up vertically, then fire a broadside!', this.width / 2, 58);
        ctx.fillStyle = Theme.fg;
        ctx.fillText('P1: W/S sail, SPACE fire  |  P2: ↑/↓ sail, ENTER fire', this.width / 2, this.height - 14);

        if (this.p1.cd > 0) {
            ctx.fillStyle = Theme.p1;
            ctx.fillText(`P1 reload ${this.p1.cd.toFixed(1)}s`, 120, this.height - 40);
        }
        if (this.p2.cd > 0) {
            ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
            ctx.fillText(`${GameManager.isSinglePlayer ? 'CPU' : 'P2'} reload ${this.p2.cd.toFixed(1)}s`, this.width - 120, this.height - 40);
        }
    }
}

GameManager.registerGame(new SeaBattle());
