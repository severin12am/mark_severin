class GameFlappyDuel extends GameBase {
    constructor() { super("Flappy Duel", "Tap W (P1) and Up (P2) to fly. Don't hit pipes! First to 3."); }

    init(w, h) {
        super.init(w, h);
        if (!this.scoreP1 && !this.scoreP2) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { y: this.height/2, vy: 0, dead: false };
        this.p2 = { y: this.height/2, vy: 0, dead: false };
        this.pipes = [];
        this.pipeTimer = 0;
        
        this.lastW = false;
        this.lastUp = false;
    }

    update(dt) {
        const gravity = 1200 * dt;
        const jump = -400;

        let isW = Input.isDown('KeyW');
        let isUp = Input.isDown('ArrowUp');

        // P1 Flap
        if (!this.p1.dead) {
            this.p1.vy += gravity;
            if (isW && !this.lastW) this.p1.vy = jump;
            this.p1.y += this.p1.vy * dt;
        }

        // P2 Flap
        if (!this.p2.dead) {
            this.p2.vy += gravity;
            if (isUp && !this.lastUp) this.p2.vy = jump;
            this.p2.y += this.p2.vy * dt;
        }

        this.lastW = isW; this.lastUp = isUp;

        // Pipe Spawning
        this.pipeTimer -= dt;
        if (this.pipeTimer <= 0) {
            let gapY = Math.random() * (this.height - 200) + 100;
            this.pipes.push({ x: this.width, gapY: gapY, gapSize: 150 });
            this.pipeTimer = 2.0;
        }

        // Update Pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            let p = this.pipes[i];
            p.x -= 200 * dt; // Scroll speed

            // Collision check
            const checkHit = (bird) => {
                if (bird.dead) return true;
                if (bird.y < 0 || bird.y > this.height) return true; // Floor/Ceiling
                if (p.x < 120 && p.x + 50 > 80) { // X overlap (Birds are at x=100)
                    if (bird.y < p.gapY - p.gapSize/2 || bird.y > p.gapY + p.gapSize/2) return true;
                }
                return false;
            };

            if (checkHit(this.p1)) this.p1.dead = true;
            if (checkHit(this.p2)) this.p2.dead = true;

            if (p.x < -50) this.pipes.splice(i, 1);
        }

        // Round resolution
        if (this.p1.dead || this.p2.dead) {
            if (this.p1.dead && !this.p2.dead) this.scoreP2++;
            else if (this.p2.dead && !this.p1.dead) this.scoreP1++;
            // If both die on same frame, no points

            if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
            } else {
                this.resetRound();
            }
        }
    }

    render(ctx) {
        // Draw Pipes
        ctx.fillStyle = '#555';
        for (let p of this.pipes) {
            ctx.fillRect(p.x, 0, 50, p.gapY - p.gapSize/2); // Top
            ctx.fillRect(p.x, p.gapY + p.gapSize/2, 50, this.height); // Bottom
        }

        // Draw Birds (Offset X slightly so they don't overlap perfectly)
        if (!this.p1.dead) { ctx.fillStyle = Theme.p1; ctx.fillRect(80, this.p1.y - 15, 30, 30); }
        if (!this.p2.dead) { ctx.fillStyle = Theme.p2; ctx.fillRect(100, this.p2.y - 15, 30, 30); }
    }
}
GameManager.registerGame(new GameFlappyDuel());