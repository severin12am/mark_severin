class MinefieldSprint extends GameBase {
    constructor() {
        super("Minefield Sprint", "Race through the minefield! First to 2 sprint wins.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.startSprint();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    startSprint() {
        this.finishY = 90;
        this.startY = this.height - 70;
        this.gridCols = 9;
        this.gridRows = 11;
        this.cellSize = Math.min(52, (this.startY - this.finishY - 20) / this.gridRows);
        this.offsetX = (this.width - this.gridCols * this.cellSize) / 2;
        this.offsetY = this.finishY + 10;

        this.mines = new Set();
        this.revealed = new Set();
        while (this.mines.size < 16) {
            const col = Math.floor(Math.random() * this.gridCols);
            const row = 1 + Math.floor(Math.random() * (this.gridRows - 2));
            this.mines.add(`${col},${row}`);
        }

        this.p1 = { col: 3, row: this.gridRows - 1, stunUntil: 0, moveCd: 0 };
        this.p2 = { col: 5, row: this.gridRows - 1, stunUntil: 0, moveCd: 0 };
        this.p1Finished = false;
        this.p2Finished = false;
        this.explosions = [];
        this.sprintDone = false;
        this.resultTimer = 0;
        this.sprintWinner = 0;
        this.cpuMoveTimer = 0;
    }

    tryMove(p, dCol, dRow) {
        if (p.moveCd > 0) return;
        const nc = p.col + dCol;
        const nr = p.row + dRow;
        if (nc < 0 || nc >= this.gridCols || nr < 0 || nr >= this.gridRows) return;

        p.col = nc;
        p.row = nr;
        p.moveCd = 8;
        AudioManager.move();

        const key = `${nc},${nr}`;
        if (this.mines.has(key)) {
            this.revealed.add(key);
            p.stunUntil = performance.now() + 1500;
            this.explosions.push({ col: nc, row: nr, timer: 0.4 });
            AudioManager.wrong();
        }
        if (p.row === 0) {
            if (p === this.p1) this.p1Finished = true;
            else this.p2Finished = true;
            AudioManager.correct();
        }
    }

    update(dt) {
        if (this.sprintDone) {
            this.resultTimer += dt;
            if (this.resultTimer > 1.5) {
                if (this.scoreP1 >= 2 || this.scoreP2 >= 2) {
                    GameManager.gameOver(this.scoreP1 >= 2 ? 1 : 2);
                } else {
                    this.startSprint();
                }
            }
            return;
        }

        const now = performance.now();
        if (this.p1.moveCd > 0) this.p1.moveCd--;
        if (this.p2.moveCd > 0) this.p2.moveCd--;

        this.explosions.forEach(e => e.timer -= dt);
        this.explosions = this.explosions.filter(e => e.timer > 0);

        if (this.p1.stunUntil < now && !this.p1Finished) {
            if (this.justPressed('KeyW')) this.tryMove(this.p1, 0, -1);
            else if (this.justPressed('KeyS')) this.tryMove(this.p1, 0, 1);
            else if (this.justPressed('KeyA')) this.tryMove(this.p1, -1, 0);
            else if (this.justPressed('KeyD')) this.tryMove(this.p1, 1, 0);
        }

        if (this.p2.stunUntil < now && !this.p2Finished) {
            if (GameManager.isSinglePlayer) {
                this.cpuMoveTimer -= dt;
                if (this.cpuMoveTimer <= 0) {
                    const moves = [[0, -1], [-1, 0], [1, 0], [0, 1]];
                    const up = moves[0];
                    const side = moves[1 + Math.floor(Math.random() * 2)];
                    const pick = Math.random() < 0.75 ? up : side;
                    this.tryMove(this.p2, pick[0], pick[1]);
                    this.cpuMoveTimer = 0.18 + Math.random() * 0.12;
                }
            } else {
                if (this.justPressed('ArrowUp')) this.tryMove(this.p2, 0, -1);
                else if (this.justPressed('ArrowDown')) this.tryMove(this.p2, 0, 1);
                else if (this.justPressed('ArrowLeft')) this.tryMove(this.p2, -1, 0);
                else if (this.justPressed('ArrowRight')) this.tryMove(this.p2, 1, 0);
            }
        }

        if (this.p1Finished || this.p2Finished) {
            this.sprintDone = true;
            this.resultTimer = 0;
            if (this.p1Finished && this.p2Finished) this.sprintWinner = 0;
            else if (this.p1Finished) { this.sprintWinner = 1; this.scoreP1++; }
            else { this.sprintWinner = 2; this.scoreP2++; }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#1a2830';
        ctx.fillRect(0, 0, this.width, this.height);

        // Finish banner
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.offsetX, this.offsetY - 14, this.gridCols * this.cellSize, 10);
        ctx.fillStyle = '#000';
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("FINISH", this.width / 2, this.offsetY - 18);

        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const x = this.offsetX + c * this.cellSize;
                const y = this.offsetY + r * this.cellSize;
                const key = `${c},${r}`;
                const isMine = this.mines.has(key);
                const isRevealed = this.revealed.has(key);

                ctx.fillStyle = (r + c) % 2 === 0 ? '#2a3d2a' : '#243524';
                ctx.fillRect(x, y, this.cellSize - 1, this.cellSize - 1);

                if (isRevealed && isMine) {
                    ctx.fillStyle = '#ff2244';
                    ctx.beginPath();
                    ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Explosion flashes
        this.explosions.forEach(e => {
            const x = this.offsetX + e.col * this.cellSize;
            const y = this.offsetY + e.row * this.cellSize;
            ctx.fillStyle = `rgba(255,200,0,${e.timer * 2})`;
            ctx.fillRect(x, y, this.cellSize, this.cellSize);
        });

        const drawPlayer = (p, color, label) => {
            const x = this.offsetX + p.col * this.cellSize + 4;
            const y = this.offsetY + p.row * this.cellSize + 4;
            const stunned = p.stunUntil > performance.now();
            ctx.fillStyle = stunned ? 'rgba(255,255,255,0.4)' : color;
            ctx.fillRect(x, y, this.cellSize - 8, this.cellSize - 8);
            if (stunned) {
                ctx.fillStyle = '#ff4444';
                ctx.font = "bold 10px Arial";
                ctx.textAlign = "center";
                ctx.fillText("STUN", x + this.cellSize / 2 - 4, y + this.cellSize / 2);
            }
        };

        drawPlayer(this.p1, Theme.p1, 'P1');
        drawPlayer(this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2, 'P2');

        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Sprints won: ${this.scoreP1} — ${this.scoreP2}  (first to 2)`, this.width / 2, 36);
        ctx.font = "14px Arial";
        ctx.fillText("Step on a mine = 1.5s stun. Mines only show after you hit them!", this.width / 2, 58);

        if (this.sprintDone) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 34px Impact";
            let msg = 'BOTH FINISHED — TIE!';
            if (this.sprintWinner === 1) msg = 'P1 CROSSED FIRST!';
            else if (this.sprintWinner === 2) msg = GameManager.isSinglePlayer ? 'CPU CROSSED FIRST!' : 'P2 CROSSED FIRST!';
            ctx.fillText(msg, this.width / 2, this.height / 2);
        }
    }
}

GameManager.registerGame(new MinefieldSprint());
