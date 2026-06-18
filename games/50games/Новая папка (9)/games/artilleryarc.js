class ArtilleryArc extends GameBase {
    constructor() { super("Artillery Arc", "Hold to charge power. Parabolic shots."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        this.p1 = { x: 50, y: this.height - 30, w: 20, h: 30, charge: 0, dCharge: 1 };
        this.p2 = { x: this.width - 70, y: this.height - 30, w: 20, h: 30, charge: 0, dCharge: 1 };
        this.arrows =[];
    }
    update(dt) {
        let maxPower = 25;
        
        let handlePlayer = (p, action, dir, isAI) => {
            if (!isAI && Input.isDown(action)) {
                p.charge += p.dCharge * 0.4;
                if (p.charge >= maxPower || p.charge <= 0) p.dCharge *= -1;
            } else if (!isAI && p.charge > 0) {
                this.arrows.push({ x: p.x + p.w/2, y: p.y, vx: dir * p.charge, vy: -p.charge, owner: dir });
                p.charge = 0;
            }
        };

        handlePlayer(this.p1, 'Space', 1, false);

        if (GameManager.isSinglePlayer) {
            // AI logic: charge until a random threshold based on distance
            if (this.p2.charge === 0 && Math.random() < 0.02) {
                this.p2.targetPower = 10 + Math.random() * 15;
                this.p2.charge = 0.1;
            } else if (this.p2.charge > 0) {
                this.p2.charge += this.p2.dCharge * 0.4;
                if (this.p2.charge >= this.p2.targetPower) {
                    this.arrows.push({ x: this.p2.x + this.p2.w/2, y: this.p2.y, vx: -1 * this.p2.charge, vy: -this.p2.charge, owner: -1 });
                    this.p2.charge = 0;
                }
            }
        } else {
            handlePlayer(this.p2, 'Enter', -1, false);
        }

        // Arrows
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            let a = this.arrows[i];
            a.vy += 0.5; // gravity
            a.x += a.vx; a.y += a.vy;

            if (a.y > this.height) { this.arrows.splice(i, 1); continue; }

            let checkHit = (p) => {
                return a.x > p.x && a.x < p.x + p.w && a.y > p.y && a.y < p.y + p.h;
            };

            if (a.owner === -1 && checkHit(this.p1)) {
                this.scoreP2++; if (this.scoreP2 >= 3) GameManager.gameOver(2); else this.resetRound(); break;
            }
            if (a.owner === 1 && checkHit(this.p2)) {
                this.scoreP1++; if (this.scoreP1 >= 3) GameManager.gameOver(1); else this.resetRound(); break;
            }
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = Theme.p1; ctx.fillRect(this.p1.x, this.p1.y, this.p1.w, this.p1.h);
        ctx.fillRect(this.p1.x, this.p1.y - 10, this.p1.charge * 2, 5);

        ctx.fillStyle = Theme.p2; ctx.fillRect(this.p2.x, this.p2.y, this.p2.w, this.p2.h);
        ctx.fillRect(this.p2.x - this.p2.charge*2 + this.p2.w, this.p2.y - 10, this.p2.charge * 2, 5);

        ctx.fillStyle = Theme.accent;
        this.arrows.forEach(a => {
            ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI*2); ctx.fill();
        });
    }
}
GameManager.registerGame(new ArtilleryArc());