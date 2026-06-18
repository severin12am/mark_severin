class RelicChase extends GameBase {
    constructor() { super("Relic Chase", "Hold the relic to gain points! First to 500."); }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0; // Overriding to strictly time-based
        this.scoreP2 = 0;
        this.p1 = { x: 100, y: h / 2, r: 20, hasRelic: false, stun: 0 };
        this.p2 = { x: w - 100, y: h / 2, r: 20, hasRelic: false, stun: 0 };
        this.relic = { x: w / 2, y: h / 2, r: 15, heldBy: 0 };
    }

    update(dt) {
        let delta = dt > 0.5 ? dt / 1000 : dt;
        const speed = 250;

        // Cooldowns
        if (this.p1.stun > 0) this.p1.stun -= delta;
        if (this.p2.stun > 0) this.p2.stun -= delta;

        // P1 Input
        if (this.p1.stun <= 0) {
            if (Input.isDown('KeyW')) this.p1.y -= speed * delta;
            if (Input.isDown('KeyS')) this.p1.y += speed * delta;
            if (Input.isDown('KeyA')) this.p1.x -= speed * delta;
            if (Input.isDown('KeyD')) this.p1.x += speed * delta;
        }

        // P2 Input / AI
        if (this.p2.stun <= 0) {
            if (GameManager.isSinglePlayer) {
                // AI Logic: Chase relic if free, chase P1 if P1 has it, run if P2 has it
                let targetX = this.relic.x, targetY = this.relic.y;
                if (this.p1.hasRelic) { targetX = this.p1.x; targetY = this.p1.y; }
                else if (this.p2.hasRelic) { targetX = this.width / 2 + (this.p2.x < this.width/2 ? 100 : -100); }
                
                if (this.p2.x < targetX) this.p2.x += speed * delta;
                if (this.p2.x > targetX) this.p2.x -= speed * delta;
                if (this.p2.y < targetY) this.p2.y += speed * delta;
                if (this.p2.y > targetY) this.p2.y -= speed * delta;
            } else {
                if (Input.isDown('ArrowUp')) this.p2.y -= speed * delta;
                if (Input.isDown('ArrowDown')) this.p2.y += speed * delta;
                if (Input.isDown('ArrowLeft')) this.p2.x -= speed * delta;
                if (Input.isDown('ArrowRight')) this.p2.x += speed * delta;
            }
        }

        // Constrain to map
        [this.p1, this.p2].forEach(p => {
            if (p.x < p.r) p.x = p.r; if (p.x > this.width - p.r) p.x = this.width - p.r;
            if (p.y < p.r) p.y = p.r; if (p.y > this.height - p.r) p.y = this.height - p.r;
        });

        // Relic Grab & Steal Math
        let distP1 = Math.hypot(this.p1.x - this.relic.x, this.p1.y - this.relic.y);
        let distP2 = Math.hypot(this.p2.x - this.relic.x, this.p2.y - this.relic.y);
        let pDist = Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y);

        if (this.relic.heldBy === 0) {
            if (distP1 < this.p1.r + this.relic.r) { this.p1.hasRelic = true; this.relic.heldBy = 1; }
            else if (distP2 < this.p2.r + this.relic.r) { this.p2.hasRelic = true; this.relic.heldBy = 2; }
        }

        // Steal Logic
        if (pDist < this.p1.r + this.p2.r) {
            if (this.p1.hasRelic) {
                this.p1.hasRelic = false; this.p2.hasRelic = true; this.relic.heldBy = 2; this.p1.stun = 1.0;
                this.p1.x -= 30; // Knockback
            } else if (this.p2.hasRelic) {
                this.p2.hasRelic = false; this.p1.hasRelic = true; this.relic.heldBy = 1; this.p2.stun = 1.0;
                this.p2.x += 30; // Knockback
            }
        }

        // Score ticking
        if (this.p1.hasRelic) {
            this.relic.x = this.p1.x; this.relic.y = this.p1.y - 10;
            this.scoreP1 += 1;
        } else if (this.p2.hasRelic) {
            this.relic.x = this.p2.x; this.relic.y = this.p2.y - 10;
            this.scoreP2 += 1;
        }

        // Win Condition
        if (this.scoreP1 >= 500) GameManager.gameOver(1);
        if (this.scoreP2 >= 500) GameManager.gameOver(2);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Score Bars
        ctx.fillStyle = Theme.p1; ctx.fillRect(0, 0, (this.scoreP1 / 500) * this.width, 10);
        ctx.fillStyle = Theme.p2; ctx.fillRect(0, 10, (this.scoreP2 / 500) * this.width, 10);

        // Draw Players
        [ { p: this.p1, c: Theme.p1 }, { p: this.p2, c: Theme.p2 } ].forEach(obj => {
            ctx.fillStyle = obj.c;
            ctx.beginPath();
            ctx.arc(obj.p.x, obj.p.y, obj.p.r, 0, Math.PI * 2);
            ctx.fill();
            if (obj.p.stun > 0) {
                ctx.strokeStyle = Theme.fg;
                ctx.lineWidth = 3;
                ctx.stroke(); // Stun indicator
            }
        });

        // Draw Relic
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.relic.x, this.relic.y, this.relic.r, 0, Math.PI * 2);
        ctx.fill();
    }
}
GameManager.registerGame(new RelicChase());