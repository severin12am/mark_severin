class OddballKeepaway extends GameBase {
    constructor() { super("Oddball", "Hold the orb to score. Run away!"); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.p1 = { x: 100, y: h/2, s: 20 };
        this.p2 = { x: w-100, y: h/2, s: 20 };
        this.orb = { x: w/2, y: h/2, s: 15, holder: 0 };
    }
    update(dt) {
        let speed = 5;
        let p1Spd = this.orb.holder === 1 ? speed * 0.8 : speed;
        let p2Spd = this.orb.holder === 2 ? speed * 0.8 : speed;

        if (Input.isDown('KeyW')) this.p1.y -= p1Spd;
        if (Input.isDown('KeyS')) this.p1.y += p1Spd;
        if (Input.isDown('KeyA')) this.p1.x -= p1Spd;
        if (Input.isDown('KeyD')) this.p1.x += p1Spd;

        if (GameManager.isSinglePlayer) {
            if (this.orb.holder === 2) {
                // run away
                this.p2.x += (this.p2.x > this.p1.x ? p2Spd : -p2Spd);
                this.p2.y += (this.p2.y > this.p1.y ? p2Spd : -p2Spd);
            } else {
                // chase orb or player holding it
                let tx = this.orb.holder === 0 ? this.orb.x : this.p1.x;
                let ty = this.orb.holder === 0 ? this.orb.y : this.p1.y;
                if (this.p2.x < tx) this.p2.x += p2Spd; else this.p2.x -= p2Spd;
                if (this.p2.y < ty) this.p2.y += p2Spd; else this.p2.y -= p2Spd;
            }
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= p2Spd;
            if (Input.isDown('ArrowDown')) this.p2.y += p2Spd;
            if (Input.isDown('ArrowLeft')) this.p2.x -= p2Spd;
            if (Input.isDown('ArrowRight')) this.p2.x += p2Spd;
        }

        [this.p1, this.p2].forEach(p => {
            p.x = Math.max(p.s, Math.min(this.width - p.s, p.x));
            p.y = Math.max(p.s, Math.min(this.height - p.s, p.y));
        });

        // Orb Logic
        if (this.orb.holder === 0) {
            if (Math.hypot(this.p1.x - this.orb.x, this.p1.y - this.orb.y) < this.p1.s + this.orb.s) this.orb.holder = 1;
            else if (Math.hypot(this.p2.x - this.orb.x, this.p2.y - this.orb.y) < this.p2.s + this.orb.s) this.orb.holder = 2;
        } else {
            // Steal
            if (Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.s + this.p2.s) {
                this.orb.holder = this.orb.holder === 1 ? 2 : 1;
                // bounce back
                this.p1.x += (this.p1.x < this.p2.x ? -20 : 20);
                this.p2.x += (this.p2.x < this.p1.x ? -20 : 20);
            }
        }

        if (this.orb.holder === 1) { this.orb.x = this.p1.x; this.orb.y = this.p1.y - 20; this.scoreP1++; }
        if (this.orb.holder === 2) { this.orb.x = this.p2.x; this.orb.y = this.p2.y - 20; this.scoreP2++; }

        if (this.scoreP1 >= 1000) GameManager.gameOver(1);
        if (this.scoreP2 >= 1000) GameManager.gameOver(2);
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = Theme.p1;
        ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = Theme.p2;
        ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = Theme.accent;
        ctx.beginPath(); ctx.arc(this.orb.x, this.orb.y, this.orb.s, 0, Math.PI*2); ctx.fill();
        
        // Progress Bars
        ctx.fillStyle = Theme.p1; ctx.fillRect(10, 10, (this.scoreP1/1000)*300, 10);
        ctx.fillStyle = Theme.p2; ctx.fillRect(this.width - 310, 10, (this.scoreP2/1000)*300, 10);
    }
}
GameManager.registerGame(new OddballKeepaway());