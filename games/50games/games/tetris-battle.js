class TetrisBattle extends GameBase {
    constructor() {
        super("Tetris Battle", "Clear lines — send garbage to opponent. First to top out loses.");
    }

    init(w, h) {
        super.init(w, h);
        this.resetGame();
    }

    resetGame() {
        this.cols = 10;
        this.rows = 20;
        this.cellSize = 24;

        this.p1Board = Array(this.rows).fill().map(()=>Array(this.cols).fill(0));
        this.p2Board = Array(this.rows).fill().map(()=>Array(this.cols).fill(0));

        this.p1Garbage = 0;
        this.p2Garbage = 0;

        this.p1Piece = this.newPiece();
        this.p2Piece = this.newPiece();

        this.p1X = Math.floor(this.cols/2)-2; this.p1Y = 0;
        this.p2X = Math.floor(this.cols/2)-2; this.p2Y = 0;

        this.p1Next = this.newPiece();
        this.p2Next = this.newPiece();

        this.dropTimer = 0;
        this.dropInterval = 55; // frames

        this.gameActive = true;
    }

    newPiece() {
        const shapes = [
            [[1,1,1,1]],           // I
            [[1,1],[1,1]],         // O
            [[0,1,0],[1,1,1]],     // T
            [[0,1,1],[1,1,0]],     // S
            [[1,1,0],[0,1,1]],     // Z
            [[1,0,0],[1,1,1]],     // J
            [[0,0,1],[1,1,1]]      // L
        ];
        const idx = Math.floor(Math.random() * shapes.length);
        return { shape: shapes[idx], color: idx + 1 };
    }

    update(dt) {
        if (!this.gameActive) return;
        const delta = dt / 16;
        this.dropTimer += delta;

        if (this.dropTimer > this.dropInterval) {
            this.dropTimer = 0;
            this.tryDrop(1);
            this.tryDrop(2);
        }

        // Player 1 controls
        this.handleInput(1,
            Input.isJustPressed('KeyA'), Input.isJustPressed('KeyD'),
            Input.isJustPressed('KeyS'), Input.isJustPressed('Space'),
            Input.isJustPressed('KeyW')
        );

        // Player 2 or CPU
        if (GameManager.isSinglePlayer) {
            // Very basic AI: move toward center-ish, drop fast sometimes
            const targetX = Math.floor(this.cols/2) - 2 + Math.floor(Math.sin(Date.now()*0.001)*1.5);
            if (this.p2X < targetX && Math.random()<0.4) this.movePiece(2, 1, 0);
            if (this.p2X > targetX && Math.random()<0.4) this.movePiece(2, -1, 0);
            if (Math.random() < 0.08) this.rotatePiece(2);
            if (Math.random() < 0.15) this.dropPiece(2);
        } else {
            this.handleInput(2,
                Input.isJustPressed('ArrowLeft'), Input.isJustPressed('ArrowRight'),
                Input.isJustPressed('ArrowDown'), Input.isJustPressed('Enter'),
                Input.isJustPressed('ArrowUp')
            );
        }

        if (this.p1Y > this.rows - this.p1Piece.shape.length) this.gameOver(2);
        if (this.p2Y > this.rows - this.p2Piece.shape.length) this.gameOver(1);
    }

    handleInput(player, left, right, down, drop, rotate) {
        if (left)  this.movePiece(player, -1, 0);
        if (right) this.movePiece(player, 1, 0);
        if (down)  this.movePiece(player, 0, 1);
        if (rotate) this.rotatePiece(player);
        if (drop) this.dropPiece(player);
    }

    movePiece(p, dx, dy) {
        const board = p===1 ? this.p1Board : this.p2Board;
        const x = p===1 ? this.p1X : this.p2X;
        const y = p===1 ? this.p1Y : this.p2Y;
        const piece = p===1 ? this.p1Piece : this.p2Piece;

        if (this.validMove(board, x+dx, y+dy, piece.shape)) {
            if (p===1) this.p1X += dx; else this.p2X += dx;
            if (p===1) this.p1Y += dy; else this.p2Y += dy;
        }
    }

    rotatePiece(p) {
        const board = p===1 ? this.p1Board : this.p2Board;
        const x = p===1 ? this.p1X : this.p2X;
        const y = p===1 ? this.p1Y : this.p2Y;
        const piece = p===1 ? this.p1Piece : this.p2Piece;

        const rotated = this.rotateShape(piece.shape);
        if (this.validMove(board, x, y, rotated)) {
            piece.shape = rotated;
        }
    }

    dropPiece(p) {
        while (this.tryDrop(p)) {}
        this.landPiece(p);
    }

    tryDrop(p) {
        const board = p===1 ? this.p1Board : this.p2Board;
        const x = p===1 ? this.p1X : this.p2X;
        const y = p===1 ? this.p1Y : this.p2Y;
        const piece = p===1 ? this.p1Piece : this.p2Piece;

        if (this.validMove(board, x, y+1, piece.shape)) {
            if (p===1) this.p1Y++; else this.p2Y++;
            return true;
        }
        return false;
    }

    landPiece(p) {
        const board = p===1 ? this.p1Board : this.p2Board;
        const x = p===1 ? this.p1X : this.p2X;
        const y = p===1 ? this.p1Y : this.p2Y;
        const piece = p===1 ? this.p1Piece : this.p2Piece;

        for (let r=0; r<piece.shape.length; r++) {
            for (let c=0; c<piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    board[y+r][x+c] = piece.color;
                }
            }
        }

        const cleared = this.clearLines(board);
        if (cleared > 0) {
            const garbage = [0,0,1,2,4][Math.min(cleared,4)];
            if (p===1) this.p2Garbage += garbage;
            else this.p1Garbage += garbage;
        }

        if (p===1) {
            this.p1Piece = this.p1Next;
            this.p1Next = this.newPiece();
            this.p1X = Math.floor(this.cols/2)-2; this.p1Y = 0;
        } else {
            this.p2Piece = this.p2Next;
            this.p2Next = this.newPiece();
            this.p2X = Math.floor(this.cols/2)-2; this.p2Y = 0;
        }

        this.addGarbage(p===1 ? this.p1Board : this.p2Board, p===1 ? this.p1Garbage : this.p2Garbage);
        if (p===1) this.p1Garbage = 0; else this.p2Garbage = 0;
    }

    clearLines(board) {
        let cleared = 0;
        for (let r = this.rows-1; r >= 0; r--) {
            if (board[r].every(cell => cell !== 0)) {
                board.splice(r,1);
                board.unshift(Array(this.cols).fill(0));
                cleared++;
                r++; // re-check same row after shift
            }
        }
        return cleared;
    }

    addGarbage(board, amount) {
        for (let i=0; i<amount; i++) {
            const hole = Math.floor(Math.random() * this.cols);
            board.shift();
            const row = Array(this.cols).fill(8); // garbage color
            row[hole] = 0;
            board.push(row);
        }
    }

    validMove(board, x, y, shape) {
        for (let r=0; r<shape.length; r++) {
            for (let c=0; c<shape[r].length; c++) {
                if (shape[r][c]) {
                    const bx = x + c;
                    const by = y + r;
                    if (bx<0 || bx>=this.cols || by>=this.rows) return false;
                    if (by>=0 && board[by][bx] !== 0) return false;
                }
            }
        }
        return true;
    }

    rotateShape(shape) {
        const h = shape.length;
        const w = shape[0].length;
        const rotated = Array(w).fill().map(()=>Array(h).fill(0));
        for (let r=0; r<h; r++) {
            for (let c=0; c<w; c++) {
                rotated[c][h-1-r] = shape[r][c];
            }
        }
        return rotated;
    }

    gameOver(winner) {
        this.gameActive = false;
        GameManager.gameOver(winner);
    }

    render(ctx) {
        const cell = this.cellSize;
        const offset = 40;

        // Player 1 board (left)
        this.drawBoard(ctx, this.p1Board, offset, 80, 1);
        this.drawPiece(ctx, this.p1Piece.shape, this.p1X, this.p1Y, offset, 80, Theme.p1);

        // Player 2 board (right)
        this.drawBoard(ctx, this.p2Board, this.width - offset - this.cols*cell, 80, 2);
        this.drawPiece(ctx, this.p2Piece.shape, this.p2X, this.p2Y, this.width - offset - this.cols*cell, 80, Theme.p2);

        ctx.fillStyle = Theme.fg;
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`GARBAGE: ${this.p1Garbage}`, offset + this.cols*cell/2, 50);
        ctx.fillText(`GARBAGE: ${this.p2Garbage}`, this.width - offset - this.cols*cell/2, 50);
    }

    drawBoard(ctx, board, ox, oy, player) {
        const cell = this.cellSize;
        for (let r=0; r<this.rows; r++) {
            for (let c=0; c<this.cols; c++) {
                const x = ox + c*cell;
                const y = oy + r*cell;
                ctx.strokeStyle = Theme.fg;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cell, cell);

                const val = board[r][c];
                if (val) {
                    ctx.fillStyle = val === 8 ? Theme.accent : (player===1 ? Theme.p1 : Theme.p2);
                    ctx.fillRect(x+2, y+2, cell-4, cell-4);
                }
            }
        }
    }

    drawPiece(ctx, shape, px, py, ox, oy, color) {
        const cell = this.cellSize;
        for (let r=0; r<shape.length; r++) {
            for (let c=0; c<shape[r].length; c++) {
                if (shape[r][c]) {
                    ctx.fillStyle = color;
                    ctx.fillRect(ox + (px+c)*cell + 2, oy + (py+r)*cell + 2, cell-4, cell-4);
                }
            }
        }
    }
}

GameManager.registerGame(new TetrisBattle());