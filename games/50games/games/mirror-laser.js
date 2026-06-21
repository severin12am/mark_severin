class MirrorLaser extends GameBase {
    constructor() {
        super("Mirror Laser", "Rotate mirrors, fire the beam! Hit the rival reactor first to 3.");
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
        this.gridSize = 11;
        this.cell = Math.min(46, (this.width - 80) / this.gridSize);
        this.ox = (this.width - this.gridSize * this.cell) / 2;
        this.oy = 78;

        this.mirrors = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        const layout = [
            '...........',
            '.1...2...1.',
            '..2.1.2.1..',
            '.1.......1.',
            '...1.2.1...',
            '..2.....2..',
            '...1.2.1...',
            '.1.......1.',
            '..1.2.1.2..',
            '.2...1...2.',
            '...........'
        ];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const ch = layout[y][x];
                if (ch === '1') this.mirrors[y][x] = 1;
                else if (ch === '2') this.mirrors[y][x] = 2;
            }
        }

        this.mirrorCells = [];
        for (let y = 1; y < this.gridSize - 1; y++) {
            for (let x = 1; x < this.gridSize - 1; x++) {
                if (this.mirrors[y][x]) this.mirrorCells.push({ x, y });
            }
        }

        this.p1Cursor = 0;
        this.p2Cursor = Math.max(0, this.mirrorCells.length - 1);
        this.beamPath = null;
        this.beamTimer = 0;
        this.roundPause = 0;
        this.roundMsg = '';
    }

    cursorCell(player) {
        const idx = player === 1 ? this.p1Cursor : this.p2Cursor;
        return this.mirrorCells[idx] || this.mirrorCells[0];
    }

    moveCursor(player, dir) {
        const len = this.mirrorCells.length;
        if (player === 1) {
            this.p1Cursor = (this.p1Cursor + dir + len) % len;
        } else {
            this.p2Cursor = (this.p2Cursor + dir + len) % len;
        }
        AudioManager.move();
    }

    rotateAt(player) {
        const c = this.cursorCell(player);
        if (!c) return;
        this.mirrors[c.y][c.x] = this.mirrors[c.y][c.x] === 1 ? 2 : 1;
        AudioManager.tick();
    }

    traceBeam(fromX, fromY, dir) {
        const path = [{ x: fromX, y: fromY }];
        let x = fromX;
        let y = fromY;
        let d = dir;
        const maxSteps = this.gridSize * 3;

        for (let step = 0; step < maxSteps; step++) {
            if (d === 0) x++;
            else if (d === 1) y++;
            else if (d === 2) x--;
            else y--;

            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) break;

            path.push({ x, y });

            const m = this.mirrors[y][x];
            if (m === 1) {
                if (d === 0) d = 3;
                else if (d === 1) d = 2;
                else if (d === 2) d = 1;
                else d = 0;
            } else if (m === 2) {
                if (d === 0) d = 1;
                else if (d === 1) d = 0;
                else if (d === 2) d = 3;
                else d = 2;
            }
        }

        return path;
    }

    fire(player) {
        if (this.beamPath) return;
        const startY = Math.floor(this.gridSize / 2);
        const path = player === 1
            ? this.traceBeam(0, startY, 0)
            : this.traceBeam(this.gridSize - 1, startY, 2);

        this.beamPath = path;
        this.beamTimer = 0.55;
        this.beamOwner = player;
        AudioManager.select();

        const last = path[path.length - 1];
        if (last.x >= this.gridSize - 1 && player === 1) {
            this.scoreP1++;
            this.roundMsg = 'P1 HIT!';
            AudioManager.correct();
        } else if (last.x <= 0 && player === 2) {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU HIT!' : 'P2 HIT!';
            AudioManager.correct();
        } else {
            this.roundMsg = player === 1 ? 'P1 MISS' : (GameManager.isSinglePlayer ? 'CPU MISS' : 'P2 MISS');
            AudioManager.wrong();
        }

        if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
            this.roundPause = 1.2;
        } else {
            this.roundPause = 0.9;
        }
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.beamPath) {
                this.beamTimer -= dt;
                if (this.beamTimer <= 0) this.beamPath = null;
            }
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        if (this.beamPath) {
            this.beamTimer -= dt;
            if (this.beamTimer <= 0) this.beamPath = null;
            return;
        }

        if (this.justPressed('KeyA')) this.moveCursor(1, -1);
        if (this.justPressed('KeyD')) this.moveCursor(1, 1);
        if (this.justPressed('KeyW')) this.rotateAt(1);
        if (this.justPressed('Space')) this.fire(1);

        if (GameManager.isSinglePlayer) {
            this.cpuTimer = (this.cpuTimer || 0) - dt;
            if (this.cpuTimer <= 0) {
                const action = Math.random();
                if (action < 0.35) this.moveCursor(2, Math.random() < 0.5 ? 1 : -1);
                else if (action < 0.65) this.rotateAt(2);
                else this.fire(2);
                this.cpuTimer = 0.35 + Math.random() * 0.45;
            }
        } else {
            if (this.justPressed('ArrowLeft')) this.moveCursor(2, -1);
            if (this.justPressed('ArrowRight')) this.moveCursor(2, 1);
            if (this.justPressed('ArrowUp')) this.rotateAt(2);
            if (this.justPressed('Enter')) this.fire(2);
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        const cell = this.cell;
        const ox = this.ox;
        const oy = this.oy;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Reactor hits: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 36);

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const px = ox + x * cell;
                const py = oy + y * cell;
                ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.15)';
                ctx.fillRect(px, py, cell - 1, cell - 1);
            }
        }

        const midY = Math.floor(this.gridSize / 2);
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(ox - 8, oy + midY * cell + 4, 6, cell - 8);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillRect(ox + this.gridSize * cell + 2, oy + midY * cell + 4, 6, cell - 8);

        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(ox + (this.gridSize - 1) * cell + cell / 2, oy + midY * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ox + cell / 2, oy + midY * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
        ctx.fill();

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const m = this.mirrors[y][x];
                if (!m) continue;
                const px = ox + x * cell;
                const py = oy + y * cell;
                ctx.strokeStyle = Theme.accent;
                ctx.lineWidth = 4;
                ctx.beginPath();
                if (m === 1) {
                    ctx.moveTo(px + cell * 0.15, py + cell * 0.85);
                    ctx.lineTo(px + cell * 0.85, py + cell * 0.15);
                } else {
                    ctx.moveTo(px + cell * 0.15, py + cell * 0.15);
                    ctx.lineTo(px + cell * 0.85, py + cell * 0.85);
                }
                ctx.stroke();
            }
        }

        const drawCursor = (player, color) => {
            const c = this.cursorCell(player);
            if (!c) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(ox + c.x * cell + 3, oy + c.y * cell + 3, cell - 6, cell - 6);
        };
        drawCursor(1, Theme.p1);
        drawCursor(2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);

        if (this.beamPath) {
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 3;
            ctx.shadowColor = Theme.accent;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            this.beamPath.forEach((p, i) => {
                const cx = ox + p.x * cell + cell / 2;
                const cy = oy + p.y * cell + cell / 2;
                if (i === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '14px Arial';
        ctx.fillText('P1: A/D select mirror, W rotate, SPACE fire  |  P2: ←/→ select, ↑ rotate, ENTER fire', this.width / 2, this.height - 16);

        if (this.roundPause > 0 && this.roundMsg) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new MirrorLaser());
