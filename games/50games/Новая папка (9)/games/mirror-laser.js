class MirrorLaser extends GameBase {
    constructor() {
        super("Mirror Laser", "Rotate mirrors to guide laser into opponent's base.");
    }

    init(w, h) {
        super.init(w, h);
        this.resetRound();
    }

    resetRound() {
        this.gridSize = 9;
        this.cell = Math.min(this.width / (this.gridSize + 4), this.height / (this.gridSize + 4));
        this.offsetX = (this.width - this.gridSize * this.cell) / 2;
        this.offsetY = (this.height - this.gridSize * this.cell) / 2;

        this.mirrors = Array(this.gridSize).fill().map(()=>Array(this.gridSize).fill(0)); // 0=empty, 1=/, 2=\

        // Place some random starting mirrors
        for (let i=0; i<8; i++) {
            let x = 1 + Math.floor(Math.random()*(this.gridSize-2));
            let y = 1 + Math.floor(Math.random()*(this.gridSize-2));
            this.mirrors[y][x] = Math.random()<0.5 ? 1 : 2;
        }

        this.laser = { x: 0, y: Math.floor(this.gridSize/2), dir: 0 }; // 0=right,1=down,2=left,3=up
        this.targetP1 = {x: this.gridSize-1, y: Math.floor(this.gridSize/2)};
        this.targetP2 = {x: 0, y: Math.floor(this.gridSize/2)};

        this.winner = 0;
    }

    update(dt) {
        if (this.winner) return;

        // Player 1 rotates mirrors with WASD + Space to fire
        if (Input.isJustPressed('Space')) {
            this.fireLaser();
        }
        if (Input.isJustPressed('KeyW') || Input.isJustPressed('KeyS') ||
            Input.isJustPressed('KeyA') || Input.isJustPressed('KeyD')) {
            this.rotateMirrorUnderCursor(1);
        }

        // Player 2 or CPU
        if (GameManager.isSinglePlayer) {
            if (Math.random() < 0.03) {
                this.rotateMirrorRandom();
            }
            if (Math.random() < 0.008) {
                this.fireLaser();
            }
        } else {
            if (Input.isJustPressed('Enter')) {
                this.fireLaser();
            }
            if (Input.isJustPressed('ArrowUp') || Input.isJustPressed('ArrowDown') ||
                Input.isJustPressed('ArrowLeft') || Input.isJustPressed('ArrowRight')) {
                this.rotateMirrorUnderCursor(2);
            }
        }
    }

    rotateMirrorUnderCursor(player) {
        // Very simple: cycle nearest mirror or random one
        for (let y=1; y<this.gridSize-1; y++) {
            for (let x=1; x<this.gridSize-1; x++) {
                if (this.mirrors[y][x] !== 0) {
                    this.mirrors[y][x] = this.mirrors[y][x] === 1 ? 2 : 1;
                    return; // rotate one at a time
                }
            }
        }
    }

    rotateMirrorRandom() {
        let candidates = [];
        for (let y=0; y<this.gridSize; y++) {
            for (let x=0; x<this.gridSize; x++) {
                if (this.mirrors[y][x] !== 0) candidates.push({x,y});
            }
        }
        if (candidates.length > 0) {
            let c = candidates[Math.floor(Math.random()*candidates.length)];
            this.mirrors[c.y][c.x] = this.mirrors[c.y][c.x] === 1 ? 2 : 1;
        }
    }

    fireLaser() {
        let x = this.laser.x;
        let y = this.laser.y;
        let dir = this.laser.dir; // 0 right, 1 down, 2 left, 3 up

        let steps = 0;
        const maxSteps = this.gridSize * 4;

        while (steps < maxSteps) {
            steps++;
            if (dir === 0) x++;
            else if (dir === 1) y++;
            else if (dir === 2) x--;
            else if (dir === 3) y--;

            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) break;

            const m = this.mirrors[y][x];
            if (m === 1) { // /
                if (dir === 0) dir = 3;
                else if (dir === 1) dir = 2;
                else if (dir === 2) dir = 1;
                else if (dir === 3) dir = 0;
            } else if (m === 2) { // \
                if (dir === 0) dir = 1;
                else if (dir === 1) dir = 0;
                else if (dir === 2) dir = 3;
                else if (dir === 3) dir = 2;
            }

            if (x === this.targetP1.x && y === this.targetP1.y) {
                this.winner = 1;
                GameManager.gameOver(1);
                return;
            }
            if (x === this.targetP2.x && y === this.targetP2.y) {
                this.winner = 2;
                GameManager.gameOver(2);
                return;
            }
        }
    }

    render(ctx) {
        const cell = this.cell;
        const ox = this.offsetX;
        const oy = this.offsetY;

        // Grid
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        for (let i=0; i<=this.gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(ox + i*cell, oy);
            ctx.lineTo(ox + i*cell, oy + this.gridSize*cell);
            ctx.moveTo(ox, oy + i*cell);
            ctx.lineTo(ox + this.gridSize*cell, oy + i*cell);
            ctx.stroke();
        }

        // Mirrors
        for (let y=0; y<this.gridSize; y++) {
            for (let x=0; x<this.gridSize; x++) {
                const m = this.mirrors[y][x];
                if (m) {
                    ctx.strokeStyle = Theme.accent;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    if (m === 1) { // /
                        ctx.moveTo(ox + x*cell + cell*0.1, oy + y*cell + cell*0.9);
                        ctx.lineTo(ox + x*cell + cell*0.9, oy + y*cell + cell*0.1);
                    } else { // \
                        ctx.moveTo(ox + x*cell + cell*0.1, oy + y*cell + cell*0.1);
                        ctx.lineTo(ox + x*cell + cell*0.9, oy + y*cell + cell*0.9);
                    }
                    ctx.stroke();
                }
            }
        }

        // Cannon / targets
        ctx.fillStyle = Theme.p1;
        ctx.fillRect(ox + this.targetP1.x * cell + 4, oy + this.targetP1.y * cell + 4, cell-8, cell-8);

        ctx.fillStyle = Theme.p2;
        ctx.fillRect(ox + this.targetP2.x * cell + 4, oy + this.targetP2.y * cell + 4, cell-8, cell-8);

        // Laser start
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(ox + 4, oy + this.laser.y * cell + 4, cell-8, cell-8);

        ctx.fillStyle = Theme.fg;
        ctx.font = "22px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SPACE / ENTER → FIRE LASER", this.width/2, this.height - 30);
    }
}

GameManager.registerGame(new MirrorLaser());