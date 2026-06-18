class WhackAMole extends GameBase {
    constructor() { super("Whack-A-Mole", "Hover over the active mole and hit Action!"); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.moles =[
            { x: w/2, y: h/2 }, { x: w/4, y: h/4 }, { x: w*0.75, y: h/4 },
            { x: w/4, y: h*0.75 }, { x: w*0.75, y: h*0.75 }
        ];
        this.activeMole = -1;
        this.moleTimer = 0;
        this.p1 = { x: w/3, y: h/2, s: 15 };
        this.p2 = { x: w*0.6, y: h/2, s: 15 };
    }
    update(dt) {
        let speed = 7;

        let moveP = (p, w, s, a, d) => {
            if (Input.isDown(w)) p.y -= speed;
            if (Input.isDown(s)) p.y += speed;
            if (Input.isDown(a)) p.x -= speed;
            if (Input.isDown(d)) p.x += speed;
        };

        moveP(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD');

        if (GameManager.isSinglePlayer) {
            if (this.activeMole !== -1) {
                let target = this.moles[this.activeMole];
                if (this.p2.x < target.x) this.p2.x += speed * 0.8; else this.p2.x -= speed * 0.8;
                if (this.p2.y < target.y) this.p2.y += speed * 0.8; else this.p2.y -= speed * 0.8;
                
                if (Math.hypot(this.p2.x - target.x, this.p2.y - target.y) < 30 && Math.random() < 0.1) {
                    this.scoreP2++; this.activeMole = -1; this.moleTimer = 60;
                }
            }
        } else {
            moveP(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
        }

        if (this.moleTimer > 0) {
            this.moleTimer--;
        } else if (this.activeMole === -1) {
            this.activeMole = Math.floor(Math.random() * this.moles.length);
            this.moleTimer = 120; // 2 seconds to hit
        } else {
            this.activeMole = -1; // missed
            this.moleTimer = 30;
        }

        if (this.activeMole !== -1) {
            let m = this.moles[this.activeMole];
            if (Input.isDown('Space') && Math.hypot(this.p1.x - m.x, this.p1.y - m.y) < 40) {
                this.scoreP1++; this.activeMole = -1; this.moleTimer = 60;
            } else if (!GameManager.isSinglePlayer && Input.isDown('Enter') && Math.hypot(this.p2.x - m.x, this.p2.y - m.y) < 40) {
                this.scoreP2++; this.activeMole = -1; this.moleTimer = 60;
            }
        }

        if (this.scoreP1 >= 10) GameManager.gameOver(1);
        if (this.scoreP2 >= 10) GameManager.gameOver(2);
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        this.moles.forEach((m, i) => {
            ctx.fillStyle = (i === this.activeMole) ? Theme.accent : Theme.fg;
            ctx.beginPath(); ctx.arc(m.x, m.y, 30, 0, Math.PI*2); ctx.fill();
        });

        ctx.strokeStyle = Theme.p1; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(this.p1.x, this.p1.y, this.p1.s, 0, Math.PI*2); ctx.stroke();

        ctx.strokeStyle = Theme.p2;
        ctx.beginPath(); ctx.arc(this.p2.x, this.p2.y, this.p2.s, 0, Math.PI*2); ctx.stroke();
    }
}
GameManager.registerGame(new WhackAMole());