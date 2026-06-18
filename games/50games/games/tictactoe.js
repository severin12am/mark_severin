class TicTacToe extends GameBase {
    constructor() {
        super("Action Tic Tac Toe", "Move & place marks fast! Best of 3 rounds.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.p1 = { x: 0, y: 0, cd: 0 };
        this.p2 = { x: 2, y: 2, cd: 0 };
        this.cellSize = 110;
        this.offsetX = this.width / 2 - 165;
        this.offsetY = this.height / 2 - 140;
        this.winLine = null;
        this.roundOver = false;
        this.roundTimer = 0;
        this.cpuThinkTimer = 0;
    }

    checkWin() {
        const b = this.board;
        const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (const w of wins) {
            if (b[w[0]] && b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]]) {
                return { player: b[w[0]], line: w };
            }
        }
        if (!b.includes(0)) return { player: 0, line: null };
        return null;
    }

    getEmptyCells() {
        const empty = [];
        for (let i = 0; i < 9; i++) if (this.board[i] === 0) empty.push(i);
        return empty;
    }

    cpuPickCell() {
        const empty = this.getEmptyCells();
        if (empty.length === 0) return -1;

        const wins = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        const findMove = (player) => {
            for (const line of wins) {
                const vals = line.map(i => this.board[i]);
                const pCount = vals.filter(v => v === player).length;
                const eCount = vals.filter(v => v === 0).length;
                if (pCount === 2 && eCount === 1) {
                    return line[vals.indexOf(0)];
                }
            }
            return -1;
        };

        // Win if possible
        let move = findMove(2);
        if (move !== -1) return move;

        // Block P1 win
        move = findMove(1);
        if (move !== -1) return move;

        // Take center
        if (this.board[4] === 0) return 4;

        // Take corners
        const corners = [0, 2, 6, 8].filter(i => this.board[i] === 0);
        if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

        return empty[Math.floor(Math.random() * empty.length)];
    }

    finishRound(result) {
        this.roundOver = true;
        this.roundTimer = 0;
        if (result && result.player === 1) {
            this.scoreP1++;
            this.winLine = result.line;
            AudioManager.correct();
        } else if (result && result.player === 2) {
            this.scoreP2++;
            this.winLine = result.line;
            AudioManager.correct();
        } else {
            AudioManager.wrong();
        }
    }

    update(dt) {
        if (this.roundOver) {
            this.roundTimer += dt;
            if (this.roundTimer > 1.5) {
                if (this.scoreP1 >= 2) {
                    GameManager.gameOver(1);
                } else if (this.scoreP2 >= 2) {
                    GameManager.gameOver(2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        const moveDelay = 8;

        if (this.p1.cd > 0) this.p1.cd--;
        if (this.p2.cd > 0) this.p2.cd--;

        const handleInput = (p, w, s, a, d, action, id) => {
            if (p.cd > 0) return;
            if (Input.isDown(w) && p.y > 0) { p.y--; p.cd = moveDelay; AudioManager.move(); }
            else if (Input.isDown(s) && p.y < 2) { p.y++; p.cd = moveDelay; AudioManager.move(); }
            else if (Input.isDown(a) && p.x > 0) { p.x--; p.cd = moveDelay; AudioManager.move(); }
            else if (Input.isDown(d) && p.x < 2) { p.x++; p.cd = moveDelay; AudioManager.move(); }
            else if (Input.isDown(action)) {
                const idx = p.y * 3 + p.x;
                if (this.board[idx] === 0) {
                    this.board[idx] = id;
                    p.cd = 22;
                    AudioManager.select();
                }
            }
        };

        handleInput(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 1);

        if (GameManager.isSinglePlayer) {
            this.cpuThinkTimer -= dt;
            if (this.p2.cd <= 0 && this.cpuThinkTimer <= 0) {
                const pick = this.cpuPickCell();
                if (pick !== -1) {
                    this.p2.x = pick % 3;
                    this.p2.y = Math.floor(pick / 3);
                    this.board[pick] = 2;
                    this.p2.cd = 35;
                    this.cpuThinkTimer = 0.3 + Math.random() * 0.4;
                    AudioManager.select();
                }
            }
        } else {
            handleInput(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 2);
        }

        const result = this.checkWin();
        if (result) this.finishRound(result);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Round score
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`First to 2 wins  |  P1: ${this.scoreP1}  —  ${this.scoreP2} ${GameManager.isSinglePlayer ? 'CPU' : 'P2'}`, this.width / 2, 50);

        // Board background
        ctx.fillStyle = '#252430';
        ctx.fillRect(this.offsetX - 10, this.offsetY - 10, 330, 330);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 6;
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX + i * this.cellSize, this.offsetY);
            ctx.lineTo(this.offsetX + i * this.cellSize, this.offsetY + 330);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.offsetX, this.offsetY + i * this.cellSize);
            ctx.lineTo(this.offsetX + 330, this.offsetY + i * this.cellSize);
            ctx.stroke();
        }

        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const v = this.board[y * 3 + x];
                const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
                const py = this.offsetY + y * this.cellSize + this.cellSize / 2;

                if (v === 1) {
                    ctx.strokeStyle = Theme.p1;
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(px - 28, py - 28);
                    ctx.lineTo(px + 28, py + 28);
                    ctx.moveTo(px + 28, py - 28);
                    ctx.lineTo(px - 28, py + 28);
                    ctx.stroke();
                }
                if (v === 2) {
                    ctx.strokeStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.arc(px, py, 32, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }

        // Win line highlight
        if (this.winLine) {
            const cells = this.winLine.map(i => ({
                x: this.offsetX + (i % 3) * this.cellSize + this.cellSize / 2,
                y: this.offsetY + Math.floor(i / 3) * this.cellSize + this.cellSize / 2
            }));
            ctx.strokeStyle = Theme.accent;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(cells[0].x, cells[0].y);
            ctx.lineTo(cells[2].x, cells[2].y);
            ctx.stroke();
        }

        if (!this.roundOver) {
            ctx.strokeStyle = Theme.p1;
            ctx.lineWidth = 4;
            ctx.strokeRect(
                this.offsetX + this.p1.x * this.cellSize + 6,
                this.offsetY + this.p1.y * this.cellSize + 6,
                this.cellSize - 12, this.cellSize - 12
            );

            ctx.strokeStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
            ctx.lineWidth = 3;
            ctx.strokeRect(
                this.offsetX + this.p2.x * this.cellSize + 12,
                this.offsetY + this.p2.y * this.cellSize + 12,
                this.cellSize - 24, this.cellSize - 24
            );
        }

        if (this.roundOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 36px Impact";
            const msg = this.winLine
                ? (this.board[this.winLine[0]] === 1 ? "P1 WINS ROUND!" : (GameManager.isSinglePlayer ? "CPU WINS ROUND!" : "P2 WINS ROUND!"))
                : "DRAW!";
            ctx.fillText(msg, this.width / 2, this.height - 60);
        }

        ctx.fillStyle = '#888';
        ctx.font = "14px Arial";
        ctx.fillText("P1: WASD + SPACE  |  P2: Arrows + ENTER", this.width / 2, this.height - 20);
    }
}

GameManager.registerGame(new TicTacToe());
