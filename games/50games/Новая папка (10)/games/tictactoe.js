class TicTacToe extends GameBase {
    constructor() { super("Action Tic Tac Toe", "Move cursor, place your mark. Quick!"); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.board =[0,0,0, 0,0,0, 0,0,0];
        this.p1 = { x: 0, y: 0, cd: 0 };
        this.p2 = { x: 2, y: 2, cd: 0 };
        this.cellSize = 100;
        this.offsetX = this.width/2 - 150;
        this.offsetY = this.height/2 - 150;
    }
    checkWin() {
        let b = this.board;
        let wins = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        for (let w of wins) {
            if (b[w[0]] && b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]]) return b[w[0]];
        }
        if (!b.includes(0)) return 0; // draw
        return -1; // ongoing
    }
    update(dt) {
        let moveDelay = 10;
        if (this.p1.cd > 0) this.p1.cd--;
        if (this.p2.cd > 0) this.p2.cd--;

        let handleInput = (p, w, s, a, d, action, id) => {
            if (p.cd <= 0) {
                if (Input.isDown(w) && p.y > 0) { p.y--; p.cd = moveDelay; }
                else if (Input.isDown(s) && p.y < 2) { p.y++; p.cd = moveDelay; }
                else if (Input.isDown(a) && p.x > 0) { p.x--; p.cd = moveDelay; }
                else if (Input.isDown(d) && p.x < 2) { p.x++; p.cd = moveDelay; }
                else if (Input.isDown(action)) {
                    let idx = p.y * 3 + p.x;
                    if (this.board[idx] === 0) { this.board[idx] = id; p.cd = 30; }
                }
            }
        };

        handleInput(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 1);

        if (GameManager.isSinglePlayer) {
            if (this.p2.cd <= 0 && Math.random() < 0.05) {
                let empty =[];
                for (let i=0; i<9; i++) if (this.board[i]===0) empty.push(i);
                if (empty.length > 0) {
                    let pick = empty[Math.floor(Math.random() * empty.length)];
                    this.board[pick] = 2;
                    this.p2.cd = 60;
                }
            }
        } else {
            handleInput(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 2);
        }

        let result = this.checkWin();
        if (result !== -1) {
            if (result === 1) { this.scoreP1++; GameManager.gameOver(1); }
            else if (result === 2) { this.scoreP2++; GameManager.gameOver(2); }
            else { GameManager.gameOver(0); } // draw
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.strokeStyle = Theme.fg; ctx.lineWidth = 5;
        for (let i=1; i<3; i++) {
            ctx.beginPath(); ctx.moveTo(this.offsetX + i*this.cellSize, this.offsetY); ctx.lineTo(this.offsetX + i*this.cellSize, this.offsetY + 300); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.offsetX, this.offsetY + i*this.cellSize); ctx.lineTo(this.offsetX + 300, this.offsetY + i*this.cellSize); ctx.stroke();
        }

        for (let y=0; y<3; y++) {
            for (let x=0; x<3; x++) {
                let v = this.board[y*3+x];
                let px = this.offsetX + x*this.cellSize + this.cellSize/2;
                let py = this.offsetY + y*this.cellSize + this.cellSize/2;
                if (v === 1) { ctx.fillStyle = Theme.p1; ctx.beginPath(); ctx.arc(px, py, 30, 0, Math.PI*2); ctx.fill(); }
                if (v === 2) { ctx.fillStyle = Theme.p2; ctx.fillRect(px-25, py-25, 50, 50); }
            }
        }

        // Cursors
        ctx.strokeStyle = Theme.p1; ctx.lineWidth = 3;
        ctx.strokeRect(this.offsetX + this.p1.x*this.cellSize + 5, this.offsetY + this.p1.y*this.cellSize + 5, this.cellSize-10, this.cellSize-10);
        
        ctx.strokeStyle = Theme.p2;
        ctx.strokeRect(this.offsetX + this.p2.x*this.cellSize + 10, this.offsetY + this.p2.y*this.cellSize + 10, this.cellSize-20, this.cellSize-20);
    }
}
GameManager.registerGame(new TicTacToe());