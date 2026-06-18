class SokobanCrush extends GameBase {
    constructor() {
        super("Sokoban Crush", "Push ice blocks to crush your opponent.");
    }

    init(w, h) {
        super.init(w, h);
        this.resetRound();
    }

    resetRound() {
        this.grid = 11;
        this.cell = Math.min(this.width / (this.grid + 2), this.height / (this.grid + 2));
        this.ox = (this.width - this.grid * this.cell) / 2;
        this.oy = (this.height - this.grid * this.cell) / 2;

        this.tiles = Array(this.grid).fill().map(()=>Array(this.grid).fill(0)); // 0 empty, 1 wall, 2 box

        // Outer walls
        for (let i=0; i<this.grid; i++) {
            this.tiles[0][i] = 1;
            this.tiles[this.grid-1][i] = 1;
            this.tiles[i][0] = 1;
            this.tiles[i][this.grid-1] = 1;
        }

        // Some inner walls & boxes
        for (let i=0; i<14; i++) {
            let x = 2 + Math.floor(Math.random()*(this.grid-4));
            let y = 2 + Math.floor(Math.random()*(this.grid-4));
            this.tiles[y][x] = 1;
        }
        for (let i=0; i<6; i++) {
            let x = 2 + Math.floor(Math.random()*(this.grid-4));
            let y = 2 + Math.floor(Math.random()*(this.grid-4));
            if (this.tiles[y][x] === 0) this.tiles[y][x] = 2;
        }

        this.p1 = {x: 2, y: Math.floor(this.grid/2)};
        this.p2 = {x: this.grid-3, y: Math.floor(this.grid/2)};
    }

    update(dt) {
        // Player 1
        let dx1=0, dy1=0;
        if (Input.isJustPressed('KeyW')) dy1 = -1;
        if (Input.isJustPressed('KeyS')) dy1 = 1;
        if (Input.isJustPressed('KeyA')) dx1 = -1;
        if (Input.isJustPressed('KeyD')) dx1 = 1;
        if (dx1 || dy1) this.tryPush(1, dx1, dy1);

        // Player 2 or CPU
        let dx2=0, dy2=0;
        if (GameManager.isSinglePlayer) {
            // Simple AI: move toward player 1, push if possible
            if (Math.abs(this.p1.x - this.p2.x) > Math.abs(this.p1.y - this.p2.y)) {
                dx2 = Math.sign(this.p1.x - this.p2.x);
            } else {
                dy2 = Math.sign(this.p1.y - this.p2.y);
            }
            if (Math.random() < 0.2) { dx2 = Math.sign(Math.random()-0.5); dy2 = 0; }
            if (Math.random() < 0.2) { dy2 = Math.sign(Math.random()-0.5); dx2 = 0; }
        } else {
            if (Input.isJustPressed('ArrowUp'))    dy2 = -1;
            if (Input.isJustPressed('ArrowDown'))  dy2 = 1;
            if (Input.isJustPressed('ArrowLeft'))  dx2 = -1;
            if (Input.isJustPressed('ArrowRight')) dx2 = 1;
        }
        if (dx2 || dy2) this.tryPush(2, dx2, dy2);

        // Check crush
        if (this.p1.x === this.p2.x && this.p1.y === this.p2.y) {
            GameManager.gameOver(0); // draw on collision (rare)
        }
    }

    tryPush(player, dx, dy) {
        const p = player===1 ? this.p1 : this.p2;
        const nx = p.x + dx;
        const ny = p.y + dy;

        if (nx<1 || nx>=this.grid-1 || ny<1 || ny>=this.grid-1) return;
        if (this.tiles[ny][nx] === 1) return; // wall

        if (this.tiles[ny][nx] === 2) { // box
            const bx = nx + dx;
            const by = ny + dy;
            if (bx<1 || bx>=this.grid-1 || by<1 || by>=this.grid-1) return;
            if (this.tiles[by][bx] !== 0) return; // blocked

            // push box
            this.tiles[by][bx] = 2;
            this.tiles[ny][nx] = 0;
        }

        // move player
        if (player===1) {
            this.p1.x = nx;
            this.p1.y = ny;
        } else {
            this.p2.x = nx;
            this.p2.y = ny;
        }

        // Check if opponent is crushed by box
        if (player===1 && this.p2.x === nx && this.p2.y === ny) {
            GameManager.gameOver(1);
        }
        if (player===2 && this.p1.x === nx && this.p1.y === ny) {
            GameManager.gameOver(2);
        }
    }

    render(ctx) {
        const cell = this.cell;
        const ox = this.ox;
        const oy = this.oy;

        // Tiles
        for (let y=0; y<this.grid; y++) {
            for (let x=0; x<this.grid; x++) {
                const tx = ox + x*cell;
                const ty = oy + y*cell;

                if (this.tiles[y][x] === 1) {
                    ctx.fillStyle = Theme.fg;
                    ctx.fillRect(tx, ty, cell, cell);
                } else if (this.tiles[y][x] === 2) {
                    ctx.fillStyle = "#a0d0ff";
                    ctx.fillRect(tx+4, ty+4, cell-8, cell-8);
                    ctx.strokeStyle = Theme.accent;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(tx+4, ty+4, cell-8, cell-8);
                } else {
                    ctx.strokeStyle = Theme.fg;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx, ty, cell, cell);
                }
            }
        }

        // Players
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(ox + this.p1.x*cell + 6, oy + this.p1.y*cell + 6, cell-12, cell-12);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(ox + this.p2.x*cell + 6, oy + this.p2.y*cell + 6, cell-12, cell-12);

        ctx.fillStyle = Theme.fg;
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Push blocks → crush opponent", this.width/2, this.height - 30);
    }
}

GameManager.registerGame(new SokobanCrush());