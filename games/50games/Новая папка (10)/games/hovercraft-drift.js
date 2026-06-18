class HovercraftDrift extends GameBase {
    constructor() {
        super("Hovercraft Drift", "Race 3 laps — first to finish wins the round.");
    }

    init(w, h) {
        super.init(w, h);

        this.lapsToWin = 3;
        this.trackRadiusX = 280;
        this.trackRadiusY = 180;
        this.trackCenterX = w / 2;
        this.trackCenterY = h / 2 - 20;

        this.resetPlayers();
    }

    resetPlayers() {
        this.p1 = {
            angle: Math.PI * 1.5,
            speed: 0,
            maxSpeed: 3.8,
            accel: 0.14,
            turnSpeed: 0.038,
            x: this.trackCenterX + Math.cos(Math.PI * 1.5) * this.trackRadiusX,
            y: this.trackCenterY + Math.sin(Math.PI * 1.5) * this.trackRadiusY,
            lap: 0,
            lastCheckpointAngle: Math.PI * 1.5
        };

        this.p2 = {
            angle: Math.PI * 1.5,
            speed: 0,
            maxSpeed: 3.8,
            accel: 0.14,
            turnSpeed: 0.038,
            x: this.trackCenterX + Math.cos(Math.PI * 1.5 + 0.4) * this.trackRadiusX,
            y: this.trackCenterY + Math.sin(Math.PI * 1.5 + 0.4) * this.trackRadiusY,
            lap: 0,
            lastCheckpointAngle: Math.PI * 1.5
        };
    }

    update(dt) {
        const delta = dt / 16; // rough normalization (~60 fps)

        // ──────────────── Player 1 ────────────────
        let p1Accel = 0;
        if (Input.isDown('KeyW')) p1Accel = 1;
        if (Input.isDown('KeyS')) p1Accel = -0.4;

        if (Input.isDown('KeyA')) this.p1.angle -= this.p1.turnSpeed * delta * (this.p1.speed + 1);
        if (Input.isDown('KeyD')) this.p1.angle += this.p1.turnSpeed * delta * (this.p1.speed + 1);

        this.p1.speed += p1Accel * this.p1.accel * delta;
        this.p1.speed *= 0.982; // strong drag but not instant stop

        this.p1.x += Math.cos(this.p1.angle) * this.p1.speed * delta;
        this.p1.y += Math.sin(this.p1.angle) * this.p1.speed * delta;

        this.updateLap(this.p1);

        // ──────────────── Player 2 or CPU ────────────────
        let p2Accel = 0;
        let p2Turn = 0;

        if (GameManager.isSinglePlayer) {
            // Very simple pursuit CPU — tries to follow player 1 angle loosely
            const angleDiff = this.angleDiff(this.p2.angle, this.p1.angle);
            p2Turn = angleDiff * 0.8;
            p2Accel = 0.9 + Math.sin(Date.now() * 0.002) * 0.12; // slight variation
        } else {
            if (Input.isDown('ArrowUp'))    p2Accel = 1;
            if (Input.isDown('ArrowDown'))  p2Accel = -0.4;
            if (Input.isDown('ArrowLeft'))  p2Turn = -1;
            if (Input.isDown('ArrowRight')) p2Turn = 1;
        }

        this.p2.angle += p2Turn * this.p2.turnSpeed * delta * (this.p2.speed + 1);
        this.p2.speed += p2Accel * this.p2.accel * delta;
        this.p2.speed *= 0.982;

        this.p2.x += Math.cos(this.p2.angle) * this.p2.speed * delta;
        this.p2.y += Math.sin(this.p2.angle) * this.p2.speed * delta;

        this.updateLap(this.p2);

        // Check win
        if (this.p1.lap >= this.lapsToWin) GameManager.gameOver(1);
        if (this.p2.lap >= this.lapsToWin) GameManager.gameOver(2);
    }

    angleDiff(a, b) {
        let diff = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
        return diff;
    }

    updateLap(player) {
        const angle = Math.atan2(player.y - this.trackCenterY, player.x - this.trackCenterX);
        let normAngle = (angle + Math.PI * 2) % (Math.PI * 2);

        if (player.lastCheckpointAngle > 5 && normAngle < 1) {
            player.lap++;
        }
        player.lastCheckpointAngle = normAngle;
    }

    render(ctx) {
        // Track (oval)
        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(this.trackCenterX, this.trackCenterY, this.trackRadiusX, this.trackRadiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Center line
        ctx.strokeStyle = Theme.accent;
        ctx.setLineDash([12, 20]);
        ctx.beginPath();
        ctx.ellipse(this.trackCenterX, this.trackCenterY, this.trackRadiusX - 20, this.trackRadiusY - 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Players
        ctx.fillStyle = Theme.p1;
        ctx.save();
        ctx.translate(this.p1.x, this.p1.y);
        ctx.rotate(this.p1.angle + Math.PI / 2);
        ctx.fillRect(-12, -20, 24, 40);
        ctx.restore();

        ctx.fillStyle = Theme.p2;
        ctx.save();
        ctx.translate(this.p2.x, this.p2.y);
        ctx.rotate(this.p2.angle + Math.PI / 2);
        ctx.fillRect(-12, -20, 24, 40);
        ctx.restore();

        // Lap counter
        ctx.fillStyle = Theme.fg;
        ctx.font = "22px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`P1 LAP ${this.p1.lap}/${this.lapsToWin}`, 20, 40);
        ctx.fillText(`P2 LAP ${this.p2.lap}/${this.lapsToWin}`, this.width - 180, 40);
    }
}

GameManager.registerGame(new HovercraftDrift());