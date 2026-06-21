class Darts extends GameBase {
    constructor() {
        super("Darts", "Lock horizontal, then vertical aim! First to 150.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.keys = {};
        this.resetTurns();
    }

    justPressed(code) {
        const down = Input.isDown(code);
        const was = this.keys[code];
        this.keys[code] = down;
        return down && !was;
    }

    resetTurns() {
        this.p1 = { cx: this.width * 0.28, cy: this.height * 0.48, phase: 'h', hPos: 0, vPos: 0, darts: [] };
        this.p2 = { cx: this.width * 0.72, cy: this.height * 0.48, phase: 'h', hPos: 0, vPos: 0, darts: [] };
        this.time = 0;
        this.turn = 1;
        this.popup = null;
    }

    scoreAt(board, x, y) {
        const dist = Math.hypot(board.cx - x, board.cy - y);
        if (dist < 12) return 50;
        if (dist < 35) return 25;
        if (dist < 70) return 10;
        return 0;
    }

    throwDart(player) {
        const board = player === 1 ? this.p1 : this.p2;
        const hx = board.cx + Math.sin(board.hPos) * 95;
        const vy = board.cy + Math.cos(board.vPos) * 95;
        const pts = this.scoreAt(board, hx, vy);
        board.darts.push({ x: hx, y: vy, pts });
        if (player === 1) this.scoreP1 += pts;
        else this.scoreP2 += pts;
        this.popup = { x: hx, y: vy - 20, text: pts > 0 ? `+${pts}` : 'MISS', life: 0.8, player };
        if (pts >= 25) AudioManager.correct();
        else if (pts > 0) AudioManager.tick();
        else AudioManager.wrong();
        board.phase = 'h';
        board.hPos = 0;
        board.vPos = 0;
        this.turn = 3 - this.turn;
        if (this.scoreP1 >= 150) GameManager.gameOver(1);
        if (this.scoreP2 >= 150) GameManager.gameOver(2);
    }

    updatePlayer(board, fireKey, isCpu, dt) {
        if (this.turn !== (board === this.p1 ? 1 : 2)) return;

        if (board.phase === 'h') {
            board.hPos += 0.055;
            if (isCpu) {
                this.cpuTimer = (this.cpuTimer || 0) - dt;
                if (this.cpuTimer <= 0 && Math.abs(Math.sin(board.hPos)) < 0.15) {
                    board.phase = 'v';
                    this.cpuTimer = 0.35;
                }
            } else if (this.justPressed(fireKey)) {
                board.phase = 'v';
                AudioManager.move();
            }
        } else {
            board.vPos += 0.06;
            if (isCpu) {
                this.cpuTimer -= dt;
                if (this.cpuTimer <= 0 && Math.abs(Math.cos(board.vPos)) < 0.12) {
                    this.throwDart(board === this.p1 ? 1 : 2);
                    this.cpuTimer = 0.45;
                }
            } else if (this.justPressed(fireKey)) {
                this.throwDart(board === this.p1 ? 1 : 2);
            }
        }
    }

    update(dt) {
        this.time += dt;
        if (this.popup) {
            this.popup.life -= dt;
            if (this.popup.life <= 0) this.popup = null;
        }

        this.updatePlayer(this.p1, 'Space', false, dt);
        this.updatePlayer(this.p2, 'Enter', GameManager.isSinglePlayer, dt);
    }

    drawBoard(ctx, board, color, label) {
        const { cx, cy } = board;

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 2;
        [78, 52, 28].forEach(r => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();

        board.darts.forEach(d => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        const hx = cx + Math.sin(board.hPos) * 95;
        const vy = cy + Math.cos(board.vPos) * 95;

        if (board.phase === 'h' || board.phase === 'v') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            if (board.phase === 'h') {
                ctx.beginPath();
                ctx.moveTo(cx - 100, cy);
                ctx.lineTo(cx + 100, cy);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(hx, cy, 14, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(hx, cy - 100);
                ctx.lineTo(hx, cy + 100);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(hx, vy, 14, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, cy + 105);
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.scoreP1}  —  ${this.scoreP2}   (first to 150)`, this.width / 2, 32);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Tap SPACE / ENTER twice — lock horizontal aim, then vertical', this.width / 2, 54);

        this.drawBoard(ctx, this.p1, Theme.p1, this.turn === 1 ? 'P1 THROW' : 'P1');
        this.drawBoard(ctx, this.p2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2,
            this.turn === 2 ? (GameManager.isSinglePlayer ? 'CPU THROW' : 'P2 THROW') : (GameManager.isSinglePlayer ? 'CPU' : 'P2'));

        if (this.popup) {
            ctx.globalAlpha = this.popup.life;
            ctx.fillStyle = this.popup.player === 1 ? Theme.p1 : (GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);
            ctx.font = 'bold 24px Impact';
            ctx.textAlign = 'center';
            ctx.fillText(this.popup.text, this.popup.x, this.popup.y);
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('Bullseye 50 · Inner 25 · Outer 10', this.width / 2, this.height - 14);
    }
}

GameManager.registerGame(new Darts());
