class CaptureTheFlag extends GameBase {
    constructor() {
        super("Capture The Flag", "Grab the flag and reach your base! First to 3.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }

    resetRound() {
        this.p1 = { x: 70, y: this.height / 2, s: 18 };
        this.p2 = { x: this.width - 70, y: this.height / 2, s: 18 };
        this.flag = { x: this.width / 2, y: this.height / 2, holder: 0, dropX: 0, dropY: 0 };
        this.roundPause = 0;
        this.scoreFlash = '';
    }

    clampPlayer(p) {
        p.x = Math.max(p.s + 10, Math.min(this.width - p.s - 10, p.x));
        p.y = Math.max(p.s + 10, Math.min(this.height - p.s - 10, p.y));
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            return;
        }

        const speed = 200 * dt;
        const p1Spd = this.flag.holder === 1 ? speed * 0.75 : speed;
        const p2Spd = this.flag.holder === 2 ? speed * 0.75 : speed;

        if (Input.isDown('KeyW')) this.p1.y -= p1Spd;
        if (Input.isDown('KeyS')) this.p1.y += p1Spd;
        if (Input.isDown('KeyA')) this.p1.x -= p1Spd;
        if (Input.isDown('KeyD')) this.p1.x += p1Spd;

        if (GameManager.isSinglePlayer) {
            let tx, ty;
            if (this.flag.holder === 0) {
                tx = this.flag.x;
                ty = this.flag.y;
            } else if (this.flag.holder === 1) {
                tx = this.p1.x;
                ty = this.p1.y;
            } else {
                tx = this.width - 60;
                ty = this.height / 2;
            }
            const dx = tx - this.p2.x;
            const dy = ty - this.p2.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.p2.x += (dx / dist) * p2Spd;
            this.p2.y += (dy / dist) * p2Spd;
        } else {
            if (Input.isDown('ArrowUp')) this.p2.y -= p2Spd;
            if (Input.isDown('ArrowDown')) this.p2.y += p2Spd;
            if (Input.isDown('ArrowLeft')) this.p2.x -= p2Spd;
            if (Input.isDown('ArrowRight')) this.p2.x += p2Spd;
        }

        this.clampPlayer(this.p1);
        this.clampPlayer(this.p2);

        if (this.flag.holder === 0) {
            if (Math.hypot(this.p1.x - this.flag.x, this.p1.y - this.flag.y) < this.p1.s + 14) {
                this.flag.holder = 1;
                AudioManager.select();
            } else if (Math.hypot(this.p2.x - this.flag.x, this.p2.y - this.flag.y) < this.p2.s + 14) {
                this.flag.holder = 2;
                AudioManager.select();
            }
        } else if (Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y) < this.p1.s + this.p2.s + 4) {
            this.flag.dropX = (this.p1.x + this.p2.x) / 2;
            this.flag.dropY = (this.p1.y + this.p2.y) / 2;
            this.flag.x = this.flag.dropX;
            this.flag.y = this.flag.dropY;
            this.flag.holder = 0;
            AudioManager.wrong();
            const push = 40;
            const dx = this.p2.x - this.p1.x;
            const dy = this.p2.y - this.p1.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.p1.x -= (dx / dist) * push;
            this.p1.y -= (dy / dist) * push;
            this.p2.x += (dx / dist) * push;
            this.p2.y += (dy / dist) * push;
        }

        if (this.flag.holder === 1) {
            this.flag.x = this.p1.x;
            this.flag.y = this.p1.y - 24;
        } else if (this.flag.holder === 2) {
            this.flag.x = this.p2.x;
            this.flag.y = this.p2.y - 24;
        }

        if (this.flag.holder === 1 && this.p1.x < 90) {
            this.scoreP1++;
            this.scoreFlash = 'P1 SCORES!';
            AudioManager.correct();
            if (this.scoreP1 >= 3) GameManager.gameOver(1);
            else { this.resetRound(); this.roundPause = 1; }
        } else if (this.flag.holder === 2 && this.p2.x > this.width - 90) {
            this.scoreP2++;
            this.scoreFlash = GameManager.isSinglePlayer ? 'CPU SCORES!' : 'P2 SCORES!';
            AudioManager.correct();
            if (this.scoreP2 >= 3) GameManager.gameOver(2);
            else { this.resetRound(); this.roundPause = 1; }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#1e2a1e';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = 'rgba(255,42,84,0.2)';
        ctx.fillRect(0, 0, 90, this.height);
        ctx.fillStyle = 'rgba(0,229,155,0.2)';
        ctx.fillRect(this.width - 90, 0, 90, this.height);

        ctx.fillStyle = Theme.p1;
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("P1 BASE", 45, 40);
        ctx.fillStyle = Theme.p2;
        ctx.fillText(GameManager.isSinglePlayer ? "CPU BASE" : "P2 BASE", this.width - 45, 40);

        const p2Color = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillStyle = Theme.p1;
        ctx.beginPath();
        ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p2Color;
        ctx.beginPath();
        ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI * 2);
        ctx.fill();

        if (this.flag.holder === 0) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.flag.x - 3, this.flag.y - 20, 6, 40);
            ctx.fillStyle = Theme.accent;
            ctx.beginPath();
            ctx.moveTo(this.flag.x + 3, this.flag.y - 20);
            ctx.lineTo(this.flag.x + 28, this.flag.y - 10);
            ctx.lineTo(this.flag.x + 3, this.flag.y);
            ctx.fill();
        } else {
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 22px Arial";
            ctx.fillText("⚑", this.flag.x, this.flag.y);
        }

        if (this.roundPause > 0 && this.scoreFlash) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = "bold 40px Impact";
            ctx.fillText(this.scoreFlash, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = "14px Arial";
        ctx.fillText("Tackle rival to drop flag!", this.width / 2, this.height - 18);
    }
}

GameManager.registerGame(new CaptureTheFlag());
