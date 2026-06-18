class MinefieldSprint extends GameBase {
    constructor() {
        super("Minefield Sprint", "First to cross the minefield wins — mines stun 2s.");
    }

    init(w, h) {
        super.init(w, h);
        this.finishY = 80;
        this.startY = this.height - 80;

        this.gridCols = 9;
        this.gridRows = 12;
        this.cellSize = Math.min(this.width / (this.gridCols + 2), (this.startY - this.finishY) / this.gridRows);

        this.mines = new Set();
        for (let i = 0; i < 18; i++) {
            let col = Math.floor(Math.random() * this.gridCols);
            let row = 1 + Math.floor(Math.random() * (this.gridRows - 2));
            this.mines.add(`${col},${row}`);
        }

        this.resetPlayers();
    }

    resetPlayers() {
        this.p1 = { col: 4, row: this.gridRows - 1, stunUntil: 0 };
        this.p2 = { col: 4, row: this.gridRows - 1, stunUntil: 0 };
        this.p1Finished = false;
        this.p2Finished = false;
    }

    update(dt) {
        const now = performance.now();

        // ──────────────── Player 1 ────────────────
        if (this.p1.stunUntil < now && !this.p1Finished) {
            let moved = false;
            if (Input.isJustPressed('KeyW') && this.p1.row > 0) { this.p1.row--; moved = true; }
            if (Input.isJustPressed('KeyS') && this.p1.row < this.gridRows - 1) { this.p1.row++; moved = true; }
            if (Input.isJustPressed('KeyA') && this.p1.col > 0) { this.p1.col--; moved = true; }
            if (Input.isJustPressed('KeyD') && this.p1.col < this.gridCols - 1) { this.p1.col++; moved = true; }

            if (moved && this.mines.has(`${this.p1.col},${this.p1.row}`)) {
                this.p1.stunUntil = now + 2000;
            }

            if (this.p1.row === 0) this.p1Finished = true;
        }

        // ──────────────── Player 2 or CPU ────────────────
        if (this.p2.stunUntil < now && !this.p2Finished) {
            let moved = false;

            if (GameManager.isSinglePlayer) {
                // Greedy CPU — tries to go up, small chance to sidestep
                if (Math.random() < 0.88 && this.p2.row > 0) {
                    this.p2.row--;
                    moved = true;
                } else if (Math.random() < 0.5 && this.p2.col > 0) {
                    this.p2.col--;
                    moved = true;
                } else if (this.p2.col < this.gridCols - 1) {
                    this.p2.col++;
                    moved = true;
                }
            } else {
                if (Input.isJustPressed('ArrowUp')    && this.p2.row > 0)    { this.p2.row--; moved = true; }
                if (Input.isJustPressed('ArrowDown')  && this.p2.row < this.gridRows - 1) { this.p2.row++; moved = true; }
                if (Input.isJustPressed('ArrowLeft')  && this.p2.col > 0)    { this.p2.col--; moved = true; }
                if (Input.isJustPressed('ArrowRight') && this.p2.col < this.gridCols - 1) { this.p2.col++; moved = true; }
            }

            if (moved && this.mines.has(`${this.p2.col},${this.p2.row}`)) {
                this.p2.stunUntil = now + 2000;
            }

            if (this.p2.row === 0) this.p2Finished = true;
        }

        if (this.p1Finished && this.p2Finished) {
            GameManager.gameOver(0);
        } else if (this.p1Finished) {
            GameManager.gameOver(1);
        } else if (this.p2Finished) {
            GameManager.gameOver(2);
        }
    }

    render(ctx) {
        const offsetX = (this.width - this.gridCols * this.cellSize) / 2;
        const offsetY = this.finishY;

        // Finish line
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, offsetY - 10, this.width, 20);

        // Grid + mines
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 1.5;
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const x = offsetX + c * this.cellSize;
                const y = offsetY + r * this.cellSize;
                ctx.strokeRect(x, y, this.cellSize, this.cellSize);

                if (this.mines.has(`${c},${r}`)) {
                    ctx.fillStyle = "#ff0044";
                    ctx.beginPath();
                    ctx.arc(x + this.cellSize/2, y + this.cellSize/2, this.cellSize * 0.32, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }

        // Players
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(offsetX + this.p1.col * this.cellSize + 6,
                     offsetY + this.p1.row * this.cellSize + 6,
                     this.cellSize - 12, this.cellSize - 12);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(offsetX + this.p2.col * this.cellSize + 6,
                     offsetY + this.p2.row * this.cellSize + 6,
                     this.cellSize - 12, this.cellSize - 12);

        // Stun indicators
        if (this.p1.stunUntil > performance.now()) {
            ctx.fillStyle = "rgba(255,40,80,0.6)";
            ctx.fillRect(offsetX + this.p1.col * this.cellSize,
                         offsetY + this.p1.row * this.cellSize,
                         this.cellSize, this.cellSize);
        }
        if (this.p2.stunUntil > performance.now()) {
            ctx.fillStyle = "rgba(0,229,155,0.6)";
            ctx.fillRect(offsetX + this.p2.col * this.cellSize,
                         offsetY + this.p2.row * this.cellSize,
                         this.cellSize, this.cellSize);
        }
    }
}

GameManager.registerGame(new MinefieldSprint());