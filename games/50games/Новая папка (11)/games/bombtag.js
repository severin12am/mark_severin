class BombTag extends GameBase {
    constructor() { super("Bomb Tag", "Pass the bomb! Don't hold it at 0."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 100, y: this.height / 2, s: 20 };
        this.p2 = { x: this.width - 100, y: this.height / 2, s: 20 };
        this.bombHolder = Math.random() > 0.5 ? 1 : 2;
        this.timer = 600; // 10 seconds at 60fps
        this.passCd = 0;
    }
    update(dt) {
        let speed = 5;
        let p1Spd = this.bombHolder === 1 ? speed * 1.15 : speed; // Bomb holder runs slightly faster to make tags possible
        let p2Spd = this.bombHolder === 2 ? speed * 1.15 : speed;

        if (Input.isDown('KeyW')) this.p1.y -= p1Spd;
        if (Input.isDown('KeyS')) this.p1.y += p1Spd;
        if (Input.isDown('KeyA')) this.p1.x -= p1Spd;
        if (Input.isDown('KeyD')) this.p1.x += p1Spd;

        if (GameManager.isSinglePlayer) {
            if (this.bombHolder === 2) { // chase
                if (this.p2.x < this.p1.x) this.p2.x += p2Spd; else this.p2.x -= p2Spd;
                if (this.p2.y < this.p1.y) this.p2.y += p2Spd; else this.p2.y -= p2Spd;
            } else { // run away
                if (this.p2.x > this.p1.x) this.p2.x += p2Spd; else this.p2.x -= p2Spd;
                if (this.p2.y > this.p1.y) this.p2.y += p2Spd; else this.p2.y -= p2Spd;
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

        if (this.passCd > 0) this.passCd--;

        if (this.passCd <= 0 && Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.s + this.p2.s) {
            this.bombHolder = this.bombHolder === 1 ? 2 : 1;
            this.passCd = 30; // 0.5 sec cooldown
        }

        this.timer--;
        if (this.timer <= 0) {
            if (this.bombHolder === 1) this.scoreP2++; else this.scoreP1++;
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else this.resetRound();
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = Theme.p1;
        ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = Theme.p2;
        ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI*2); ctx.fill();

        // Draw Bomb
        let holder = this.bombHolder === 1 ? this.p1 : this.p2;
        ctx.fillStyle = Theme.accent;
        let pulse = Math.abs(Math.sin(this.timer * 0.1)) * 5;
        ctx.beginPath(); ctx.arc(holder.x, holder.y - 25, 10 + pulse, 0, Math.PI*2); ctx.fill();

        // Timer bar
        ctx.fillStyle = Theme.fg;
        ctx.fillRect(this.width/2 - 150, 20, 300 * (this.timer / 600), 10);
    }
}
GameManager.registerGame(new BombTag());