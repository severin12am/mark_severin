class MazeRunner extends GameBase {
    constructor() {
        super("Maze Runner", "Race to grab the golden key! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.mazeSize = 13;
        this.roundMsg = '';
        this.msgTimer = 0;
        this.startRound();
    }

    startRound() {
        this.cell = Math.min(this.width, this.height - 60) / this.mazeSize;
        this.offX = (this.width - this.mazeSize * this.cell) / 2;
        this.offY = 50 + (this.height - 60 - this.mazeSize * this.cell) / 2;
        this.map = Array(this.mazeSize).fill().map(() => Array(this.mazeSize).fill(1));
        this.carve(1, 1);
        this.p1 = { x: 1.5, y: 1.5 };
        this.p2 = { x: this.mazeSize - 2.5, y: this.mazeSize - 2.5 };
        this.key = { x: Math.floor(this.mazeSize / 2), y: Math.floor(this.mazeSize / 2) };
        this.map[this.key.y][this.key.x] = 0;
        this.map[1][1] = this.map[this.mazeSize - 2][this.mazeSize - 2] = 0;
        this.cd1 = 0;
        this.cd2 = 0;
        this.moveDelay = 0.1;
    }

    carve(x, y) {
        this.map[y][x] = 0;
        const dirs = [[0, -2], [0, 2], [2, 0], [-2, 0]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx > 0 && ny > 0 && nx < this.mazeSize - 1 && ny < this.mazeSize - 1 && this.map[ny][nx] === 1) {
                this.map[y + dy / 2][x + dx / 2] = 0;
                this.carve(nx, ny);
            }
        }
    }

    canWalk(gx, gy) {
        return gx >= 0 && gy >= 0 && gx < this.mazeSize && gy < this.mazeSize && this.map[gy][gx] === 0;
    }

    bfs(from, to) {
        const q = [{ x: Math.floor(from.x), y: Math.floor(from.y), path: [] }];
        const seen = new Set([`${Math.floor(from.x)},${Math.floor(from.y)}`]);
        while (q.length) {
            const cur = q.shift();
            if (cur.x === to.x && cur.y === to.y) return cur.path;
            for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                const nx = cur.x + dx, ny = cur.y + dy;
                const k = `${nx},${ny}`;
                if (seen.has(k) || !this.canWalk(nx, ny)) continue;
                seen.add(k);
                q.push({ x: nx, y: ny, path: cur.path.concat([[dx, dy]]) });
            }
        }
        return [];
    }

    tryMove(p, up, down, left, right, cdKey, dt) {
        if (this[cdKey] > 0) {
            this[cdKey] -= dt;
            return;
        }
        let dx = 0, dy = 0;
        if (Input.isDown(up)) dy = -1;
        else if (Input.isDown(down)) dy = 1;
        else if (Input.isDown(left)) dx = -1;
        else if (Input.isDown(right)) dx = 1;
        if (!dx && !dy) return;
        const nx = Math.round(p.x) + dx;
        const ny = Math.round(p.y) + dy;
        if (this.canWalk(nx, ny)) {
            p.x = nx + 0.5;
            p.y = ny + 0.5;
            this[cdKey] = this.moveDelay;
            AudioManager.move();
        }
    }

    cpuStep(dt) {
        if (this.cd2 > 0) { this.cd2 -= dt; return; }
        const path = this.bfs(this.p2, this.key);
        if (!path.length) return;
        const [dx, dy] = path[0];
        const nx = Math.round(this.p2.x) + dx;
        const ny = Math.round(this.p2.y) + dy;
        if (this.canWalk(nx, ny)) {
            this.p2.x = nx + 0.5;
            this.p2.y = ny + 0.5;
            this.cd2 = this.moveDelay;
        }
    }

    checkKey(p, idx) {
        if (Math.round(p.x) === this.key.x && Math.round(p.y) === this.key.y) {
            if (idx === 0) {
                this.scoreP1++;
                this.roundMsg = 'P1 GRABS KEY!';
                AudioManager.correct();
            } else {
                this.scoreP2++;
                this.roundMsg = GameManager.isSinglePlayer ? 'CPU GRABS KEY!' : 'P2 GRABS KEY!';
                AudioManager.wrong();
            }
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else {
                this.msgTimer = 1.1;
                this.startRound();
            }
        }
    }

    update(dt) {
        if (this.msgTimer > 0) {
            this.msgTimer -= dt;
            return;
        }

        this.tryMove(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'cd1', dt);
        if (GameManager.isSinglePlayer) this.cpuStep(dt);
        else this.tryMove(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'cd2', dt);

        this.checkKey(this.p1, 0);
        if (this.msgTimer > 0) return;
        this.checkKey(this.p2, 1);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Keys: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 28);

        for (let y = 0; y < this.mazeSize; y++) {
            for (let x = 0; x < this.mazeSize; x++) {
                const px = this.offX + x * this.cell;
                const py = this.offY + y * this.cell;
                if (this.map[y][x] === 1) {
                    ctx.fillStyle = Theme.fg;
                    ctx.fillRect(px, py, this.cell, this.cell);
                } else {
                    ctx.fillStyle = '#1a1a28';
                    ctx.fillRect(px + 1, py + 1, this.cell - 2, this.cell - 2);
                }
            }
        }

        const kx = this.offX + this.key.x * this.cell + this.cell / 2;
        const ky = this.offY + this.key.y * this.cell + this.cell / 2;
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(kx, ky, this.cell * 0.28, 0, Math.PI * 2);
        ctx.fill();

        const drawP = (p, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(this.offX + p.x * this.cell, this.offY + p.y * this.cell, this.cell * 0.32, 0, Math.PI * 2);
            ctx.fill();
        };
        drawP(this.p1, Theme.p1);
        drawP(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);

        if (this.roundMsg) {
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 22px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height - 24);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD navigate maze · grab the key first!', this.width / 2, this.height - 6);
    }
}

GameManager.registerGame(new MazeRunner());
