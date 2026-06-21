class SokobanCrush extends GameBase {
    constructor() {
        super("Sokoban Crush", "Push ice blocks onto your rival! First to 3 crushes.");
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
        this.grid = 11;
        this.cell = Math.min(44, (this.width - 120) / this.grid);
        this.ox = (this.width - this.grid * this.cell) / 2;
        this.oy = 88;

        this.tiles = Array(this.grid).fill().map(() => Array(this.grid).fill(0));
        const layout = [
            '###########',
            '#....#....#',
            '#..B.....B#',
            '#...###...#',
            '#....#....#',
            '#..B..#..B#',
            '#....#....#',
            '#...###...#',
            '#..B.....B#',
            '#....#....#',
            '###########'
        ];
        for (let y = 0; y < this.grid; y++) {
            for (let x = 0; x < this.grid; x++) {
                const ch = layout[y][x];
                if (ch === '#') this.tiles[y][x] = 1;
                else if (ch === 'B') this.tiles[y][x] = 2;
            }
        }

        this.p1 = { x: 2, y: 2 };
        this.p2 = { x: 8, y: 8 };
        this.pushFlash = 0;
        this.roundMsg = '';
        this.roundPause = 0;
    }

    tryMove(player, dx, dy) {
        const p = player === 1 ? this.p1 : this.p2;
        const opp = player === 1 ? this.p2 : this.p1;
        const nx = p.x + dx;
        const ny = p.y + dy;

        if (nx < 1 || nx >= this.grid - 1 || ny < 1 || ny >= this.grid - 1) return;
        if (this.tiles[ny][nx] === 1) return;

        if (this.tiles[ny][nx] === 2) {
            const bx = nx + dx;
            const by = ny + dy;
            if (bx < 1 || bx >= this.grid - 1 || by < 1 || by >= this.grid - 1) return;
            if (this.tiles[by][bx] !== 0) return;
            if (opp.x === bx && opp.y === by) {
                if (player === 1) {
                    this.scoreP1++;
                    this.roundMsg = 'P1 CRUSHED!';
                } else {
                    this.scoreP2++;
                    this.roundMsg = GameManager.isSinglePlayer ? 'CPU CRUSHED!' : 'P2 CRUSHED!';
                }
                AudioManager.correct();
                this.pushFlash = 0.5;
                this.roundPause = 1.2;
                return;
            }
            this.tiles[by][bx] = 2;
            this.tiles[ny][nx] = 0;
            this.pushFlash = 0.2;
            AudioManager.tick();
        }

        p.x = nx;
        p.y = ny;
        AudioManager.move();
    }

    cpuMove() {
        const dx = Math.sign(this.p1.x - this.p2.x);
        const dy = Math.sign(this.p1.y - this.p2.y);
        const moves = [];
        if (dx !== 0) moves.push([dx, 0]);
        if (dy !== 0) moves.push([0, dy]);
        moves.push([0, dx !== 0 ? 0 : (Math.random() < 0.5 ? -1 : 1)]);
        for (const [mx, my] of moves) {
            if (mx || my) {
                this.tryMove(2, mx, my);
                return;
            }
        }
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.pushFlash > 0) this.pushFlash -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        if (this.justPressed('KeyW')) this.tryMove(1, 0, -1);
        else if (this.justPressed('KeyS')) this.tryMove(1, 0, 1);
        else if (this.justPressed('KeyA')) this.tryMove(1, -1, 0);
        else if (this.justPressed('KeyD')) this.tryMove(1, 1, 0);

        if (GameManager.isSinglePlayer) {
            this.cpuTimer = (this.cpuTimer || 0) - dt;
            if (this.cpuTimer <= 0) {
                this.cpuMove();
                this.cpuTimer = 0.22 + Math.random() * 0.18;
            }
        } else {
            if (this.justPressed('ArrowUp')) this.tryMove(2, 0, -1);
            else if (this.justPressed('ArrowDown')) this.tryMove(2, 0, 1);
            else if (this.justPressed('ArrowLeft')) this.tryMove(2, -1, 0);
            else if (this.justPressed('ArrowRight')) this.tryMove(2, 1, 0);
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
        ctx.fillText(`Crushes: ${this.scoreP1} — ${this.scoreP2}  (first to 3)`, this.width / 2, 36);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('One step per key press — push a block onto your rival!', this.width / 2, 58);

        for (let y = 0; y < this.grid; y++) {
            for (let x = 0; x < this.grid; x++) {
                const px = ox + x * cell;
                const py = oy + y * cell;
                const t = this.tiles[y][x];
                if (t === 1) {
                    ctx.fillStyle = Theme.fg;
                    ctx.fillRect(px, py, cell, cell);
                } else {
                    ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
                    ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
                }
                if (t === 2) {
                    ctx.fillStyle = 'rgba(0,229,155,0.35)';
                    ctx.fillRect(px + 5, py + 5, cell - 10, cell - 10);
                    ctx.strokeStyle = Theme.accent;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(px + 5, py + 5, cell - 10, cell - 10);
                }
            }
        }

        const drawPlayer = (p, color, label) => {
            const px = ox + p.x * cell + 6;
            const py = oy + p.y * cell + 6;
            ctx.fillStyle = color;
            ctx.fillRect(px, py, cell - 12, cell - 12);
            ctx.fillStyle = Theme.fg;
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, px + (cell - 12) / 2, py + cell - 16);
        };

        drawPlayer(this.p1, Theme.p1, 'P1');
        drawPlayer(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, GameManager.isSinglePlayer ? 'CPU' : 'P2');

        if (this.pushFlash > 0) {
            ctx.fillStyle = `rgba(255,230,0,${this.pushFlash})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.roundPause > 0 && this.roundMsg) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 36px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '14px Arial';
        ctx.fillText('WASD / Arrow keys — one tile per press', this.width / 2, this.height - 14);
    }
}

GameManager.registerGame(new SokobanCrush());
