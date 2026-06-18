// games/cratestacker.js
class CrateStacker extends GameBase {
    constructor() {
        super("Crate Stacker", "Build the tallest stable tower — highest wins round.");
        this.reset();
    }

    reset() {
        this.crates = [];
        this.players = [
            { x: 280, score: 0, color: Theme.p1 },
            { x: 520, score: 0, color: Theme.p2 }
        ];
        this.fallingCrate = null;
        this.timeSinceDrop = 0;
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.gameActive = true;
    }

    init(w, h) {
        super.init(w, h);
        this.reset();
    }

    update(dt) {
        if (!this.gameActive) return;

        this.timeSinceDrop += dt;

        // drop new crate every ~3.5–5 seconds
        if (!this.fallingCrate && this.timeSinceDrop > 3.2 + Math.random() * 1.8) {
            this.fallingCrate = {
                x: Math.random() * (this.width - 120) + 60,
                y: -80,
                size: 70 + Math.random() * 40,
                rot: Math.random() * 0.4 - 0.2,
                rotSpeed: (Math.random() - 0.5) * 1.8
            };
            this.timeSinceDrop = 0;
        }

        if (this.fallingCrate) {
            this.fallingCrate.y += 220 * dt;
            this.fallingCrate.rot += this.fallingCrate.rotSpeed * dt;

            // land on top crate or ground
            let landed = false;
            let topY = this.height - 60;

            for (let c of this.crates) {
                if (Math.abs(c.x - this.fallingCrate.x) < (c.size + this.fallingCrate.size) / 2 - 20 &&
                    c.y < topY) {
                    topY = c.y - c.size / 2 - 4;
                }
            }

            if (this.fallingCrate.y + this.fallingCrate.size / 2 > topY) {
                this.fallingCrate.y = topY - this.fallingCrate.size / 2;
                this.fallingCrate.rotSpeed *= 0.2;
                this.crates.push(this.fallingCrate);
                this.fallingCrate = null;

                // check stability / collapse (very simple)
                if (Math.random() < 0.07 && this.crates.length > 5) {
                    this.crates.pop();
                }
            }
        }

        // player input — move left/right
        for (let i = 0; i < 2; i++) {
            let p = this.players[i];
            let left = i === 0 ? 'KeyA' : 'ArrowLeft';
            let right = i === 0 ? 'KeyD' : 'ArrowRight';

            let speed = 180;
            if (Input.isDown(left)) p.x -= speed * dt;
            if (Input.isDown(right)) p.x += speed * dt;

            p.x = Math.max(60, Math.min(this.width - 60, p.x));

            // CPU very basic — tries to stay under falling crate
            if (GameManager.isSinglePlayer && i === 1 && this.fallingCrate) {
                let target = this.fallingCrate.x;
                if (Math.abs(p.x - target) > 30) {
                    p.x += Math.sign(target - p.x) * 140 * dt;
                }
            }
        }

        // score = tallest stack height
        let maxHeight = 0;
        this.crates.forEach(c => {
            let h = this.height - (c.y - c.size / 2);
            if (h > maxHeight) maxHeight = h;
        });

        if (maxHeight > 480) {
            // very tall — end round
            let p1height = this.players[0].x < this.width / 2 ? maxHeight : 0;
            let p2height = this.players[1].x < this.width / 2 ? maxHeight : 0;

            if (p1height > p2height + 40) {
                this.scoreP1++;
                GameManager.gameOver(1);
            } else if (p2height > p1height + 40) {
                this.scoreP2++;
                GameManager.gameOver(2);
            } else if (maxHeight > 620) {
                GameManager.gameOver(0); // close enough = draw
            }
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // crates
        ctx.lineWidth = 5;
        for (let c of this.crates) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot);
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(-c.size/2, -c.size/2, c.size, c.size);
            ctx.strokeStyle = Theme.accent;
            ctx.strokeRect(-c.size/2, -c.size/2, c.size, c.size);
            ctx.restore();
        }

        if (this.fallingCrate) {
            ctx.save();
            ctx.translate(this.fallingCrate.x, this.fallingCrate.y);
            ctx.rotate(this.fallingCrate.rot);
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(-this.fallingCrate.size/2, -this.fallingCrate.size/2, this.fallingCrate.size, this.fallingCrate.size);
            ctx.restore();
        }

        // player indicators (arrows at bottom)
        for (let p of this.players) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(p.x - 30, this.height - 20);
            ctx.lineTo(p.x + 30, this.height - 20);
            ctx.lineTo(p.x, this.height - 70);
            ctx.closePath();
            ctx.fill();
        }
    }
}

GameManager.registerGame(new CrateStacker());