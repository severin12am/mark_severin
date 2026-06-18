class MemoryMatch extends GameBase {
    constructor() { super("Memory", "Match the pairs fastest."); }
    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.resetRound();
    }
    resetRound() {
        let types = ['A','B','C','D','E','F','G','H'];
        let deck = [...types, ...types];
        deck.sort(() => Math.random() - 0.5);
        
        this.cards =[];
        for(let i=0; i<16; i++) {
            this.cards.push({ val: deck[i], flipped: false, matched: false });
        }
        
        this.p1 = { x: 0, y: 0, cd: 0, sel1: -1, timer: 0 };
        this.p2 = { x: 3, y: 3, cd: 0, sel1: -1, timer: 0 };
        this.cols = 4; this.cs = 80;
        this.ox = this.width/2 - (this.cols*this.cs)/2;
        this.oy = this.height/2 - (this.cols*this.cs)/2;
    }
    update(dt) {
        let moveDelay = 10;
        
        let handlePlayer = (p, w, s, a, d, action, id) => {
            if (p.timer > 0) {
                p.timer--;
                if (p.timer === 0) { // reset flip
                    this.cards.forEach(c => { if(!c.matched && c.owner === id) { c.flipped = false; c.owner = 0; } });
                    p.sel1 = -1;
                }
                return;
            }

            if (p.cd > 0) p.cd--;
            if (p.cd <= 0) {
                if (Input.isDown(w) && p.y > 0) { p.y--; p.cd = moveDelay; }
                else if (Input.isDown(s) && p.y < 3) { p.y++; p.cd = moveDelay; }
                else if (Input.isDown(a) && p.x > 0) { p.x--; p.cd = moveDelay; }
                else if (Input.isDown(d) && p.x < 3) { p.x++; p.cd = moveDelay; }
                else if (Input.isDown(action)) {
                    let idx = p.y * 4 + p.x;
                    let c = this.cards[idx];
                    if (!c.flipped && !c.matched) {
                        c.flipped = true; c.owner = id;
                        if (p.sel1 === -1) {
                            p.sel1 = idx;
                        } else {
                            if (this.cards[p.sel1].val === c.val) {
                                this.cards[p.sel1].matched = true; c.matched = true;
                                if (id === 1) this.scoreP1++; else this.scoreP2++;
                                p.sel1 = -1;
                            } else {
                                p.timer = 60; // wait 1 sec then hide
                            }
                        }
                        p.cd = 20;
                    }
                }
            }
        };

        handlePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 1);

        if (GameManager.isSinglePlayer) {
            if (this.p2.timer > 0) {
                this.p2.timer--;
                if (this.p2.timer === 0) {
                    this.cards.forEach(c => { if(!c.matched && c.owner === 2) { c.flipped = false; c.owner = 0; } });
                    this.p2.sel1 = -1;
                }
            } else if (this.p2.cd <= 0) {
                let unflipped =[];
                for (let i=0; i<16; i++) if (!this.cards[i].flipped && !this.cards[i].matched) unflipped.push(i);
                
                if (unflipped.length > 0 && Math.random() < 0.05) {
                    let idx = unflipped[Math.floor(Math.random()*unflipped.length)];
                    this.p2.x = idx % 4; this.p2.y = Math.floor(idx / 4);
                    let c = this.cards[idx];
                    c.flipped = true; c.owner = 2;
                    if (this.p2.sel1 === -1) this.p2.sel1 = idx;
                    else {
                        if (this.cards[this.p2.sel1].val === c.val) {
                            this.cards[this.p2.sel1].matched = true; c.matched = true;
                            this.scoreP2++; this.p2.sel1 = -1;
                        } else { this.p2.timer = 60; }
                    }
                    this.p2.cd = 40;
                }
            }
        } else {
            handlePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 2);
        }

        let allMatched = this.cards.every(c => c.matched);
        if (allMatched) {
            if (this.scoreP1 > this.scoreP2) GameManager.gameOver(1);
            else if (this.scoreP2 > this.scoreP1) GameManager.gameOver(2);
            else GameManager.gameOver(0);
        }
    }
    render(ctx) {
        ctx.fillStyle = Theme.bg; ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.font = "30px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (let i=0; i<16; i++) {
            let x = this.ox + (i%4)*this.cs;
            let y = this.oy + Math.floor(i/4)*this.cs;
            let c = this.cards[i];
            
            if (c.matched) {
                ctx.fillStyle = Theme.accent; ctx.globalAlpha = 0.3;
                ctx.fillRect(x+5, y+5, this.cs-10, this.cs-10); ctx.globalAlpha = 1.0;
            } else if (c.flipped) {
                ctx.fillStyle = Theme.fg; ctx.fillRect(x+5, y+5, this.cs-10, this.cs-10);
                ctx.fillStyle = Theme.bg; ctx.fillText(c.val, x + this.cs/2, y + this.cs/2);
            } else {
                ctx.fillStyle = Theme.fg; ctx.globalAlpha = 0.5;
                ctx.fillRect(x+5, y+5, this.cs-10, this.cs-10); ctx.globalAlpha = 1.0;
            }
        }

        ctx.strokeStyle = Theme.p1; ctx.lineWidth = 3;
        ctx.strokeRect(this.ox + this.p1.x*this.cs + 2, this.oy + this.p1.y*this.cs + 2, this.cs-4, this.cs-4);
        
        ctx.strokeStyle = Theme.p2;
        ctx.strokeRect(this.ox + this.p2.x*this.cs + 8, this.oy + this.p2.y*this.cs + 8, this.cs-16, this.cs-16);
    }
}
GameManager.registerGame(new MemoryMatch());