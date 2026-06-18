class GameSnakeBattle extends GameBase {
    constructor() { 
        super("Snake Battle", "Eat food, don't hit walls or each other!"); 
    }
    
    init(w, h) {
        super.init(w, h);
        this.grid = 20;
        this.cols = w / this.grid;
        this.rows = h / this.grid;
        
        this.scoreP1 = 0;
        this.scoreP2 = 0;

        this.moveTimer = 0;
        this.moveInterval = 0.1; // Seconds per grid step (Speed)

        this.snakeP1 = [{x: 5, y: 5}, {x: 4, y: 5}];
        this.dirP1 = {x: 1, y: 0};
        
        this.snakeP2 = [{x: this.cols-6, y: this.rows-6}, {x: this.cols-5, y: this.rows-6}];
        this.dirP2 = {x: -1, y: 0};

        this.food = this.spawnFood();
    }

    spawnFood() {
        return { 
            x: Math.floor(Math.random() * this.cols), 
            y: Math.floor(Math.random() * this.rows) 
        };
    }

    update(dt) {
        // P1 Input
        if (Input.isDown('KeyW') && this.dirP1.y === 0) this.dirP1 = {x: 0, y: -1};
        if (Input.isDown('KeyS') && this.dirP1.y === 0) this.dirP1 = {x: 0, y: 1};
        if (Input.isDown('KeyA') && this.dirP1.x === 0) this.dirP1 = {x: -1, y: 0};
        if (Input.isDown('KeyD') && this.dirP1.x === 0) this.dirP1 = {x: 1, y: 0};

        // P2 Input
        if (Input.isDown('ArrowUp') && this.dirP2.y === 0) this.dirP2 = {x: 0, y: -1};
        if (Input.isDown('ArrowDown') && this.dirP2.y === 0) this.dirP2 = {x: 0, y: 1};
        if (Input.isDown('ArrowLeft') && this.dirP2.x === 0) this.dirP2 = {x: -1, y: 0};
        if (Input.isDown('ArrowRight') && this.dirP2.x === 0) this.dirP2 = {x: 1, y: 0};

        // Discrete Grid Movement
        this.moveTimer += dt;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;

            let head1 = { x: this.snakeP1[0].x + this.dirP1.x, y: this.snakeP1[0].y + this.dirP1.y };
            let head2 = { x: this.snakeP2[0].x + this.dirP2.x, y: this.snakeP2[0].y + this.dirP2.y };

            // Wall Collisions
            let p1Dead = (head1.x < 0 || head1.x >= this.cols || head1.y < 0 || head1.y >= this.rows);
            let p2Dead = (head2.x < 0 || head2.x >= this.cols || head2.y < 0 || head2.y >= this.rows);

            // Body Collisions
            const checkCrash = (head, ...snakes) => snakes.some(snake => snake.some(s => s.x === head.x && s.y === head.y));
            p1Dead = p1Dead || checkCrash(head1, this.snakeP1, this.snakeP2);
            p2Dead = p2Dead || checkCrash(head2, this.snakeP2, this.snakeP1);

            if (p1Dead && p2Dead) { GameManager.gameOver(0); return; }
            if (p1Dead) { GameManager.gameOver(2); return; }
            if (p2Dead) { GameManager.gameOver(1); return; }

            // Move
            this.snakeP1.unshift(head1);
            this.snakeP2.unshift(head2);

            // Food Handling
            if (head1.x === this.food.x && head1.y === this.food.y) {
                this.scoreP1++; this.food = this.spawnFood();
            } else { this.snakeP1.pop(); }

            if (head2.x === this.food.x && head2.y === this.food.y) {
                this.scoreP2++; this.food = this.spawnFood();
            } else { this.snakeP2.pop(); }
        }
    }

    render(ctx) {
        // Food
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(this.food.x * this.grid + 2, this.food.y * this.grid + 2, this.grid - 4, this.grid - 4);

        // Snakes
        ctx.fillStyle = Theme.p1;
        this.snakeP1.forEach(s => ctx.fillRect(s.x * this.grid + 1, s.y * this.grid + 1, this.grid - 2, this.grid - 2));

        ctx.fillStyle = Theme.p2;
        this.snakeP2.forEach(s => ctx.fillRect(s.x * this.grid + 1, s.y * this.grid + 1, this.grid - 2, this.grid - 2));
    }
}

GameManager.registerGame(new GameSnakeBattle());