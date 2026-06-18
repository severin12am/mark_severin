class CaptureTheFlag extends GameBase {
    constructor() { super("Capture The Flag", "Bring the flag to your base. First to 3."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 50, y: this.height/2, s: 15 };
        this.p2 = { x: this.width-50, y: this.height/2, s: 15 };
        this.flag = { x: this.width/2, y: this.height/2, holder: 0 };
    }
    update(dt) {
        let speed = 4;
        let p1Spd = this.flag.holder === 1 ? speed * 0.8 : speed;
        let p2Spd = this.flag.holder === 2 ? speed * 0.8 : speed;

        if (Input.isDown('KeyW')) this.p1.y -= p1Spd;
        if (Input.isDown('KeyS')) this.p1.y += p1Spd;
        if (Input.isDown('KeyA')) this.p1.x -= p1Spd;
        if (Input.isDown('KeyD')) this.p1.x += p1Spd;

        if (GameManager.isSinglePlayer) {
            let tx = this.flag.holder === 2 ? this.width : (this.flag.holder === 1 ? this.p1.x : this.flag.x);
            let ty = this.flag.holder === 2 ? this.height/2 : (this.flag.holder === 1 ? this.p1.y : this.flag.y);
            if (this.p2.x < tx) this.p2.x += p2Spd; else this.p2.x -= p2Spd;
            if (this.p2.y < ty) this.p2.y += p2Spd; else this.p2.y -= p2Spd;
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= p2Spd;
            if (Input.isDown('ArrowDown')) this.p2.y += p2Spd;
            if (Input.isDown('ArrowLeft')) this.p2.x -= p2Spd;
            if (Input.isDown('ArrowRight')) this.p2.x += p2Spd;
        }[this.p1, this.p2].forEach(p => {
            p.x = Math.max(p.s, Math.min(this.width - p.s, p.x));
            p.y = Math.max(p.s, Math.min(this.height - p.s, p.y));
        });

        // Flag grab
        if (this.flag.holder === 0) {
            if (Math.hypot(this.p1.x - this.flag.x, this.p1.y - this.flag.y) < this.p1.s + 10) this.flag.holder = 1;
            else if (Math.hypot(this.p2.x - this.flag.x, this.p2.y - this.flag.y) < this.p2.s + 10) this.flag.holder = 2;
        } else {
            // Drop on hit
            if (Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.s + this.p2.s) {
                this.flag.holder = 0;
                this.p1.x += (this.p1.x < this.p2.x ? -30 : 30);
                this.p2.x += (this.p2.x < this.p1.x ? -30 : 30);
            }
        }

        if (this.flag.holder === 1) { this.flag.x = this.p1.x; this.flag.y = this.p1.y - 20; }
        if (this.flag.holder === 2) { this.flag.x = this.p2.x; this.flag.y = this.p2.y - 20; }

        // Score
        if (this.flag.holder === 1 && this.p1.x < 100) {
            this.scoreP1++; if (this.scoreP1 >= 3) GameManager.gameOver(1); else this.resetRound();
        }
        if (this.flag.holder === 2 && this.p2.x > this.width - 100) {
            this.scoreP2++; if (this.scoreP2 >= 3) GameManager.gameOver(2); else this.resetRound();
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        // Bases
        ctx.fillStyle = Theme.p1; ctx.globalAlpha = 0.3; ctx.fillRect(0, 0, 100, this.height);
        ctx.fillStyle = Theme.p2; ctx.fillRect(this.width-100, 0, 100, this.height);
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = Theme.p1;
        ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = Theme.p2;
        ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.flag.x - 10, this.flag.y - 10, 20, 20);
    }
}
GameManager.registerGame(new CaptureTheFlag());