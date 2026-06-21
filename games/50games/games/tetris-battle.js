class TetrisBattle extends GameBase {
    constructor() {
        super("Tetris Battle", "Clear lines — send garbage! First to top out loses the round. First to 2 rounds.");
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
        this.cols = 10;
        this.rows = 18;
        this.cellSize = 14;
        this.p1Board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.p2Board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.p1Pending = 0;
        this.p2Pending = 0;
        this.p1Piece = this.newPiece();
        this.p2Piece = this.newPiece();
        this.p1X = 3;
        this.p1Y = 0;
        this.p2X = 3;
        this.p2Y = 0;
        this.p1Drop = 0;
        this.p2Drop = 0;
        this.dropInterval = 0.55;
        this.active = true;
        this.resultTimer = 0;
        this.roundMsg = '';
        this.state = 'playing';
    }

    newPiece() {
        const shapes = [
            [[1, 1, 1, 1]],
            [[1, 1], [1, 1]],
            [[0, 1, 0], [1, 1, 1]],
            [[0, 1, 1], [1, 1, 0]],
            [[1, 1, 0], [0, 1, 1]],
            [[1, 0, 0], [1, 1, 1]],
            [[0, 0, 1], [1, 1, 1]]
        ];
        const idx = Math.floor(Math.random() * shapes.length);
        return { shape: shapes[idx], color: idx + 1 };
    }

    boardFor(p) { return p === 1 ? this.p1Board : this.p2Board; }
    pieceFor(p) { return p === 1 ? this.p1Piece : this.p2Piece; }
    xFor(p) { return p === 1 ? this.p1X : this.p2X; }
    yFor(p) { return p === 1 ? this.p1Y : this.p2Y; }
    setXY(p, x, y) {
        if (p === 1) { this.p1X = x; this.p1Y = y; }
        else { this.p2X = x; this.p2Y = y; }
    }

    validMove(board, x, y, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const bx = x + c;
                const by = y + r;
                if (bx < 0 || bx >= this.cols || by >= this.rows) return false;
                if (by >= 0 && board[by][bx] !== 0) return false;
            }
        }
        return true;
    }

    rotateShape(shape) {
        const h = shape.length;
        const w = shape[0].length;
        const rotated = Array(w).fill().map(() => Array(h).fill(0));
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                rotated[c][h - 1 - r] = shape[r][c];
            }
        }
        return rotated;
    }

    movePiece(p, dx, dy) {
        const board = this.boardFor(p);
        const piece = this.pieceFor(p);
        const x = this.xFor(p);
        const y = this.yFor(p);
        if (this.validMove(board, x + dx, y + dy, piece.shape)) {
            this.setXY(p, x + dx, y + dy);
            if (dx !== 0) AudioManager.move();
        }
    }

    rotatePiece(p) {
        const board = this.boardFor(p);
        const piece = this.pieceFor(p);
        const x = this.xFor(p);
        const y = this.yFor(p);
        const rotated = this.rotateShape(piece.shape);
        if (this.validMove(board, x, y, rotated)) {
            piece.shape = rotated;
            AudioManager.tick();
        }
    }

    softDrop(p) {
        if (this.tryDrop(p)) AudioManager.move();
        else this.lockPiece(p);
    }

    hardDrop(p) {
        while (this.tryDrop(p)) {}
        this.lockPiece(p);
    }

    tryDrop(p) {
        const board = this.boardFor(p);
        const piece = this.pieceFor(p);
        const x = this.xFor(p);
        const y = this.yFor(p);
        if (this.validMove(board, x, y + 1, piece.shape)) {
            this.setXY(p, x, y + 1);
            return true;
        }
        return false;
    }

    garbageForLines(n) {
        if (n >= 4) return 4;
        if (n === 3) return 2;
        if (n === 2) return 1;
        return 0;
    }

    addGarbage(board, amount) {
        for (let i = 0; i < amount; i++) {
            const hole = Math.floor(Math.random() * this.cols);
            board.shift();
            const row = Array(this.cols).fill(8);
            row[hole] = 0;
            board.push(row);
        }
    }

    clearLines(board) {
        let cleared = 0;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== 0)) {
                board.splice(r, 1);
                board.unshift(Array(this.cols).fill(0));
                cleared++;
                r++;
            }
        }
        return cleared;
    }

    lockPiece(p) {
        const board = this.boardFor(p);
        const piece = this.pieceFor(p);
        const x = this.xFor(p);
        const y = this.yFor(p);

        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] && y + r >= 0) {
                    board[y + r][x + c] = piece.color;
                }
            }
        }

        const cleared = this.clearLines(board);
        const garbage = this.garbageForLines(cleared);
        if (cleared > 0) AudioManager.correct();
        else AudioManager.tick();

        if (p === 1) {
            this.p2Pending += garbage;
            if (this.p2Pending > 0) {
                this.addGarbage(this.p2Board, this.p2Pending);
                this.p2Pending = 0;
            }
            this.p1Piece = this.newPiece();
            this.p1X = 3;
            this.p1Y = 0;
            if (!this.validMove(this.p1Board, this.p1X, this.p1Y, this.p1Piece.shape)) {
                this.endRound(2);
                return;
            }
        } else {
            this.p1Pending += garbage;
            if (this.p1Pending > 0) {
                this.addGarbage(this.p1Board, this.p1Pending);
                this.p1Pending = 0;
            }
            this.p2Piece = this.newPiece();
            this.p2X = 3;
            this.p2Y = 0;
            if (!this.validMove(this.p2Board, this.p2X, this.p2Y, this.p2Piece.shape)) {
                this.endRound(1);
                return;
            }
        }
    }

    endRound(winner) {
        this.active = false;
        if (winner === 1) {
            this.scoreP1++;
            this.roundMsg = 'P1 TOP OUT WIN!';
        } else {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU TOP OUT WIN!' : 'P2 TOP OUT WIN!';
        }
        AudioManager.correct();
        this.resultTimer = 0;
        this.state = 'result';
    }

    handleInput(p) {
        const left = p === 1 ? this.justPressed('KeyA') : this.justPressed('ArrowLeft');
        const right = p === 1 ? this.justPressed('KeyD') : this.justPressed('ArrowRight');
        const down = p === 1 ? this.justPressed('KeyS') : this.justPressed('ArrowDown');
        const rotate = p === 1 ? this.justPressed('KeyW') : this.justPressed('ArrowUp');
        const drop = p === 1 ? this.justPressed('Space') : this.justPressed('Enter');

        if (left) this.movePiece(p, -1, 0);
        if (right) this.movePiece(p, 1, 0);
        if (down) this.softDrop(p);
        if (rotate) this.rotatePiece(p);
        if (drop) this.hardDrop(p);
    }

    cpuThink() {
        const target = 3 + Math.floor(Math.random() * 4);
        if (this.p2X < target) this.movePiece(2, 1, 0);
        else if (this.p2X > target) this.movePiece(2, -1, 0);
        if (Math.random() < 0.25) this.rotatePiece(2);
        if (Math.random() < 0.35) this.softDrop(2);
    }

    update(dt) {
        if (this.state === 'result') {
            this.resultTimer += dt;
            if (this.resultTimer > 1.6) {
                if (this.scoreP1 >= 2 || this.scoreP2 >= 2) {
                    GameManager.gameOver(this.scoreP1 >= 2 ? 1 : 2);
                } else {
                    this.startRound();
                    this.state = 'playing';
                }
            }
            return;
        }

        if (!this.active) return;

        this.p1Drop += dt;
        this.p2Drop += dt;
        if (this.p1Drop >= this.dropInterval) {
            this.p1Drop = 0;
            if (!this.tryDrop(1)) this.lockPiece(1);
        }
        if (this.p2Drop >= this.dropInterval) {
            this.p2Drop = 0;
            if (!this.tryDrop(2)) this.lockPiece(2);
        }

        this.handleInput(1);
        if (GameManager.isSinglePlayer) {
            this.cpuTimer = (this.cpuTimer || 0) - dt;
            if (this.cpuTimer <= 0) {
                this.cpuThink();
                this.cpuTimer = 0.12;
            }
        } else {
            this.handleInput(2);
        }
    }

    drawBoard(ctx, board, ox, oy, player) {
        const cell = this.cellSize;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ox - 4, oy - 4, this.cols * cell + 8, this.rows * cell + 8);
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox - 4, oy - 4, this.cols * cell + 8, this.rows * cell + 8);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const val = board[r][c];
                if (!val) continue;
                ctx.fillStyle = val === 8 ? Theme.accent : (player === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2));
                ctx.fillRect(ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2);
            }
        }
    }

    drawActivePiece(ctx, piece, px, py, ox, oy, color) {
        const cell = this.cellSize;
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    ctx.fillStyle = color;
                    ctx.fillRect(ox + (px + c) * cell + 1, oy + (py + r) * cell + 1, cell - 2, cell - 2);
                }
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        const p1ox = 50;
        const p2ox = this.width - 50 - this.cols * this.cellSize;
        const oy = 90;

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Round wins: ${this.scoreP1} — ${this.scoreP2}  (first to 2)`, this.width / 2, 36);
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Double=1 line, Triple=2, Tetris=4 garbage  |  Top out = lose round', this.width / 2, 58);

        ctx.fillStyle = Theme.p1;
        ctx.font = 'bold 14px Arial';
        ctx.fillText('P1', p1ox + this.cols * this.cellSize / 2, 78);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillText(GameManager.isSinglePlayer ? 'CPU' : 'P2', p2ox + this.cols * this.cellSize / 2, 78);

        this.drawBoard(ctx, this.p1Board, p1ox, oy, 1);
        this.drawBoard(ctx, this.p2Board, p2ox, oy, 2);
        if (this.active) {
            this.drawActivePiece(ctx, this.p1Piece, this.p1X, this.p1Y, p1ox, oy, Theme.p1);
            this.drawActivePiece(ctx, this.p2Piece, this.p2X, this.p2Y, p2ox, oy, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('P1: WASD move/rotate, S soft drop, SPACE hard drop', this.width / 2, this.height - 28);
        ctx.fillText('P2: Arrows + ENTER hard drop', this.width / 2, this.height - 12);

        if (this.state === 'result') {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 32px Impact';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new TetrisBattle());
