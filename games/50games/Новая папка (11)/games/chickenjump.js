class ChickenJump extends GameBase {
    constructor() {
        super("Chicken Jump", "Cross the road! First to 3 wins.");
    }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        
        this.resetPositions();
        
        // Setup traffic lanes
        this.lanes = [];
        const laneHeights = [100, 180, 260, 340, 420];
        const speeds = [150, -200, 180, -250, 120];
        
        for (let i = 0; i < 5; i++) {
            this.lanes.push({
                y: laneHeights[i],
                speed: speeds[i],
                cars: this.generateCars(speeds[i])
            });
        }

        this.p1Cooldown = 0;
        this.p2Cooldown = 0;
        this.aiTimer = 0;
    }

    generateCars(speed) {
        let cars = [];
        let numCars = Math.floor(Math.random() * 2) + 2;
        let spacing = this.width / numCars;
        for (let i = 0; i < numCars; i++) {
            cars.push({
                x: i * spacing + Math.random() * 50,
                w: 60 + Math.random() * 40,
                h: 40
            });
        }
        return cars;
    }

    resetPositions() {
        this.p1 = { x: this.width / 3, y: this.height - 50, size: 24 };
        this.p2 = { x: (this.width / 3) * 2, y: this.height - 50, size: 24 };
    }

    update(dt) {
        if (this.p1Cooldown > 0) this.p1Cooldown -= dt;
        if (this.p2Cooldown > 0) this.p2Cooldown -= dt;

        // P1 Input
        if (this.p1Cooldown <= 0) {
            if (Input.isDown('KeyW')) { this.p1.y -= 80; this.p1Cooldown = 0.2; }
            else if (Input.isDown('KeyS') && this.p1.y < this.height - 50) { this.p1.y += 80; this.p1Cooldown = 0.2; }
            else if (Input.isDown('KeyA') && this.p1.x > 30) { this.p1.x -= 80; this.p1Cooldown = 0.2; }
            else if (Input.isDown('KeyD') && this.p1.x < this.width - 30) { this.p1.x += 80; this.p1Cooldown = 0.2; }
        }

        // P2 Input or AI
        if (GameManager.isSinglePlayer) {
            this.aiTimer -= dt;
            if (this.aiTimer <= 0) {
                // Look ahead for cars
                let inDanger = false;
                for (let lane of this.lanes) {
                    if (Math.abs(lane.y - (this.p2.y - 80)) < 30) {
                        for (let car of lane.cars) {
                            if (Math.abs(car.x - this.p2.x) < 80) inDanger = true;
                        }
                    }
                }
                if (!inDanger) {
                    this.p2.y -= 80;
                } else {
                    // Sidestep
                    this.p2.x += (Math.random() > 0.5 ? 80 : -80);
                    if (this.p2.x < 30) this.p2.x = 110;
                    if (this.p2.x > this.width - 30) this.p2.x = this.width - 110;
                }
                this.aiTimer = 0.3 + Math.random() * 0.3;
            }
        } else {
            if (this.p2Cooldown <= 0) {
                if (Input.isDown('ArrowUp')) { this.p2.y -= 80; this.p2Cooldown = 0.2; }
                else if (Input.isDown('ArrowDown') && this.p2.y < this.height - 50) { this.p2.y += 80; this.p2Cooldown = 0.2; }
                else if (Input.isDown('ArrowLeft') && this.p2.x > 30) { this.p2.x -= 80; this.p2Cooldown = 0.2; }
                else if (Input.isDown('ArrowRight') && this.p2.x < this.width - 30) { this.p2.x += 80; this.p2Cooldown = 0.2; }
            }
        }

        // Update traffic and check collisions
        for (let lane of this.lanes) {
            for (let car of lane.cars) {
                car.x += lane.speed * dt;
                if (lane.speed > 0 && car.x > this.width) car.x = -car.w;
                if (lane.speed < 0 && car.x < -car.w) car.x = this.width;

                // Collision Check P1
                if (Math.abs(this.p1.x - (car.x + car.w/2)) < (this.p1.size + car.w/2 - 10) &&
                    Math.abs(this.p1.y - (lane.y + car.h/2)) < (this.p1.size + car.h/2 - 10)) {
                    this.p1.x = this.width / 3; this.p1.y = this.height - 50;
                }
                // Collision Check P2
                if (Math.abs(this.p2.x - (car.x + car.w/2)) < (this.p2.size + car.w/2 - 10) &&
                    Math.abs(this.p2.y - (lane.y + car.h/2)) < (this.p2.size + car.h/2 - 10)) {
                    this.p2.x = (this.width / 3) * 2; this.p2.y = this.height - 50;
                }
            }
        }

        // Win point if crossed
        if (this.p1.y <= 40) { this.scoreP1++; this.resetPositions(); }
        if (this.p2.y <= 40) { this.scoreP2++; this.resetPositions(); }

        // Match win condition
        if (this.scoreP1 >= 3) GameManager.gameOver(1);
        else if (this.scoreP2 >= 3) GameManager.gameOver(2);
    }

    render(ctx) {
        // Draw lanes
        ctx.fillStyle = "#222";
        for (let lane of this.lanes) {
            ctx.fillRect(0, lane.y, this.width, 40);
            ctx.fillStyle = Theme.fg;
            for(let i=0; i<this.width; i+=40) ctx.fillRect(i, lane.y + 18, 20, 4);
            ctx.fillStyle = "#222";
        }

        // Draw cars
        ctx.lineWidth = 4;
        for (let lane of this.lanes) {
            for (let car of lane.cars) {
                ctx.fillStyle = Theme.accent;
                ctx.strokeStyle = Theme.fg;
                ctx.fillRect(car.x, lane.y, car.w, car.h);
                ctx.strokeRect(car.x, lane.y, car.w, car.h);
            }
        }

        // Draw Players
        const drawPlayer = (p, color) => {
            ctx.fillStyle = color;
            ctx.strokeStyle = Theme.fg;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Eyes
            ctx.fillStyle = Theme.fg;
            ctx.fillRect(p.x - 8, p.y - 12, 6, 6);
            ctx.fillRect(p.x + 2, p.y - 12, 6, 6);
        };

        drawPlayer(this.p1, Theme.p1);
        drawPlayer(this.p2, GameManager.isSinglePlayer ? "#8C52FF" : Theme.p2);
    }
}
GameManager.registerGame(new ChickenJump());