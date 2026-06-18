class TurfWar extends GameBase {
    constructor() { super("Turf War", "Paint the grid! 30 seconds limit."); }
    init(w, h) {
        super.init(w, h);
        this.cellSize = 20;
        this.cols = Math.floor(w / this.cellSize);
        this.rows = Math.floor(h / this.cellSize);
        this.grid = new Array(this.cols * this.rows).fill(0);
        this.p1 = { x: 2, y: this.rows/2, color: 1 };
        this.p2 = { x: this.cols-3, y: this.rows/2, color: 2 };
        this.timer = 1800; // 30s at 60fps
        this.scoreP1 = 0; this.scoreP2 = 0;
        this.cd1 = 0; this.cd2 = 0;
    }
    update(dt) {
        this.timer--;
        if (this.timer <= 0) {
            let p1c = 0, p2c = 0;
            this.grid.forEach(c => { if(c===1) p1c++; if(c===2) p2c++; });
            if (p1c > p2c) GameManager.gameOver(1);
            else if (p2c > p1c) GameManager.gameOver(2);
            else GameManager.gameOver(0);
            return;
        }

        let moveDelay = 4;
        if (this.cd1 > 0) this.cd1--;
        if (this.cd2 > 0) this.cd2--;

        if (this.cd1 === 0) {
            if (Input.isDown('KeyW') && this.p1.y > 0) { this.p1.y--; this.cd1 = moveDelay; }
            else if (Input.isDown('KeyS') && this.p1.y < this.rows-1) { this.p1.y++; this.cd1 = moveDelay; }
            else if (Input.isDown('KeyA') && this.p1.x > 0) { this.p1.x--; this.cd1 = moveDelay; }
            else if (Input.isDown('KeyD') && this.p1.x < this.cols-1) { this.p1.x++; this.cd1 = moveDelay; }
        }

        if (this.cd2 === 0) {
            if (GameManager.isSinglePlayer) {
                let dirs = [[0,-1],[0,1],[-1,0],[1,0]];
                let best = dirs[Math.floor(Math.random()*dirs.length)];
                if (this.p2.x + best[0] >= 0 && this.p2.x + best[0] < this.cols && this.p2.y + best[1] >= 0 && this.p2.y + best[1] < this.rows) {
                    this.p2.x += best[0]; this.p2.y += best[1];
                }
                this.cd2 = moveDelay;
            } else {
                if (Input.isDown('ArrowUp') && this.p2.y > 0) { this.p2.y--; this.cd2 = moveDelay; }
                else if (Input.isDown('ArrowDown') && this.p2.y < this.rows-1) { this.p2.y++; this.cd2 = moveDelay; }
                else if (Input.isDown('ArrowLeft') && this.p2.x > 0) { this.p2.x--; this.cd2 = moveDelay; }
                else if (Input.isDown('ArrowRight') && this.p2.x < this.cols-1) { this.p2.x++; this.cd2 = moveDelay; }
            }
        }

        this.grid[Math.floor(this.p1.y) * this.cols + Math.floor(this.p1.x)] = 1;
        this.grid[Math.floor(this.p2.y) * this.cols + Math.floor(this.p2.x)] = 2;
        
        // update scores dynamically
        this.scoreP1 = 0; this.scoreP2 = 0;
        this.grid.forEach(c => { if(c===1) this.scoreP1++; if(c===2) this.scoreP2++; });
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                let val = this.grid[y * this.cols + x];
                if (val === 1) { ctx.fillStyle = Theme.p1; ctx.fillRect(x*this.cellSize, y*this.cellSize, this.cellSize, this.cellSize); }
                if (val === 2) { ctx.fillStyle = Theme.p2; ctx.fillRect(x*this.cellSize, y*this.cellSize, this.cellSize, this.cellSize); }
            }
        }

        ctx.fillStyle = Theme.fg;
        ctx.fillRect(this.p1.x * this.cellSize, this.p1.y * this.cellSize, this.cellSize, this.cellSize);
        ctx.fillRect(this.p2.x * this.cellSize, this.p2.y * this.cellSize, this.cellSize, this.cellSize);

        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, 0, this.width * (this.timer / 1800), 5);
    }
}
GameManager.registerGame(new TurfWar());