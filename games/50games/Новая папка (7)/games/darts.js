class Darts extends GameBase {
    constructor() { super("Darts", "Stop your crosshair on the center. First to 500 points."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.cx1 = w / 4; this.cy1 = h / 2;
        this.cx2 = w * 0.75; this.cy2 = h / 2;
        this.time = 0;
        this.cd1 = 0; this.cd2 = 0;
        this.darts1 = []; this.darts2 =[];
    }
    update(dt) {
        this.time += 0.05;
        
        // Moving crosshairs (Lissajous curves)
        let tx1 = this.cx1 + Math.sin(this.time * 0.8) * 100 + Math.cos(this.time * 1.5) * 50;
        let ty1 = this.cy1 + Math.cos(this.time * 1.1) * 100 + Math.sin(this.time * 0.7) * 50;
        
        let tx2 = this.cx2 + Math.sin(this.time * 0.9) * 100 + Math.cos(this.time * 1.4) * 50;
        let ty2 = this.cy2 + Math.cos(this.time * 1.2) * 100 + Math.sin(this.time * 0.6) * 50;

        if (this.cd1 > 0) this.cd1--;
        if (this.cd2 > 0) this.cd2--;

        // Throwing Logic
        let calcScore = (cx, cy, tx, ty) => {
            let dist = Math.hypot(cx - tx, cy - ty);
            if (dist < 10) return 50; // Bullseye
            if (dist < 40) return 25;
            if (dist < 80) return 10;
            return 0;
        };

        if (Input.isDown('Space') && this.cd1 <= 0) {
            this.darts1.push({x: tx1, y: ty1});
            this.scoreP1 += calcScore(this.cx1, this.cy1, tx1, ty1);
            this.cd1 = 60;
        }

        if (GameManager.isSinglePlayer) {
            let dist = Math.hypot(this.cx2 - tx2, this.cy2 - ty2);
            if (dist < 15 && this.cd2 <= 0 && Math.random() < 0.1) {
                this.darts2.push({x: tx2, y: ty2});
                this.scoreP2 += calcScore(this.cx2, this.cy2, tx2, ty2);
                this.cd2 = 60;
            }
        } else {
            if (Input.isDown('Enter') && this.cd2 <= 0) {
                this.darts2.push({x: tx2, y: ty2});
                this.scoreP2 += calcScore(this.cx2, this.cy2, tx2, ty2);
                this.cd2 = 60;
            }
        }

        if (this.scoreP1 >= 500) GameManager.gameOver(1);
        if (this.scoreP2 >= 500) GameManager.gameOver(2);
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        let drawBoard = (cx, cy) => {
            ctx.fillStyle = Theme.fg; ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = Theme.bg; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = Theme.accent; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();
        };

        drawBoard(this.cx1, this.cy1);
        drawBoard(this.cx2, this.cy2);

        // Previous darts
        ctx.fillStyle = Theme.p1;
        this.darts1.forEach(d => { ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI*2); ctx.fill(); });
        ctx.fillStyle = Theme.p2;
        this.darts2.forEach(d => { ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI*2); ctx.fill(); });

        // Crosshairs
        ctx.strokeStyle = Theme.p1; ctx.lineWidth = 2;
        let tx1 = this.cx1 + Math.sin(this.time * 0.8) * 100 + Math.cos(this.time * 1.5) * 50;
        let ty1 = this.cy1 + Math.cos(this.time * 1.1) * 100 + Math.sin(this.time * 0.7) * 50;
        ctx.beginPath(); ctx.arc(tx1, ty1, 15, 0, Math.PI*2); ctx.stroke();

        ctx.strokeStyle = Theme.p2;
        let tx2 = this.cx2 + Math.sin(this.time * 0.9) * 100 + Math.cos(this.time * 1.4) * 50;
        let ty2 = this.cy2 + Math.cos(this.time * 1.2) * 100 + Math.sin(this.time * 0.6) * 50;
        ctx.beginPath(); ctx.arc(tx2, ty2, 15, 0, Math.PI*2); ctx.stroke();
    }
}
GameManager.registerGame(new Darts());