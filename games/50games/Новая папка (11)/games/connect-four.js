class ConnectFour extends GameBase {
    constructor() {
        super("Connect Four", "First to connect 4 in a row wins.");
    }

    init(w, h) {
        super.init(w, h);
        this.resetGame();
    }

    resetGame() {
        this.cols = 7;
        this.rows = 6;
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.currentPlayer = 1; // 1 or 2
        this.gameOver = false;
        this.dropAnim = null; // {col, rowTarget, yCurrent, player}
    }

    update(dt) {
        if (this.gameOver || this.dropAnim) return;

        let colClicked = -1;

        // ──────────────── Player 1 ────────────────
        if (this.currentPlayer === 1) {
            for (let c = 0; c < this.cols; c++) {
                if (Input.isJustPressed(`Digit${c+1}`) || (c === 0 && Input.isJustPressed('KeyA')) || (c === 6 && Input.isJustPressed('KeyD'))) {
                    colClicked = c;
                    break;
                }
            }
        }
        // ──────────────── Player 2 or CPU ────────────────
        else {
            if (GameManager.isSinglePlayer) {
                // Very basic greedy CPU — prefers center, then random valid
                let bestCol = 3;
                if (this.isValidMove(3)) colClicked = 3;
                else {
                    colClicked = Math.floor(Math.random() * this.cols);
                    let attempts = 0;
                    while (!this.isValidMove(colClicked) && attempts < 20) {
                        colClicked = Math.floor(Math.random() * this.cols);
                        attempts++;
                    }
                }
            } else {
                for (let c = 0; c < this.cols; c++) {
                    if (Input.isJustPressed(`Digit${c+1}`) || (c === 0 && Input.isJustPressed('ArrowLeft')) || (c === 6 && Input.isJustPressed('ArrowRight'))) {
                        colClicked = c;
                        break;
                    }
                }
            }
        }

        if (colClicked >= 0 && this.isValidMove(colClicked)) {
            const row = this.getDropRow(colClicked);
            this.dropAnim = {
                col: colClicked,
                rowTarget: row,
                yCurrent: -1,
                player: this.currentPlayer,
                speed: 0.18
            };
        }

        // Animate drop
        if (this.dropAnim) {
            this.dropAnim.yCurrent += this.dropAnim.speed * dt / 16;
            if (this.dropAnim.yCurrent >= this.dropAnim.rowTarget) {
                this.board[this.dropAnim.rowTarget][this.dropAnim.col] = this.dropAnim.player;
                if (this.checkWin(this.dropAnim.rowTarget, this.dropAnim.col, this.dropAnim.player)) {
                    this.gameOver = true;
                    GameManager.gameOver(this.dropAnim.player);
                } else if (this.isBoardFull()) {
                    this.gameOver = true;
                    GameManager.gameOver(0);
                } else {
                    this.currentPlayer = 3 - this.currentPlayer; // switch 1↔2
                }
                this.dropAnim = null;
            }
        }
    }

    isValidMove(col) {
        return this.board[0][col] === 0;
    }

    getDropRow(col) {
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r][col] === 0) return r;
        }
        return -1;
    }

    checkWin(r, c, p) {
        const dirs = [[0,1], [1,0], [1,1], [1,-1]];
        for (let [dr, dc] of dirs) {
            let count = 1;
            // forward
            for (let i = 1; i < 4; i++) {
                let nr = r + dr * i, nc = c + dc * i;
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols || this.board[nr][nc] !== p) break;
                count++;
            }
            // backward
            for (let i = 1; i < 4; i++) {
                let nr = r - dr * i, nc = c - dc * i;
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols || this.board[nr][nc] !== p) break;
                count++;
            }
            if (count >= 4) return true;
        }
        return false;
    }

    isBoardFull() {
        return this.board[0].every(cell => cell !== 0);
    }

    render(ctx) {
        const cellSize = Math.min(this.width / (this.cols + 1), (this.height * 0.75) / this.rows);
        const offsetX = (this.width - this.cols * cellSize) / 2;
        const offsetY = 80;

        // Board background
        ctx.fillStyle = "#2a1f4a";
        ctx.fillRect(offsetX - 10, offsetY - 10, this.cols * cellSize + 20, this.rows * cellSize + 20);

        // Slots
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = offsetX + c * cellSize + cellSize / 2;
                const y = offsetY + r * cellSize + cellSize / 2;

                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.38, 0, Math.PI * 2);
                ctx.fillStyle = Theme.bg;
                ctx.fill();
                ctx.strokeStyle = Theme.fg;
                ctx.lineWidth = 3;
                ctx.stroke();

                const val = this.board[r][c];
                if (val === 1) {
                    ctx.fillStyle = Theme.p1;
                    ctx.beginPath();
                    ctx.arc(x, y, cellSize * 0.34, 0, Math.PI * 2);
                    ctx.fill();
                } else if (val === 2) {
                    ctx.fillStyle = Theme.p2;
                    ctx.beginPath();
                    ctx.arc(x, y, cellSize * 0.34, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Dropping piece preview / animation
        if (this.dropAnim) {
            const x = offsetX + this.dropAnim.col * cellSize + cellSize / 2;
            const y = offsetY + this.dropAnim.yCurrent * cellSize + cellSize / 2;
            ctx.fillStyle = this.dropAnim.player === 1 ? Theme.p1 : Theme.p2;
            ctx.beginPath();
            ctx.arc(x, y, cellSize * 0.34, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Hover preview
            let hoverCol = -1;
            for (let c = 0; c < this.cols; c++) {
                if (Input.isDown(`Digit${c+1}`)) { hoverCol = c; break; }
            }
            if (hoverCol >= 0 && this.isValidMove(hoverCol)) {
                const x = offsetX + hoverCol * cellSize + cellSize / 2;
                const y = offsetY - cellSize / 2;
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = this.currentPlayer === 1 ? Theme.p1 : Theme.p2;
                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.34, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "22px monospace";
        ctx.textAlign = "center";
        ctx.fillText(this.gameOver ? "ROUND OVER" : `Player ${this.currentPlayer}'s turn`, this.width / 2, this.height - 30);
    }
}

GameManager.registerGame(new ConnectFour());