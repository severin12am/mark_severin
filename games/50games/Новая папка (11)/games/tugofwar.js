class GameTugOfWar extends GameBase {
    constructor() { super("Tug of War", "Mash 'W' (P1) vs 'UP Arrow' (P2) as fast as you can!"); }

    init(w, h) {
        super.init(w, h);
        this.ropeX = w / 2;
        this.winThreshold = w / 2 - 50; 
        
        // Track previous frame input so we force them to tap, not hold
        this.lastW = false;
        this.lastUp = false;
    }

    update(dt) {
        let isW = Input.isDown('KeyW');
        let isUp = Input.isDown('ArrowUp');

        // Check for discrete presses (button mashing)
        if (isW && !this.lastW) this.ropeX -= 15;
        if (isUp && !this.lastUp) this.ropeX += 15;

        this.lastW = isW;
        this.lastUp = isUp;

        // Win conditions
        if (this.ropeX <= 50) {
            this.scoreP1++;
            GameManager.gameOver(1);
        } else if (this.ropeX >= this.width - 50) {
            this.scoreP2++;
            GameManager.gameOver(2);
        }
    }

    render(ctx) {
        // Draw Center line
        ctx.strokeStyle = '#555'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(this.width/2, 0); ctx.lineTo(this.width/2, this.height); ctx.stroke();

        // Draw Rope
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 15;
        ctx.beginPath(); ctx.moveTo(50, this.height/2); ctx.lineTo(this.width-50, this.height/2); ctx.stroke();

        // Draw Player Zones (Danger areas)
        ctx.fillStyle = 'rgba(255, 71, 87, 0.2)'; ctx.fillRect(0, 0, 50, this.height);
        ctx.fillStyle = 'rgba(46, 213, 115, 0.2)'; ctx.fillRect(this.width-50, 0, 50, this.height);

        // Draw Flag (The indicator)
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.ropeX - 10, this.height/2 - 30, 20, 60);

        // Draw avatars pulling
        ctx.fillStyle = Theme.p1; ctx.beginPath(); ctx.arc(Math.min(this.ropeX - 40, this.width/2 - 40), this.height/2, 25, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = Theme.p2; ctx.beginPath(); ctx.arc(Math.max(this.ropeX + 40, this.width/2 + 40), this.height/2, 25, 0, Math.PI*2); ctx.fill();
    }
}
GameManager.registerGame(new GameTugOfWar());