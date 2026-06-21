class GameSnakeBattle extends GameBase {
    constructor() {
        super("Snake Battle", "Eat apples, grow long! Don't crash. First to 8.");
    }

    init(w, h) {
        super.init(w, h);
        if (this.scoreP1 === undefined) { this.scoreP1 = 0; this.scoreP2 = 0; }
        this.grid = 24;
        this.cols = Math.floor((w - 40) / this.grid);
        this.rows = Math.floor((h - 100) / this.grid);
        this.ox = (w - this.cols * this.grid) / 2;
        this.oy = 80;
        this.startRound();
    }

    startRound() {
        this.moveTimer = 0;
        this.moveInterval = 0.11;
        this.snakeP1 = [{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }];
        this.snakeP2 = [{ x: this.cols - 5, y: this.rows - 5 }, { x: this.cols - 4, y: this.rows - 5 }];
        this.dirP1 = { x: 1, y: 0 };
        this.nextP1 = { x: 1, y: 0 };
        this.dirP2 = { x: -1, y: 0 };
        this.nextP2 = { x: -1, y: 0 };
        this.food = this.spawnFood();
        this.deadMsg = '';
        this.deadTimer = 0;
    }

    spawnFood() {
        for (let i = 0; i < 80; i++) {
            const f = {
                x: 1 + Math.floor(Math.random() * (this.cols - 2)),
                y: 1 + Math.floor(Math.random() * (this.rows - 2))
            };
            if (!this.occupies(f.x, f.y)) return f;
        }
        return { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) };
    }

    occupies(x, y) {
        return this.snakeP1.some(s => s.x === x && s.y === y) ||
            this.snakeP2.some(s => s.x === x && s.y === y);
    }

    setDir(next, cur, dx, dy) {
        if (dx === -cur.x && dy === -cur.y) return;
        next.x = dx;
        next.y = dy;
    }

    cpuDir() {
        const head = this.snakeP2[0];
        const dx = this.food.x - head.x;
        const dy = this.food.y - head.y;
        const opts = [];
        if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) opts.push({ x: Math.sign(dx), y: 0 });
        else if (dy !== 0) opts.push({ x: 0, y: Math.sign(dy) });
        if (Math.abs(dy) > Math.abs(dx) && dy !== 0) opts.push({ x: 0, y: Math.sign(dy) });
        else if (dx !== 0) opts.push({ x: Math.sign(dx), y: 0 });
        opts.push({ x: -this.dirP2.y, y: this.dirP2.x }, { x: this.dirP2.y, y: -this.dirP2.x });
        for (const o of opts) {
            if (o.x === -this.dirP2.x && o.y === -this.dirP2.y) continue;
            const nx = head.x + o.x;
            const ny = head.y + o.y;
            if (nx > 0 && nx < this.cols - 1 && ny > 0 && ny < this.rows - 1 &&
                !this.snakeP2.some(s => s.x === nx && s.y === ny) &&
                !this.snakeP1.some(s => s.x === nx && s.y === ny)) {
                return o;
            }
        }
        return { x: this.dirP2.x, y: this.dirP2.y };
    }

    crash(head, self, other) {
        if (head.x <= 0 || head.x >= this.cols - 1 || head.y <= 0 || head.y >= this.rows - 1) return true;
        if (self.some(s => s.x === head.x && s.y === head.y)) return true;
        if (other.some(s => s.x === head.x && s.y === head.y)) return true;
        return false;
    }

    update(dt) {
        if (this.deadTimer > 0) {
            this.deadTimer -= dt;
            if (this.deadTimer <= 0) {
                if (this.scoreP1 >= 8 || this.scoreP2 >= 8) {
                    GameManager.gameOver(this.scoreP1 >= 8 ? 1 : 2);
                } else {
                    this.startRound();
                }
            }
            return;
        }

        if (Input.isDown('KeyW') && this.dirP1.y === 0) this.setDir(this.nextP1, this.dirP1, 0, -1);
        if (Input.isDown('KeyS') && this.dirP1.y === 0) this.setDir(this.nextP1, this.dirP1, 0, 1);
        if (Input.isDown('KeyA') && this.dirP1.x === 0) this.setDir(this.nextP1, this.dirP1, -1, 0);
        if (Input.isDown('KeyD') && this.dirP1.x === 0) this.setDir(this.nextP1, this.dirP1, 1, 0);

        if (GameManager.isSinglePlayer) {
            const d = this.cpuDir();
            this.nextP2 = d;
        } else {
            if (Input.isDown('ArrowUp') && this.dirP2.y === 0) this.setDir(this.nextP2, this.dirP2, 0, -1);
            if (Input.isDown('ArrowDown') && this.dirP2.y === 0) this.setDir(this.nextP2, this.dirP2, 0, 1);
            if (Input.isDown('ArrowLeft') && this.dirP2.x === 0) this.setDir(this.nextP2, this.dirP2, -1, 0);
            if (Input.isDown('ArrowRight') && this.dirP2.x === 0) this.setDir(this.nextP2, this.dirP2, 1, 0);
        }

        this.moveTimer += dt;
        if (this.moveTimer < this.moveInterval) return;
        this.moveTimer = 0;

        this.dirP1 = { ...this.nextP1 };
        this.dirP2 = { ...this.nextP2 };

        const head1 = { x: this.snakeP1[0].x + this.dirP1.x, y: this.snakeP1[0].y + this.dirP1.y };
        const head2 = { x: this.snakeP2[0].x + this.dirP2.x, y: this.snakeP2[0].y + this.dirP2.y };

        const p1Dead = this.crash(head1, this.snakeP1, this.snakeP2);
        const p2Dead = this.crash(head2, this.snakeP2, this.snakeP1);

        if (head1.x === head2.x && head1.y === head2.y) {
            this.deadMsg = 'HEAD COLLISION!';
            this.deadTimer = 1;
            AudioManager.wrong();
            return;
        }

        if (p1Dead && p2Dead) {
            this.deadMsg = 'DOUBLE CRASH!';
            this.deadTimer = 1;
            AudioManager.wrong();
            return;
        }
        if (p1Dead) {
            this.scoreP2++;
            this.deadMsg = GameManager.isSinglePlayer ? 'CPU SCORES!' : 'P2 SCORES!';
            this.deadTimer = 1;
            AudioManager.correct();
            return;
        }
        if (p2Dead) {
            this.scoreP1++;
            this.deadMsg = 'P1 SCORES!';
            this.deadTimer = 1;
            AudioManager.correct();
            return;
        }

        this.snakeP1.unshift(head1);
        this.snakeP2.unshift(head2);

        let ate = false;
        if (head1.x === this.food.x && head1.y === this.food.y) {
            this.scoreP1++;
            ate = true;
            AudioManager.tick();
        } else {
            this.snakeP1.pop();
        }
        if (head2.x === this.food.x && head2.y === this.food.y) {
            this.scoreP2++;
            ate = true;
            AudioManager.tick();
        } else {
            this.snakeP2.pop();
        }
        if (ate) this.food = this.spawnFood();

        if (this.scoreP1 >= 8 || this.scoreP2 >= 8) {
            this.deadTimer = 0.5;
            this.deadMsg = this.scoreP1 >= 8 ? 'P1 WINS!' : (GameManager.isSinglePlayer ? 'CPU WINS!' : 'P2 WINS!');
        }
    }

    render(ctx) {
        ctx.fillStyle = Theme.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = Theme.fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Apples: ${this.scoreP1} — ${this.scoreP2}  (first to 8)`, this.width / 2, 36);
        ctx.font = '14px Arial';
        ctx.fillStyle = Theme.accent;
        ctx.fillText('Crash = rival scores a point', this.width / 2, 58);

        ctx.strokeStyle = Theme.fg;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.ox, this.oy, this.cols * this.grid, this.rows * this.grid);

        const g = this.grid;
        ctx.fillStyle = Theme.accent;
        ctx.beginPath();
        ctx.arc(this.ox + this.food.x * g + g / 2, this.oy + this.food.y * g + g / 2, g * 0.35, 0, Math.PI * 2);
        ctx.fill();

        const drawSnake = (snake, color) => {
            snake.forEach((s, i) => {
                ctx.fillStyle = i === 0 ? color : color;
                ctx.globalAlpha = i === 0 ? 1 : 0.75;
                ctx.fillRect(this.ox + s.x * g + 2, this.oy + s.y * g + 2, g - 4, g - 4);
            });
            ctx.globalAlpha = 1;
        };

        drawSnake(this.snakeP1, Theme.p1);
        drawSnake(this.snakeP2, GameManager.isSinglePlayer ? '#8C52FF' : Theme.p2);

        if (this.deadTimer > 0 && this.deadMsg) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = Theme.accent;
            ctx.font = 'bold 34px Impact';
            ctx.fillText(this.deadMsg, this.width / 2, this.height / 2);
        }

        ctx.fillStyle = Theme.fg;
        ctx.font = '13px Arial';
        ctx.fillText('WASD / Arrows — no reversing into yourself', this.width / 2, this.height - 12);
    }
}

GameManager.registerGame(new GameSnakeBattle());
