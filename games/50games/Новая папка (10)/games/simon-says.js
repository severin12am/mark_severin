class SimonSays extends GameBase {
    constructor() {
        super("Simon Says", "Repeat the growing sequence of colors/directions.");
    }

    init(w, h) {
        super.init(w, h);
        this.resetGame();
    }

    resetGame() {
        this.sequence = [];
        this.playerInput = [];
        this.level = 0;
        this.state = "showing"; // "showing", "playing", "wrong"
        this.showIndex = 0;
        this.showTimer = 0;
        this.flashDuration = 45;
        this.pauseBetween = 20;

        this.directions = ['up', 'right', 'down', 'left'];
        this.dirMap = {
            up:    { keyP1: 'KeyW',    keyP2: 'ArrowUp',    color: '#00ccff' },
            right: { keyP1: 'KeyD',    keyP2: 'ArrowRight', color: '#ff3366' },
            down:  { keyP1: 'KeyS',    keyP2: 'ArrowDown',  color: '#ffcc00' },
            left:  { keyP1: 'KeyA',    keyP2: 'ArrowLeft',  color: '#33ff99' }
        };

        this.nextLevel();
    }

    nextLevel() {
        this.level++;
        this.sequence.push(this.directions[Math.floor(Math.random() * 4)]);
        this.playerInput = [];
        this.state = "showing";
        this.showIndex = 0;
        this.showTimer = 0;
    }

    update(dt) {
        const delta = dt / 16;

        if (this.state === "showing") {
            this.showTimer += delta;
            if (this.showTimer > this.flashDuration + this.pauseBetween) {
                this.showTimer = 0;
                this.showIndex++;
                if (this.showIndex >= this.sequence.length) {
                    this.state = "playing";
                    this.showIndex = 0;
                }
            }
        } else if (this.state === "playing") {
            let inputDir = null;

            // Player 1 input
            for (let dir in this.dirMap) {
                if (Input.isJustPressed(this.dirMap[dir].keyP1)) {
                    inputDir = dir;
                    break;
                }
            }

            // Player 2 or CPU
            if (inputDir === null) {
                if (GameManager.isSinglePlayer) {
                    // CPU repeats with small random delay & occasional mistake (fun)
                    if (Math.random() < 0.07 && this.playerInput.length < this.sequence.length) {
                        // mistake ~7% chance
                        let wrong = this.directions[Math.floor(Math.random() * 4)];
                        while (wrong === this.sequence[this.playerInput.length]) wrong = this.directions[Math.floor(Math.random() * 4)];
                        inputDir = wrong;
                    } else if (this.playerInput.length < this.sequence.length) {
                        inputDir = this.sequence[this.playerInput.length];
                    }
                } else {
                    for (let dir in this.dirMap) {
                        if (Input.isJustPressed(this.dirMap[dir].keyP2)) {
                            inputDir = dir;
                            break;
                        }
                    }
                }
            }

            if (inputDir) {
                this.playerInput.push(inputDir);
                const expected = this.sequence[this.playerInput.length - 1];

                if (inputDir !== expected) {
                    this.state = "wrong";
                    GameManager.gameOver(3 - this.currentPlayerTurn()); // opponent wins
                } else if (this.playerInput.length === this.sequence.length) {
                    this.nextLevel();
                }
            }
        }
    }

    currentPlayerTurn() {
        // In two-player, both input simultaneously — but for simplicity we just end on first mistake
        return 1; // placeholder — in practice first wrong loses
    }

    render(ctx) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = 90;

        // Draw 4 colored pads
        const padPositions = [
            {dir:'up',    x:centerX,       y:centerY - radius * 1.4},
            {dir:'right', x:centerX + radius * 1.4, y:centerY},
            {dir:'down',  x:centerX,       y:centerY + radius * 1.4},
            {dir:'left',  x:centerX - radius * 1.4, y:centerY}
        ];

        padPositions.forEach(p => {
            const info = this.dirMap[p.dir];
            let alpha = 0.22;

            // Currently showing?
            if (this.state === "showing" && this.showIndex < this.sequence.length) {
                if (this.sequence[this.showIndex] === p.dir && this.showTimer < this.flashDuration) {
                    alpha = 1.0;
                }
            }

            // Player just pressed?
            if (this.playerInput.length > 0 && this.playerInput[this.playerInput.length-1] === p.dir &&
                this.state === "playing") {
                alpha = 0.85;
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Labels
        ctx.fillStyle = Theme.fg;
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`LEVEL ${this.level}`, centerX, 60);

        if (this.state === "showing") {
            ctx.fillText("WATCH...", centerX, this.height - 60);
        } else if (this.state === "playing") {
            ctx.fillText("REPEAT!", centerX, this.height - 60);
        }

        if (GameManager.isSinglePlayer && this.state === "playing") {
            ctx.fillStyle = Theme.p2;
            ctx.fillText("(CPU is watching too)", centerX, this.height - 30);
        }
    }
}

GameManager.registerGame(new SimonSays());