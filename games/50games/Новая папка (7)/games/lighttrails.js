class LightTrails extends GameBase {
    constructor() { super("Light Trails", "Don't crash into the lines! First to 3 wins."); }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = this.scoreP1 || 0;
        this.scoreP2 = this.scoreP2 || 0;
        this.speed = 200;
        this.thickness = 8;
        this.resetRound();
    }

    resetRound() {
        // Dirs: 0=Up, 1=Right, 2=Down, 3=Left
        this.p1 = { x: this.width * 0.2, y: this.height / 2, dir: 1, nextDir: 1, path: [], active: true };
        this.p2 = { x: this.width * 0.8, y: this.height / 2, dir: 3, nextDir: 3, path: [], active: true };
        this.p1.path.push({ x: this.p1.x, y: this.p1.y });
        this.p2.path.push({ x: this.p2.x, y: this.p2.y });
    }

    update(dt) {
        let delta = dt > 0.5 ? dt / 1000 : dt;

        // Inputs
        if (Input.isDown('KeyW') && this.p1.dir !== 2) this.p1.nextDir = 0;
        if (Input.isDown('KeyD') && this.p1.dir !== 3) this.p1.nextDir = 1;
        if (Input.isDown('KeyS') && this.p1.dir !== 0) this.p1.nextDir = 2;
        if (Input.isDown('KeyA') && this.p1.dir !== 1) this.p1.nextDir = 3;

        if (GameManager.isSinglePlayer) {
            // AI Logic: Detect danger ahead and turn
            let aheadX = this.p2.x + (this.p2.dir === 1 ? 40 : this.p2.dir === 3 ? -40 : 0);
            let aheadY = this.p2.y + (this.p2.dir === 2 ? 40 : this.p2.dir === 0 ? -40 : 0);
            if (this.isCollision(aheadX, aheadY)) {
                let safeTurn = (this.p2.dir + 1) % 4; // Try right turn
                if (this.p2.dir % 2 === 0) { // Moving vertically, check horiz
                    this.p2.nextDir = (this.p2.x > this.width / 2) ? 3 : 1; 
                } else { // Moving horiz, check vert
                    this.p2.nextDir = (this.p2.y > this.height / 2) ? 0 : 2;
                }
            }
        } else {
            if (Input.isDown('ArrowUp') && this.p2.dir !== 2) this.p2.nextDir = 0;
            if (Input.isDown('ArrowRight') && this.p2.dir !== 3) this.p2.nextDir = 1;
            if (Input.isDown('ArrowDown') && this.p2.dir !== 0) this.p2.nextDir = 2;
            if (Input.isDown('ArrowLeft') && this.p2.dir !== 1) this.p2.nextDir = 3;
        }

        [this.p1, this.p2].forEach(p => {
            if (!p.active) return;
            if (p.nextDir !== p.dir) {
                p.dir = p.nextDir;
                p.path.push({ x: p.x, y: p.y });
            }
            let move = this.speed * delta;
            if (p.dir === 0) p.y -= move;
            if (p.dir === 1) p.x += move;
            if (p.dir === 2) p.y += move;
            if (p.dir === 3) p.x -= move;

            if (this.isCollision(p.x, p.y)) p.active = false;
        });

        // Check Round Over
        if (!this.p1.active || !this.p2.active) {
            if (!this.p1.active && this.p2.active) this.scoreP2++;
            else if (!this.p2.active && this.p1.active) this.scoreP1++;
            
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else this.resetRound();
        }
    }

    isCollision(x, y) {
        if (x < 0 || x > this.width || y < 0 || y > this.height) return true;
        // Simple pixel-based trail detection math via segments
        const allPaths = [this.p1.path, this.p2.path];
        for (let paths of allPaths) {
            for (let i = 0; i < paths.length - 1; i++) {
                let pA = paths[i], pB = paths[i + 1];
                let minX = Math.min(pA.x, pB.x) - this.thickness;
                let maxX = Math.max(pA.x, pB.x) + this.thickness;
                let minY = Math.min(pA.y, pB.y) - this.thickness;
                let maxY = Math.max(pA.y, pB.y) + this.thickness;
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
            }
        }
        return false;
    }

    renderPath(ctx, p, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = this.thickness;
        ctx.lineCap = "square";
        ctx.lineJoin = "miter";
        ctx.beginPath();
        if (p.path.length > 0) ctx.moveTo(p.path[0].x, p.path[0].y);
        for (let i = 1; i < p.path.length; i++) ctx.lineTo(p.path[i].x, p.path[i].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);
        this.renderPath(ctx, this.p1, Theme.p1);
        this.renderPath(ctx, this.p2, Theme.p2);
    }
}
GameManager.registerGame(new LightTrails());