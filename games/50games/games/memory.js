class MemoryMatch extends GameBase {
    constructor() {
        super("Memory", "Match pairs fastest — most matches wins the board.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.symbols = ['★', '●', '▲', '■', '♦', '♥', '✦', '◆'];
        this.resetRound();
    }

    resetRound() {
        const deck = [...this.symbols, ...this.symbols];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        this.cards = deck.map(val => ({
            val, flipped: false, matched: false, owner: 0
        }));
        this.cols = 4;
        this.rows = 4;
        this.cs = Math.min(86, Math.floor((this.width - 80) / 4), Math.floor((this.height - 140) / 4));
        this.ox = this.width / 2 - (this.cols * this.cs) / 2;
        this.oy = this.height / 2 - (this.rows * this.cs) / 2 + 10;

        this.p1 = { x: 0, y: 0, moveCd: 0, actCd: 0, sel1: -1, flipT: 0, matches: 0, actHeld: false };
        this.p2 = { x: 3, y: 3, moveCd: 0, actCd: 0, sel1: -1, flipT: 0, matches: 0, actHeld: false };
        this.roundMsg = '';
        this.roundPause = 0;
        this.cpuThink = 0.5;
        this.cpuMemory = {}; // val -> indices seen
        this.matchFlash = 0;
    }

    finishBoard() {
        const m1 = this.p1.matches;
        const m2 = this.p2.matches;
        if (m1 > m2) {
            this.scoreP1++;
            this.roundMsg = 'P1 WINS BOARD!';
            AudioManager.correct();
        } else if (m2 > m1) {
            this.scoreP2++;
            this.roundMsg = GameManager.isSinglePlayer ? 'CPU WINS BOARD!' : 'P2 WINS BOARD!';
            AudioManager.correct();
        } else {
            this.roundMsg = 'BOARD TIE!';
            AudioManager.tick();
        }
        this.roundPause = 1.4;
    }

    flipCard(p, id) {
        const idx = p.y * this.cols + p.x;
        const c = this.cards[idx];
        if (c.flipped || c.matched || p.flipT > 0) return;

        c.flipped = true;
        c.owner = id;
        AudioManager.tick();

        // Memory for CPU of revealed cards
        if (!this.cpuMemory[c.val]) this.cpuMemory[c.val] = [];
        if (!this.cpuMemory[c.val].includes(idx)) this.cpuMemory[c.val].push(idx);

        if (p.sel1 === -1) {
            p.sel1 = idx;
        } else {
            const first = this.cards[p.sel1];
            if (first.val === c.val) {
                first.matched = true;
                c.matched = true;
                p.matches++;
                p.sel1 = -1;
                this.matchFlash = 0.35;
                AudioManager.correct();
                // Clear memory entry
                delete this.cpuMemory[c.val];
            } else {
                p.flipT = 0.75;
                AudioManager.wrong();
            }
            p.actCd = 0.2;
        }
    }

    updatePlayer(p, up, down, left, right, action, id, dt) {
        if (p.flipT > 0) {
            p.flipT -= dt;
            if (p.flipT <= 0) {
                this.cards.forEach(c => {
                    if (!c.matched && c.owner === id) {
                        c.flipped = false;
                        c.owner = 0;
                    }
                });
                p.sel1 = -1;
            }
            return;
        }

        p.moveCd = Math.max(0, p.moveCd - dt);
        p.actCd = Math.max(0, p.actCd - dt);

        if (p.moveCd <= 0) {
            let moved = false;
            if (Input.isDown(up) && p.y > 0) { p.y--; moved = true; }
            else if (Input.isDown(down) && p.y < this.rows - 1) { p.y++; moved = true; }
            else if (Input.isDown(left) && p.x > 0) { p.x--; moved = true; }
            else if (Input.isDown(right) && p.x < this.cols - 1) { p.x++; moved = true; }
            if (moved) {
                p.moveCd = 0.14;
                AudioManager.move();
            }
        }

        const actDown = Input.isDown(action);
        if (actDown && !p.actHeld && p.actCd <= 0) {
            this.flipCard(p, id);
        }
        p.actHeld = actDown;
    }

    updateCpu(dt) {
        const p = this.p2;
        if (p.flipT > 0) {
            p.flipT -= dt;
            if (p.flipT <= 0) {
                this.cards.forEach(c => {
                    if (!c.matched && c.owner === 2) {
                        c.flipped = false;
                        c.owner = 0;
                    }
                });
                p.sel1 = -1;
            }
            return;
        }

        this.cpuThink -= dt;
        if (this.cpuThink > 0) return;

        // Pick a target index
        let target = -1;
        // Known pair in memory?
        for (const val of Object.keys(this.cpuMemory)) {
            const list = this.cpuMemory[val].filter(i => !this.cards[i].matched);
            if (list.length >= 2) {
                // Sometimes forget
                if (Math.random() < 0.7) {
                    target = p.sel1 === list[0] ? list[1] : list[0];
                    if (p.sel1 === -1) target = list[0];
                }
                break;
            }
        }

        // If second pick and we know the match
        if (target < 0 && p.sel1 >= 0) {
            const need = this.cards[p.sel1].val;
            const known = (this.cpuMemory[need] || []).filter(i => i !== p.sel1 && !this.cards[i].matched);
            if (known.length && Math.random() < 0.65) target = known[0];
        }

        if (target < 0) {
            const free = [];
            for (let i = 0; i < this.cards.length; i++) {
                if (!this.cards[i].flipped && !this.cards[i].matched) free.push(i);
            }
            if (free.length === 0) return;
            target = free[Math.floor(Math.random() * free.length)];
        }

        const tx = target % this.cols;
        const ty = Math.floor(target / this.cols);

        // Move cursor one step toward target
        if (p.x !== tx || p.y !== ty) {
            if (p.x < tx) p.x++;
            else if (p.x > tx) p.x--;
            else if (p.y < ty) p.y++;
            else if (p.y > ty) p.y--;
            this.cpuThink = 0.12 + Math.random() * 0.1;
            return;
        }

        this.flipCard(p, 2);
        this.cpuThink = 0.35 + Math.random() * 0.45;
    }

    update(dt) {
        if (this.roundPause > 0) {
            this.roundPause -= dt;
            if (this.roundPause <= 0) {
                if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
                    GameManager.gameOver(this.scoreP1 >= 3 ? 1 : 2);
                } else {
                    this.resetRound();
                }
            }
            return;
        }

        if (this.matchFlash > 0) this.matchFlash -= dt;

        this.updatePlayer(this.p1, 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 1, dt);

        if (GameManager.isSinglePlayer) {
            this.updateCpu(dt);
        } else {
            this.updatePlayer(this.p2, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 2, dt);
        }

        if (this.cards.every(c => c.matched)) {
            this.finishBoard();
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Boards ${this.scoreP1} — ${this.scoreP2}  |  Matches ${this.p1.matches} — ${this.p2.matches}`,
            this.width / 2, 28
        );
        ctx.font = '13px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('WASD / Arrows move · Space / Enter flip · first to 3 boards', this.width / 2, 50);

        for (let i = 0; i < this.cards.length; i++) {
            const x = this.ox + (i % this.cols) * this.cs;
            const y = this.oy + Math.floor(i / this.cols) * this.cs;
            const c = this.cards[i];
            const pad = 5;

            if (c.matched) {
                const col = c.owner === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(x + pad, y + pad, this.cs - pad * 2, this.cs - pad * 2);
                ctx.globalAlpha = 1;
                ctx.fillStyle = Theme.fg;
                ctx.font = `bold ${Math.floor(this.cs * 0.4)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.val, x + this.cs / 2, y + this.cs / 2);
            } else if (c.flipped) {
                ctx.fillStyle = Theme.fg;
                ctx.fillRect(x + pad, y + pad, this.cs - pad * 2, this.cs - pad * 2);
                ctx.fillStyle = c.owner === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
                ctx.font = `bold ${Math.floor(this.cs * 0.42)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.val, x + this.cs / 2, y + this.cs / 2);
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.fillRect(x + pad, y + pad, this.cs - pad * 2, this.cs - pad * 2);
                ctx.strokeStyle = Theme.fg;
                ctx.lineWidth = 2;
                ctx.strokeRect(x + pad, y + pad, this.cs - pad * 2, this.cs - pad * 2);
                ctx.fillStyle = Theme.accent;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x + this.cs / 2, y + this.cs / 2);
            }
        }

        // Cursors
        ctx.strokeStyle = Theme.p1;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.ox + this.p1.x * this.cs + 2, this.oy + this.p1.y * this.cs + 2, this.cs - 4, this.cs - 4);
        ctx.fillStyle = Theme.p1;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('P1', this.ox + this.p1.x * this.cs + 6, this.oy + this.p1.y * this.cs + 14);

        ctx.strokeStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.ox + this.p2.x * this.cs + 6, this.oy + this.p2.y * this.cs + 6, this.cs - 12, this.cs - 12);
        ctx.fillStyle = GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2;
        ctx.fillText(GameManager.isSinglePlayer ? 'CPU' : 'P2',
            this.ox + this.p2.x * this.cs + 10, this.oy + this.p2.y * this.cs + this.cs - 8);

        if (this.matchFlash > 0) {
            ctx.fillStyle = `rgba(255,230,0,${this.matchFlash * 0.25})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.roundPause > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(this.roundMsg, this.width / 2, this.height / 2);
            ctx.font = '18px Arial';
            ctx.fillStyle = Theme.fg;
            ctx.fillText(`${this.p1.matches} — ${this.p2.matches} matches`, this.width / 2, this.height / 2 + 36);
        }
    }
}

GameManager.registerGame(new MemoryMatch());
