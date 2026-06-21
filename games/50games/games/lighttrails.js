class LightTrails extends GameBase {
    constructor() {
        super("Light Trails", "Tron-style — don't crash into trails! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.speed = 210;
        this.thickness = 7;
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    startRound() {
        this.p1 = { x: this.width * 0.25, y: this.height / 2, dir: 1, next: 1, path: [], alive: true };
        this.p2 = { x: this.width * 0.75, y: this.height / 2, dir: 3, next: 3, path: [], alive: true };
        this.p1.path.push({ x: this.p1.x, y: this.p1.y });
        this.p2.path.push({ x: this.p2.x, y: this.p2.y });
    }

    dirBlocked(p, dir) {
        const look = 36;
        let ax = p.x, ay = p.y;
        if (dir === 0) ay -= look;
        if (dir === 1) ax += look;
        if (dir === 2) ay += look;
        if (dir === 3) ax -= look;
        return this.isCollision(ax, ay);
    }

    cpuTurn() {
        const p = this.p2;
        const options = [0, 1, 2, 3].filter(d => Math.abs(d - p.dir) !== 2);
        for (const d of options) {
            if (!this.dirBlocked(p, d)) return d;
        }
        return (p.dir + 1) % 4;
    }

    turn(p, nd) {
        if (Math.abs(nd - p.dir) !== 2) p.next = nd;
    }

    movePlayer(p, dt) {
        if (!p.alive) return;
        if (p.next !== p.dir) {
            p.dir = p.next;
            p.path.push({ x: p.x, y: p.y });
        }
        const step = this.speed * dt;
        if (p.dir === 0) p.y -= step;
        if (p.dir === 1) p.x += step;
        if (p.dir === 2) p.y += step;
        if (p.dir === 3) p.x -= step;
        if (this.isCollision(p.x, p.y)) p.alive = false;
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        if (Input.isDown('KeyW')) this.turn(this.p1, 0);
        if (Input.isDown('KeyD')) this.turn(this.p1, 1);
        if (Input.isDown('KeyS')) this.turn(this.p1, 2);
        if (Input.isDown('KeyA')) this.turn(this.p1, 3);

        if (GameManager.isSinglePlayer) {
            this.p2.next = this.cpuTurn();
        } else {
            if (Input.isDown('ArrowUp')) this.turn(this.p2, 0);
            if (Input.isDown('ArrowRight')) this.turn(this.p2, 1);
            if (Input.isDown('ArrowDown')) this.turn(this.p2, 2);
            if (Input.isDown('ArrowLeft')) this.turn(this.p2, 3);
        }

        this.movePlayer(this.p1, dt);
        this.movePlayer(this.p2, dt);

        if (!this.p1.alive || !this.p2.alive) {
            if (this.p1.alive && !this.p2.alive) {
                this.scoreP1++;
                this.roundMsg = 'P1 SURVIVES!';
                AudioManager.correct();
            } else if (this.p2.alive && !this.p1.alive) {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 SURVIVES!';
                AudioManager.wrong();
            } else {
                this.roundMsg = 'DOUBLE CRASH — no point';
                AudioManager.tick();
            }

            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else {
                this.msgTimer = 1.1;
                this.startRound();
            }
        }
    }

    isCollision(x, y) {
        if (x < 8 || x > this.width - 8 || y < 60 || y > this.height - 8) return true;
        const paths = [this.p1.path, this.p2.path];
        for (const path of paths) {
            for (let i = 0; i < path.length - 1; i++) {
                const a = path[i], b = path[i + 1];
                const minX = Math.min(a.x, b.x) - this.thickness;
                const maxX = Math.max(a.x, b.x) + this.thickness;
                const minY = Math.min(a.y, b.y) - this.thickness;
                const maxY = Math.max(a.y, b.y) + this.thickness;
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
            }
        }
        return false;
    }

    drawPath(ctx, p, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = this.thickness;
        ctx.lineCap = 'square';
        ctx.beginPath();
        if (p.path.length) ctx.moveTo(p.path[0].x, p.path[0].y);
        for (let i = 1; i < p.path.length; i++) ctx.lineTo(p.path[i].x, p.path[i].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
    }

    render(ctx) {
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = Theme.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 60, this.width - 16, this.height - 68);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 32);

        this.drawPath(ctx, this.p1, Theme.p1);
        this.drawPath(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD turn · Arrows turn (2P)', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new LightTrails());
