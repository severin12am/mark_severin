class ActionCheckers extends GameBase {
    constructor() {
        super("Action Checkers", "Capture 4 pieces to win! Space/Enter to select.");
    }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        
        // 6x6 board setup
        this.cols = 6; this.rows = 6;
        this.cellSize = Math.min(w, h) / 8;
        this.offsetX = (w - (this.cols * this.cellSize)) / 2;
        this.offsetY = (h - (this.rows * this.cellSize)) / 2;
        
        this.board = Array(this.rows).fill(0).map(() => Array(this.cols).fill(0));
        
        // Populate pieces (1=P1 bottom, 2=P2 top)
        for(let y=0; y<2; y++) {
            for(let x=0; x<this.cols; x++) {
                if((x+y)%2 !== 0) this.board[y][x] = 2;
            }
        }
        for(let y=4; y<6; y++) {
            for(let x=0; x<this.cols; x++) {
                if((x+y)%2 !== 0) this.board[y][x] = 1;
            }
        }

        this.turn = 1; // 1 or 2
        this.cursor = { x: 2, y: 5 };
        this.selected = null;
        this.inputDelay = 0;
        this.aiTimer = 1.0;
    }

    update(dt) {
        if (this.inputDelay > 0) this.inputDelay -= dt;

        let moveCursor = (dx, dy) => {
            this.cursor.x = Math.max(0, Math.min(this.cols - 1, this.cursor.x + dx));
            this.cursor.y = Math.max(0, Math.min(this.rows - 1, this.cursor.y + dy));
            this.inputDelay = 0.15;
        };

        let attemptAction = () => {
            if (this.selected) {
                // Try to move
                let sx = this.selected.x, sy = this.selected.y;
                let tx = this.cursor.x, ty = this.cursor.y;
                
                let dx = tx - sx; let dy = ty - sy;
                let dir = this.turn === 1 ? -1 : 1;

                if (Math.abs(dx) === 1 && dy === dir && this.board[ty][tx] === 0) {
                    // Normal move
                    this.board[ty][tx] = this.turn;
                    this.board[sy][sx] = 0;
                    this.turn = this.turn === 1 ? 2 : 1;
                } else if (Math.abs(dx) === 2 && dy === dir * 2 && this.board[ty][tx] === 0) {
                    // Jump
                    let mx = sx + dx/2; let my = sy + dy/2;
                    if (this.board[my][mx] !== 0 && this.board[my][mx] !== this.turn) {
                        this.board[my][mx] = 0;
                        this.board[ty][tx] = this.turn;
                        this.board[sy][sx] = 0;
                        if (this.turn === 1) this.scoreP1++; else this.scoreP2++;
                        this.turn = this.turn === 1 ? 2 : 1;
                    }
                }
                this.selected = null;
                this.inputDelay = 0.3;
            } else {
                // Select piece
                if (this.board[this.cursor.y][this.cursor.x] === this.turn) {
                    this.selected = { x: this.cursor.x, y: this.cursor.y };
                    this.inputDelay = 0.3;
                }
            }
        };

        if (this.turn === 1 && this.inputDelay <= 0) {
            if (Input.isDown('KeyW')) moveCursor(0, -1);
            else if (Input.isDown('KeyS')) moveCursor(0, 1);
            else if (Input.isDown('KeyA')) moveCursor(-1, 0);
            else if (Input.isDown('KeyD')) moveCursor(1, 0);
            else if (Input.isDown('Space')) attemptAction();
        }

        if (this.turn === 2) {
            if (GameManager.isSinglePlayer) {
                this.aiTimer -= dt;
                if (this.aiTimer <= 0) {
                    this.doAiMove();
                    this.aiTimer = 1.0;
                    this.turn = 1;
                }
            } else if (this.inputDelay <= 0) {
                if (Input.isDown('ArrowUp')) moveCursor(0, -1);
                else if (Input.isDown('ArrowDown')) moveCursor(0, 1);
                else if (Input.isDown('ArrowLeft')) moveCursor(-1, 0);
                else if (Input.isDown('ArrowRight')) moveCursor(1, 0);
                else if (Input.isDown('Enter')) attemptAction();
            }
        }

        if (this.scoreP1 >= 4) GameManager.gameOver(1);
        if (this.scoreP2 >= 4) GameManager.gameOver(2);
    }

    doAiMove() {
        let moves = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x] === 2) {
                    // Check normal moves
                    if (y+1 < this.rows && x-1 >= 0 && this.board[y+1][x-1] === 0) moves.push({sx:x, sy:y, tx:x-1, ty:y+1, jump:false});
                    if (y+1 < this.rows && x+1 < this.cols && this.board[y+1][x+1] === 0) moves.push({sx:x, sy:y, tx:x+1, ty:y+1, jump:false});
                    // Check jumps
                    if (y+2 < this.rows && x-2 >= 0 && this.board[y+1][x-1] === 1 && this.board[y+2][x-2] === 0) moves.push({sx:x, sy:y, tx:x-2, ty:y+2, jump:true, mx:x-1, my:y+1});
                    if (y+2 < this.rows && x+2 < this.cols && this.board[y+1][x+1] === 1 && this.board[y+2][x+2] === 0) moves.push({sx:x, sy:y, tx:x+2, ty:y+2, jump:true, mx:x+1, my:y+1});
                }
            }
        }

        if (moves.length > 0) {
            let jumps = moves.filter(m => m.jump);
            let move = jumps.length > 0 ? jumps[Math.floor(Math.random() * jumps.length)] : moves[Math.floor(Math.random() * moves.length)];
            
            this.board[move.ty][move.tx] = 2;
            this.board[move.sy][move.sx] = 0;
            if (move.jump) {
                this.board[move.my][move.mx] = 0;
                this.scoreP2++;
            }
        } else {
            // No moves, AI skips
        }
    }

    render(ctx) {
        // Draw Board
        ctx.lineWidth = 4;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                let px = this.offsetX + x * this.cellSize;
                let py = this.offsetY + y * this.cellSize;
                
                ctx.fillStyle = (x + y) % 2 === 0 ? "#E0D7C6" : "#4A4641";
                ctx.fillRect(px, py, this.cellSize, this.cellSize);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(px, py, this.cellSize, this.cellSize);

                // Draw Piece
                let piece = this.board[y][x];
                if (piece > 0) {
                    ctx.fillStyle = piece === 1 ? Theme.p1 : (GameManager.isSinglePlayer && piece === 2 ? "#8C52FF" : Theme.p2);
                    ctx.beginPath();
                    ctx.arc(px + this.cellSize/2, py + this.cellSize/2, this.cellSize*0.35, 0, Math.PI*2);
                    ctx.fill(); ctx.stroke();
                }

                // Draw Highlight for Selected
                if (this.selected && this.selected.x === x && this.selected.y === y) {
                    ctx.strokeStyle = Theme.accent;
                    ctx.strokeRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
                }
            }
        }

        // Draw Cursor
        let cx = this.offsetX + this.cursor.x * this.cellSize;
        let cy = this.offsetY + this.cursor.y * this.cellSize;
        ctx.strokeStyle = this.turn === 1 ? Theme.p1 : Theme.accent;
        ctx.lineWidth = 6;
        ctx.strokeRect(cx, cy, this.cellSize, this.cellSize);
    }
}
GameManager.registerGame(new ActionCheckers());