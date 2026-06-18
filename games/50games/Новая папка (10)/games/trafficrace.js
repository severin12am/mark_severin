class TrafficRace extends GameBase {
    constructor() {
        super("Traffic Race", "Dodge traffic! First to 3000m wins.");
    }

    init(w, h) {
        super.init(w, h);
        this.scoreP1 = 0; // Represents Distance
        this.scoreP2 = 0;

        this.p1 = { x: w * 0.33, y: h - 100, w: 40, h: 70, speedY: 0 };
        this.p2 = { x: w * 0.66, y: h - 100, w: 40, h: 70, speedY: 0 };

        this.traffic = [];
        this.spawnTimer = 0;
        this.roadLines = [0, 200, 400, 600];
        
        this.baseSpeed = 600;
    }

    update(dt) {
        let moveCar = (p, left, right, up, down, isAI) => {
            let steer = 400 * dt;
            
            if (isAI) {
                // Raycast ahead to avoid traffic
                let danger = false;
                for (let t of this.traffic) {
                    if (t.y < p.y && t.y > p.y - 300 && Math.abs(t.x - p.x) < 60) {
                        danger = true;
                        // Steer away
                        if (t.x < p.x) p.x += steer; else p.x -= steer;
                        break;
                    }
                }
                // Auto accelerate, slightly slower than player max
                if (!danger) p.speedY = Math.min(p.speedY + 500 * dt, this.baseSpeed * 0.9);
            } else {
                if (Input.isDown(left)) p.x -= steer;
                if (Input.isDown(right)) p.x += steer;
                if (Input.isDown(up)) p.speedY = Math.min(p.speedY + 800 * dt, this.baseSpeed);
                else if (Input.isDown(down)) p.speedY = Math.max(p.speedY - 800 * dt, -200);
                else p.speedY = Math.max(p.speedY - 300 * dt, 0); // Friction
            }

            // Boundaries
            if (p.x < 50) p.x = 50;
            if (p.x > this.width - 50 - p.w) p.x = this.width - 50 - p.w;
        };

        moveCar(this.p1, 'KeyA', 'KeyD', 'KeyW', 'KeyS', false);
        moveCar(this.p2, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', GameManager.isSinglePlayer);

        // Spawn Traffic
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.traffic.push({
                x: 50 + Math.random() * (this.width - 150),
                y: -100,
                w: 50 + Math.random() * 30,
                h: 80 + Math.random() * 40,
                speed: 200 + Math.random() * 200
            });
            this.spawnTimer = 0.4 + Math.random() * 0.4;
        }

        // Update Traffic & Lines (Relative to game speed)
        let maxSpeed = Math.max(this.p1.speedY, this.p2.speedY, 200);
        
        for (let i = 0; i < this.roadLines.length; i++) {
            this.roadLines[i] += maxSpeed * dt;
            if (this.roadLines[i] > this.height) this.roadLines[i] -= this.height + 200;
        }

        for (let i = this.traffic.length - 1; i >= 0; i--) {
            let t = this.traffic[i];
            // Move traffic down relative to max speed
            t.y += (maxSpeed - t.speed) * dt;
            if (t.y > this.height + 100) {
                this.traffic.splice(i, 1);
            } else {
                // Collision
                let checkCol = (p) => {
                    if (p.x < t.x + t.w && p.x + p.w > t.x &&
                        p.y < t.y + t.h && p.y + p.h > t.y) {
                        p.speedY = -300; // Crash penalty
                        t.speed = 0; // Wreck the traffic car
                    }
                };
                checkCol(this.p1); checkCol(this.p2);
            }
        }

        // Update Scores (Distance)
        if (this.p1.speedY > 0) this.scoreP1 += Math.floor(this.p1.speedY * dt);
        if (this.p2.speedY > 0) this.scoreP2 += Math.floor(this.p2.speedY * dt);

        if (this.scoreP1 >= 3000) GameManager.gameOver(1);
        else if (this.scoreP2 >= 3000) GameManager.gameOver(2);
    }

    render(ctx) {
        // Draw Road background
        ctx.fillStyle = "#2c2f33";
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Road Lines
        ctx.fillStyle = Theme.fg;
        for (let y of this.roadLines) {
            ctx.fillRect(this.width/2 - 10, y, 20, 100);
            ctx.fillRect(this.width/4 - 10, y, 10, 100);
            ctx.fillRect(this.width*0.75 - 10, y, 10, 100);
        }

        // Borders
        ctx.fillStyle = Theme.accent;
        ctx.fillRect(0, 0, 20, this.height);
        ctx.fillRect(this.width - 20, 0, 20, this.height);

        // Draw Traffic
        ctx.lineWidth = 4;
        for (let t of this.traffic) {
            ctx.fillStyle = "#888"; ctx.strokeStyle = Theme.fg;
            ctx.fillRect(t.x, t.y, t.w, t.h);
            ctx.strokeRect(t.x, t.y, t.w, t.h);
            // Tail lights
            ctx.fillStyle = Theme.p1;
            ctx.fillRect(t.x + 5, t.y + 5, 10, 5);
            ctx.fillRect(t.x + t.w - 15, t.y + 5, 10, 5);
        }

        // Draw Players
        let drawCar = (p, color) => {
            ctx.fillStyle = color; ctx.strokeStyle = Theme.fg;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.strokeRect(p.x, p.y, p.w, p.h);
            // Windshield
            ctx.fillStyle = "#000";
            ctx.fillRect(p.x + 5, p.y + 15, p.w - 10, 15);
            // Headlights
            ctx.fillStyle = Theme.accent;
            ctx.fillRect(p.x + 5, p.y - 5, 10, 10);
            ctx.fillRect(p.x + p.w - 15, p.y - 5, 10, 10);
            
            // Speed flames if going fast
            if (p.speedY > 400) {
                ctx.fillStyle = "#FF5722";
                ctx.beginPath();
                ctx.moveTo(p.x + 5, p.y + p.h);
                ctx.lineTo(p.x + 15, p.y + p.h + 20 + Math.random()*15);
                ctx.lineTo(p.x + 25, p.y + p.h);
                ctx.fill();
            }
        };

        drawCar(this.p1, Theme.p1);
        drawCar(this.p2, GameManager.isSinglePlayer ? "#8C52FF" : Theme.p2);
    }
}
GameManager.registerGame(new TrafficRace());