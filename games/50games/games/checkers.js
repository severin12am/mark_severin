class ActionCheckers extends GameBase {
    constructor() {
        super("Action Checkers", "Jump to capture — first to 4 captures wins!");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.cols = 6;
        this.rows = 6;
        this.cellSize = Math.min(w, h - 80) / 7;
        this.offsetX = (w - this.cols * this.cellSize) / 2;
        this.offsetY = 50 + (h - 80 - this.rows * this.cellSize) / 2;
        this.setupBoard();
        this.turn = 1;
        this.cursor = { x: 2, y: 5 };
        this.selected = null;
        this.inputDelay = 0;
        this.cpuDelay = 0.4;
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    setupBoard() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < this.cols; x++) {
                if ((x + y) % 2 !== 0) this.board[y][x] = 2;
            }
        }
        for (let y = 4; y < 6; y++) {
            for (let x = 0; x < this.cols; x++) {
                if ((x + y) % 2 !== 0) this.board[y][x] = 1;
            }
        }
    }

    moveCursor(dx, dy) {
        this.cursor.x = Math.max(0, Math.min(this.cols - 1, this.cursor.x + dx));
        this.cursor.y = Math.max(0, Math.min(this.rows - 1, this.cursor.y + dy));
        this.inputDelay = 0.12;
        AudioManager.tick();
    }

    applyMove(sx, sy, tx, ty, capture) {
        this.board[ty][tx] = this.turn;
        this.board[sy][sx] = 0;
        if (capture) {
            this.board[capture.y][capture.x] = 0;
            if (this.turn === 1) this.scoreP1++;
            else this.scoreP2++;
            AudioManager.correct();
        } else {
            AudioManager.move();
        }
        this.turn = this.turn === 1 ? 2 : 1;
        this.selected = null;
        this.inputDelay = 0.25;

        if (this.scoreP1 >= 4) GameManager.gameOver(1);
        if (this.scoreP2 >= 4) GameManager.gameOver(2);
    }

    tryAction() {
        if (this.selected) {
            const sx = this.selected.x, sy = this.selected.y;
            const tx = this.cursor.x, ty = this.cursor.y;
            const dx = tx - sx, dy = ty - sy;
            const dir = this.turn === 1 ? -1 : 1;

            if (Math.abs(dx) === 1 && dy === dir && this.board[ty][tx] === 0) {
                this.applyMove(sx, sy, tx, ty, null);
            } else if (Math.abs(dx) === 2 && dy === dir * 2 && this.board[ty][tx] === 0) {
                const mx = sx + dx / 2, my = sy + dy / 2;
                if (this.board[my][mx] !== 0 && this.board[my][mx] !== this.turn) {
                    this.applyMove(sx, sy, tx, ty, { x: mx, y: my });
                }
            }
            this.selected = null;
        } else if (this.board[this.cursor.y][this.cursor.x] === this.turn) {
            this.selected = { x: this.cursor.x, y: this.cursor.y };
            AudioManager.select();
            this.inputDelay = 0.2;
        }
    }

    getMoves(player) {
        const moves = [];
        const dir = player === 1 ? -1 : 1;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x] !== player) continue;
                if (y + dir >= 0 && y + dir < this.rows) {
                    if (x - 1 >= 0 && this.board[y + dir][x - 1] === 0)
                        moves.push({ sx: x, sy: y, tx: x - 1, ty: y + dir, jump: false });
                    if (x + 1 < this.cols && this.board[y + dir][x + 1] === 0)
                        moves.push({ sx: x, sy: y, tx: x + 1, ty: y + dir, jump: false });
                }
                if (y + dir * 2 >= 0 && y + dir * 2 < this.rows) {
                    if (x - 2 >= 0 && this.board[y + dir][x - 1] === (player === 1 ? 2 : 1) && this.board[y + dir * 2][x - 2] === 0)
                        moves.push({ sx: x, sy: y, tx: x - 2, ty: y + dir * 2, jump: true, mx: x - 1, my: y + dir });
                    if (x + 2 < this.cols && this.board[y + dir][x + 1] === (player === 1 ? 2 : 1) && this.board[y + dir * 2][x + 2] === 0)
                        moves.push({ sx: x, sy: y, tx: x + 2, ty: y + dir * 2, jump: true, mx: x + 1, my: y + dir });
                }
            }
        }
        return moves;
    }

    cpuMove() {
        const moves = this.getMoves(2);
        if (!moves.length) {
            this.turn = 1;
            return;
        }
        const jumps = moves.filter(m => m.jump);
        const pick = (jumps.length ? jumps : moves)[Math.floor(Math.random() * (jumps.length || moves.length))];
        this.board[pick.ty][pick.tx] = 2;
        this.board[pick.sy][pick.sx] = 0;
        if (pick.jump) {
            this.board[pick.my][pick.mx] = 0;
            this.scoreP2++;
            AudioManager.wrong();
        } else {
            AudioManager.move();
        }
        this.turn = 1;
        if (this.scoreP2 >= 4) GameManager.gameOver(2);
    }

    update(dt) {
        if (this.inputDelay > 0) this.inputDelay -= dt;

        if (this.turn === 1 && this.inputDelay <= 0) {
            if (Input.isDown('KeyW')) this.moveCursor(0, -1);
            else if (Input.isDown('KeyS')) this.moveCursor(0, 1);
            else if (Input.isDown('KeyA')) this.moveCursor(-1, 0);
            else if (Input.isDown('KeyD')) this.moveCursor(1, 0);
            else if (this.justPressed('Space')) this.tryAction();
        }

        if (this.turn === 2) {
            if (GameManager.isSinglePlayer) {
                this.cpuDelay -= dt;
                if (this.cpuDelay <= 0) {
                    this.cpuMove();
                    this.cpuDelay = 0.5;
                }
            } else if (this.inputDelay <= 0) {
                if (Input.isDown('ArrowUp')) this.moveCursor(0, -1);
                else if (Input.isDown('ArrowDown')) this.moveCursor(0, 1);
                else if (Input.isDown('ArrowLeft')) this.moveCursor(-1, 0);
                else if (Input.isDown('ArrowRight')) this.moveCursor(1, 0);
                else if (this.justPressed('Enter')) this.tryAction();
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Captures: ${this.scoreP1} — ${this.scoreP2}  (first to 4)`, this.width / 2, 28);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText(this.turn === 1 ? 'P1 turn' : (GameManager.isSinglePlayer ? 'CPU turn' : 'P2 turn'), this.width / 2, 44);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const px = this.offsetX + x * this.cellSize;
                const py = this.offsetY + y * this.cellSize;
                ctx.fillStyle = (x + y) % 2 === 0 ? '#d8d0c0' : '#4a4641';
                ctx.fillRect(px, py, this.cellSize, this.cellSize);

                const piece = this.board[y][x];
                if (piece > 0) {
                    ctx.fillStyle = piece === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
                    ctx.beginPath();
                    ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, this.cellSize * 0.32, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = Theme.fg;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                if (this.selected && this.selected.x === x && this.selected.y === y) {
                    ctx.strokeStyle = Theme.accent;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
                }
            }
        }

        const cx = this.offsetX + this.cursor.x * this.cellSize;
        const cy = this.offsetY + this.cursor.y * this.cellSize;
        ctx.strokeStyle = this.turn === 1 ? Theme.p1 : Theme.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(cx + 2, cy + 2, this.cellSize - 4, this.cellSize - 4);

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD cursor · SPACE select/move  |  Arrows · ENTER (2P)', this.width / 2, this.height - 8);
    }
}

GameManager.registerGame(new ActionCheckers());
