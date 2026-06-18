class ConnectFour extends GameBase {
    constructor() {
        super("Connect Four", "Drop 4 in a row! First to 2 round wins.");
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
        this.cols = 7;
        this.rows = 6;
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.dropAnim = null;
        this.hoverCol = 3;
        this.cpuDelay = 0;
        this.winCells = null;
        this.resultTimer = 0;
        this.state = 'playing';
    }

    isValidMove(col) {
        return col >= 0 && col < this.cols && this.board[0][col] === 0;
    }

    getDropRow(col) {
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r][col] === 0) return r;
        }
        return -1;
    }

    wouldWin(col, player) {
        const row = this.getDropRow(col);
        if (row < 0) return false;
        this.board[row][col] = player;
        const win = this.checkWin(row, col, player);
        this.board[row][col] = 0;
        return win;
    }

    cpuPickCol() {
        // Win if possible
        for (let c = 0; c < this.cols; c++) {
            if (this.isValidMove(c) && this.wouldWin(c, 2)) return c;
        }
        // Block P1 win
        for (let c = 0; c < this.cols; c++) {
            if (this.isValidMove(c) && this.wouldWin(c, 1)) return c;
        }
        // Prefer center columns
        const order = [3, 2, 4, 1, 5, 0, 6];
        for (const c of order) {
            if (this.isValidMove(c)) return c;
        }
        return -1;
    }

    checkWin(r, c, p) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of dirs) {
            const cells = [[r, c]];
            for (let i = 1; i < 4; i++) {
                const nr = r + dr * i, nc = c + dc * i;
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols || this.board[nr][nc] !== p) break;
                cells.push([nr, nc]);
            }
            for (let i = 1; i < 4; i++) {
                const nr = r - dr * i, nc = c - dc * i;
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols || this.board[nr][nc] !== p) break;
                cells.push([nr, nc]);
            }
            if (cells.length >= 4) {
                this.winCells = cells.slice(0, 4);
                return true;
            }
        }
        return false;
    }

    isBoardFull() {
        return this.board[0].every(cell => cell !== 0);
    }

    dropPiece(col) {
        const row = this.getDropRow(col);
        if (row < 0) return;
        this.dropAnim = {
            col, rowTarget: row,
            yCurrent: -0.5,
            player: this.currentPlayer,
            speed: 0.35
        };
        AudioManager.move();
    }

    finishDrop() {
        const { rowTarget, col, player } = this.dropAnim;
        this.board[rowTarget][col] = player;

        if (this.checkWin(rowTarget, col, player)) {
            this.gameOver = true;
            if (player === 1) this.scoreP1++;
            else this.scoreP2++;
            AudioManager.correct();
            this.resultTimer = 0;
            this.state = 'result';
        } else if (this.isBoardFull()) {
            this.gameOver = true;
            AudioManager.wrong();
            this.resultTimer = 0;
            this.state = 'result';
            this.roundWinner = 0;
        } else {
            this.currentPlayer = 3 - this.currentPlayer;
            this.cpuDelay = 0.4;
        }
        this.dropAnim = null;
    }

    update(dt) {
        if (this.state === 'result') {
            this.resultTimer += dt;
            if (this.resultTimer > 1.8) {
                if (this.scoreP1 >= 2 || this.scoreP2 >= 2) {
                    GameManager.gameOver(this.scoreP1 >= 2 ? 1 : 2);
                } else {
                    this.startRound();
                    this.state = 'playing';
                }
            }
            return;
        }

        if (this.dropAnim) {
            this.dropAnim.yCurrent += this.dropAnim.speed * dt * 60;
            if (this.dropAnim.yCurrent >= this.dropAnim.rowTarget) {
                this.finishDrop();
            }
            return;
        }

        if (this.gameOver) return;

        // Column selection
        if (this.currentPlayer === 1) {
            if (this.justPressed('KeyA') || this.justPressed('ArrowLeft')) {
                this.hoverCol = Math.max(0, this.hoverCol - 1);
            }
            if (this.justPressed('KeyD') || this.justPressed('ArrowRight')) {
                this.hoverCol = Math.min(this.cols - 1, this.hoverCol + 1);
            }
            if (this.justPressed('Space') || this.justPressed('Enter')) {
                if (this.isValidMove(this.hoverCol)) this.dropPiece(this.hoverCol);
            }
        } else if (GameManager.isSinglePlayer) {
            this.cpuDelay -= dt;
            if (this.cpuDelay <= 0) {
                const pick = this.cpuPickCol();
                if (pick >= 0) {
                    this.hoverCol = pick;
                    this.dropPiece(pick);
                }
            }
        } else {
            if (this.justPressed('ArrowLeft')) this.hoverCol = Math.max(0, this.hoverCol - 1);
            if (this.justPressed('ArrowRight')) this.hoverCol = Math.min(this.cols - 1, this.hoverCol + 1);
            if (this.justPressed('Enter')) {
                if (this.isValidMove(this.hoverCol)) this.dropPiece(this.hoverCol);
            }
        }
    }

    render(ctx) {
        const cellSize = Math.min(72, (this.height * 0.72) / this.rows);
        const offsetX = (this.width - this.cols * cellSize) / 2;
        const offsetY = 90;

        ctx.fillStyle = '#1a2838';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#1565c0';
        ctx.fillRect(offsetX - 14, offsetY - 14, this.cols * cellSize + 28, this.rows * cellSize + 28);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeRect(offsetX - 14, offsetY - 14, this.cols * cellSize + 28, this.rows * cellSize + 28);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = offsetX + c * cellSize + cellSize / 2;
                const y = offsetY + r * cellSize + cellSize / 2;
                const isWin = this.winCells && this.winCells.some(([wr, wc]) => wr === r && wc === c);

                ctx.beginPath();
                ctx.arc(x, y, cellSize * 0.38, 0, Math.PI * 2);
                ctx.fillStyle = '#0d2137';
                ctx.fill();

                const val = this.board[r][c];
                if (val === 1) ctx.fillStyle = isWin ? '#ff6688' : Theme.p1;
                else if (val === 2) ctx.fillStyle = isWin ? '#66ffcc' : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
                else ctx.fillStyle = null;

                if (val) {
                    ctx.beginPath();
                    ctx.arc(x, y, cellSize * 0.34, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        if (this.dropAnim) {
            const x = offsetX + this.dropAnim.col * cellSize + cellSize / 2;
            const y = offsetY + this.dropAnim.yCurrent * cellSize + cellSize / 2;
            ctx.fillStyle = this.dropAnim.player === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
            ctx.beginPath();
            ctx.arc(x, y, cellSize * 0.34, 0, Math.PI * 2);
            ctx.fill();
        } else if (!this.gameOver) {
            const x = offsetX + this.hoverCol * cellSize + cellSize / 2;
            const y = offsetY - cellSize * 0.45;
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = this.currentPlayer === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
            ctx.beginPath();
            ctx.arc(x, y, cellSize * 0.34, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Rounds: ${this.scoreP1} — ${this.scoreP2}  (first to 2)`, this.width / 2, 40);

        if (this.state === 'result') {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 32px Impact";
            if (this.winCells) {
                const w = this.board[this.winCells[0][0]][this.winCells[0][1]];
                ctx.fillText(w === 1 ? 'P1 WINS ROUND!' : (GameManager.isSinglePlayer ? 'CPU WINS ROUND!' : 'P2 WINS ROUND!'), this.width / 2, this.height - 30);
            } else {
                ctx.fillText('DRAW!', this.width / 2, this.height - 30);
            }
        } else if (!this.gameOver) {
            const turn = this.currentPlayer === 1 ? 'P1' : (GameManager.isSinglePlayer ? 'CPU' : 'P2');
            ctx.font = "16px Arial";
            ctx.fillText(`${turn}'s turn — ←/→ select, SPACE/ENTER drop`, this.width / 2, this.height - 30);
        }
    }
}

GameManager.registerGame(new ConnectFour());
