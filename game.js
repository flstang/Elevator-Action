// Constants
const C_W = 800;
const C_H = 600;
const FLOORS = 10;
const FL_H = 100;
const B_H = FLOORS * FL_H;
const GRAVITY = 0.4;
const P_SPEED = 3;
const JUMP_FORCE = -8;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

const Sound = {
    playTone(freq, type, duration, vol=0.1) {
        if(!audioCtx || audioCtx.state === 'suspended') return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    jump() {
        if(!audioCtx || audioCtx.state === 'suspended') return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    },
    shoot() {
        if(!audioCtx || audioCtx.state === 'suspended') return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    },
    door() {
        this.playTone(150, 'square', 0.1, 0.1);
    },
    document() {
        setTimeout(() => this.playTone(400, 'square', 0.1, 0.1), 0);
        setTimeout(() => this.playTone(500, 'square', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(600, 'square', 0.2, 0.1), 200);
    },
    levelComplete() {
        setTimeout(() => this.playTone(400, 'square', 0.1, 0.1), 0);
        setTimeout(() => this.playTone(500, 'square', 0.1, 0.1), 150);
        setTimeout(() => this.playTone(600, 'square', 0.1, 0.1), 300);
        setTimeout(() => this.playTone(800, 'square', 0.3, 0.1), 450);
    }
};

let keys = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
    Space: false, Enter: false
};

window.addEventListener('keydown', e => {
    if (e.code === 'Space') e.preventDefault(); // prevent scrolling
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});
window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || 
             r2.x + r2.w < r1.x || 
             r2.y > r1.y + r1.h ||
             r2.y + r2.h < r1.y);
}

function drawSpy(ctx, x, y, w, h, isDucking, facingRight, animFrame, isFiring, colors, scrollY) {
    ctx.save();
    ctx.translate(x + w/2, y + h - scrollY); 
    if (!facingRight) ctx.scale(-1, 1);
    
    let squatOffset = isDucking ? 15 : 0;
    
    // Legs
    ctx.fillStyle = colors.suit;
    if (isDucking) {
        ctx.fillRect(-6, -15, 6, 15); 
        ctx.fillRect(0, -10, 8, 10);  
    } else {
        let legSpread = Math.sin(animFrame * 0.4) * 8; 
        ctx.beginPath();
        ctx.moveTo(-2, -20);
        ctx.lineTo(-2 - legSpread, -2);
        ctx.lineTo(-2 - legSpread + 4, -2);
        ctx.lineTo(2, -20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, -20);
        ctx.lineTo(2 + legSpread, -2);
        ctx.lineTo(2 + legSpread + 4, -2);
        ctx.lineTo(-2, -20);
        ctx.fill();
        ctx.fillStyle = '#111'; 
        ctx.fillRect(-2 - legSpread, -2, 6, 2);
        ctx.fillRect(2 + legSpread, -2, 6, 2);
    }
    
    // Torso
    ctx.fillStyle = colors.suit;
    ctx.fillRect(-6, -30 + squatOffset, 12, 15);
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, -28 + squatOffset, 2, 8);
    ctx.fillStyle = '#f00'; 
    ctx.fillRect(2, -26 + squatOffset, 2, 4);

    // Head & Hat
    ctx.fillStyle = colors.skin;
    ctx.fillRect(-4, -38 + squatOffset, 8, 8); 
    ctx.fillStyle = colors.hat;
    ctx.fillRect(-8, -40 + squatOffset, 16, 2); 
    ctx.fillRect(-5, -45 + squatOffset, 10, 5); 
    ctx.fillStyle = '#000';
    ctx.fillRect(1, -36 + squatOffset, 3, 2); 
    
    // Arms & Gun
    ctx.fillStyle = colors.suit;
    if (isFiring) {
        ctx.fillRect(-2, -26 + squatOffset, 12, 4);
        ctx.fillStyle = '#555';
        ctx.fillRect(10, -28 + squatOffset, 8, 4); 
        ctx.fillRect(10, -25 + squatOffset, 3, 4); 
    } else {
        let armSwing = isDucking ? 0 : Math.sin(animFrame * 0.4 + Math.PI) * 5;
        ctx.beginPath();
        ctx.moveTo(0, -26 + squatOffset);
        ctx.lineTo(0 + armSwing, -12 + squatOffset);
        ctx.lineTo(4 + armSwing, -12 + squatOffset);
        ctx.lineTo(4, -26 + squatOffset);
        ctx.fill();
    }
    
    ctx.restore();
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 20;
        this.h = 40;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;
        this.facingRight = true;
        this.isDucking = false;
        this.enteringDoor = null;
        this.doorTimer = 0;
        this.cooldown = 0;
        this.isDead = false;
        this.animTimer = 0;
        this.fireTimer = 0;
        this.colors = { suit: '#ddd', hat: '#bbb', skin: '#ffccaa' };
    }

    update(elevators, doors, bullets, game) {
        if (this.isDead) return;
        
        if (this.enteringDoor) {
            this.doorTimer--;
            if (this.doorTimer <= 0) {
                if (this.enteringDoor.isRed && this.enteringDoor.hasDocument) {
                    this.enteringDoor.hasDocument = false;
                    game.score += 500;
                    game.documentsLeft--;
                    game.updateUI();
                    Sound.document();
                }
                this.enteringDoor = null;
            }
            return;
        }

        if (this.cooldown > 0) this.cooldown--;
        if (this.fireTimer > 0) this.fireTimer--;

        // Input
        this.isDucking = keys.ArrowDown && this.isGrounded;
        
        if (!this.isDucking) {
            if (keys.ArrowLeft) {
                this.vx = -P_SPEED;
                this.facingRight = false;
            } else if (keys.ArrowRight) {
                this.vx = P_SPEED;
                this.facingRight = true;
            } else {
                this.vx = 0;
            }
            
            if (keys.ArrowUp && this.isGrounded) {
                this.vy = JUMP_FORCE;
                this.isGrounded = false;
                Sound.jump();
            }
        } else {
            this.vx = 0;
        }

        if (this.vx !== 0 && this.isGrounded) {
            this.animTimer++;
        } else {
            this.animTimer = 0;
        }

        // Apply Gravity
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        this.isGrounded = false;

        // Floor collision
        let floorY = Math.floor((this.y + this.h) / FL_H) * FL_H;
        let overFloor = false;
        let onBottomFloor = (floorY === B_H);
        
        if (onBottomFloor) {
             overFloor = true;
        } else {
             let cx = this.x + this.w / 2; // Center of player
             if (cx >= 0 && cx <= 200) overFloor = true;
             if (cx >= 260 && cx <= 500) overFloor = true;
             if (cx >= 560 && cx <= C_W) overFloor = true;
        }
        
        if (this.y + this.h >= floorY && this.vy >= 0 && (this.y + this.h - this.vy) <= floorY) {
            if (overFloor) {
                 this.y = floorY - this.h;
                 this.vy = 0;
                 this.isGrounded = true;
            }
        }

        // Check Elevator collision
        let onElevator = false;
        for (let el of elevators) {
            // Standing on elevator platform
            if (this.x + this.w > el.x && this.x < el.x + el.w) {
                if (this.y + this.h >= el.y && this.y + this.h - this.vy <= el.y + el.speed + 1) { // Adding tolerance
                    this.y = el.y - this.h;
                    this.vy = el.speed * el.dir; // Move with elevator
                    this.isGrounded = true;
                    onElevator = true;
                }
            }
        }
        
        // Crush detection
        for (let el of elevators) {
             if (!onElevator && rectIntersect(this, el)) {
                 // if intersecting platform and not standing on it
                 this.die();
             }
        }

        // Enter doors
        if (keys.ArrowDown && this.isGrounded && !this.enteringDoor) {
            for (let d of doors) {
                if (Math.abs(this.x + this.w/2 - (d.x + d.w/2)) < 15 && Math.abs((this.y+this.h) - (d.y+d.h)) < 5) {
                    this.enteringDoor = d;
                    this.doorTimer = 30; // 0.5 second
                    Sound.door();
                    break;
                }
            }
        }

        // Shoot
        if (keys.Space && this.cooldown <= 0 && !this.enteringDoor) {
            let bulletY = this.y + (this.isDucking ? 27 : 12);
            let bulletX = this.x + (this.facingRight ? this.w + 4 : -12);
            bullets.push(new Bullet(bulletX, bulletY, this.facingRight ? 1 : -1, 'player'));
            this.cooldown = 15;
            this.fireTimer = 10;
            Sound.shoot();
        }

        // Bounds
        if (this.x < 0) this.x = 0;
        if (this.x > C_W - this.w) this.x = C_W - this.w;
        
        // Bottom check
        if (this.y > B_H) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
    }

    draw(ctx, scrollY) {
        if (this.enteringDoor) return; 
        
        drawSpy(ctx, this.x, this.y, this.w, this.h, this.isDucking, this.facingRight, this.animTimer, this.fireTimer > 0, this.colors, scrollY);
    }
}

class Elevator {
    constructor(x, minY, maxY, w) {
        this.x = x;
        this.y = minY;
        this.w = w;
        this.h = 10;
        this.minY = minY;
        this.maxY = maxY;
        this.speed = 1.5;
        this.dir = 1; // 1 down, -1 up
    }
    
    update() {
        this.y += this.speed * this.dir;
        if (this.y >= this.maxY) {
            this.y = this.maxY;
            this.dir = -1;
        }
        if (this.y <= this.minY) {
            this.y = this.minY;
            this.dir = 1;
        }
    }
    
    draw(ctx, scrollY) {
        // Cables
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.w/2, this.minY - scrollY);
        ctx.lineTo(this.x + this.w/2, this.y - scrollY);
        ctx.stroke();
        
        // Platform
        ctx.fillStyle = '#aaa';
        ctx.fillRect(this.x, this.y - scrollY, this.w, this.h);
        
        // Shaft background
        ctx.fillStyle = 'rgba(20, 20, 20, 0.4)';
        ctx.fillRect(this.x, this.minY - scrollY, this.w, this.maxY - this.minY);
    }
}

class Door {
    constructor(x, y, isRed) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 50;
        this.isRed = isRed;
        this.hasDocument = isRed;
    }
    
    draw(ctx, scrollY) {
        ctx.fillStyle = this.isRed ? (this.hasDocument ? '#e00' : '#800') : '#00a';
        ctx.fillRect(this.x, this.y - scrollY, this.w, this.h);
        
        // Doorknob
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + this.w - 8, this.y - scrollY + this.h / 2, 4, 4);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 20;
        this.h = 40;
        this.vx = (Math.random() > 0.5 ? 1 : -1) * 1.0;
        this.vy = 0;
        this.isDead = false;
        this.cooldown = Math.random() * 100;
        this.facingRight = this.vx > 0;
        this.animTimer = 0;
        this.fireTimer = 0;
        this.colors = { suit: '#333', hat: '#111', skin: '#ffccaa' };
    }
    
    update(bullets, player) {
        if (this.isDead) return;
        
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;
        
        // Floor collision
        let floorY = Math.floor((this.y + this.h) / FL_H) * FL_H;
        let cx = this.x + this.w / 2;
        
        // Prevent falling into shafts by reversing direction
        let nextCx = cx + this.vx * 10;
        let overFloor = false;
        if (nextCx >= 0 && nextCx <= 200) overFloor = true;
        if (nextCx >= 260 && nextCx <= 500) overFloor = true;
        if (nextCx >= 560 && nextCx <= C_W) overFloor = true;
        
        if (!overFloor) {
            this.vx *= -1;
            this.facingRight = this.vx > 0;
        }

        if (this.y + this.h >= floorY) {
             this.y = floorY - this.h;
             this.vy = 0;
        }
        
        // Patrol limits
        if (this.x < 0 || this.x > C_W - this.w) {
            this.vx *= -1;
            this.facingRight = this.vx > 0;
        }
        
        // Randomly change direction
        if (Math.random() < 0.005) {
            this.vx *= -1;
            this.facingRight = this.vx > 0;
        }

        if (this.vx !== 0 && this.vy === 0) {
            this.animTimer++;
        }

        if (this.cooldown > 0) this.cooldown--;
        if (this.fireTimer > 0) this.fireTimer--;
        
        if (Math.abs(this.y - player.y) < 20 && !player.isDead && !player.enteringDoor) {
             let dist = player.x - this.x;
             if ((dist > 0 && this.facingRight) || (dist < 0 && !this.facingRight)) {
                 if (Math.abs(dist) < 250 && this.cooldown <= 0) {
                     let bulletY = this.y + 12;
                     let bulletX = this.x + (this.facingRight ? this.w + 4 : -12);
                     bullets.push(new Bullet(bulletX, bulletY, this.facingRight ? 1 : -1, 'enemy'));
                     this.cooldown = 120;
                     this.fireTimer = 15;
                     Sound.shoot();
                     let oldVx = this.vx;
                     this.vx = 0; // stop to shoot
                     setTimeout(() => { if (!this.isDead) this.vx = oldVx; }, 400);
                 }
             }
        }
    }
    
    draw(ctx, scrollY) {
        drawSpy(ctx, this.x, this.y, this.w, this.h, false, this.facingRight, this.animTimer, this.fireTimer > 0, this.colors, scrollY);
    }
}

class Bullet {
    constructor(x, y, dir, owner) {
        this.x = x;
        this.y = y;
        this.w = 8;
        this.h = 4;
        this.vx = dir * 8;
        this.owner = owner;
        this.active = true;
    }
    
    update() {
        this.x += this.vx;
        if (this.x < 0 || this.x > C_W) this.active = false;
    }
    
    draw(ctx, scrollY) {
        ctx.fillStyle = this.owner === 'player' ? '#ff0' : '#f00';
        ctx.fillRect(this.x, this.y - scrollY, this.w, this.h);
    }
}

const STATE_START = 0;
const STATE_PLAYING = 1;
const STATE_GAMEOVER = 2;
const STATE_WIN = 3;
const STATE_LEVEL = 4;

class Game {
    constructor() {
        this.state = STATE_START;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.initLevel();
    }
    
    initLevel() {
        this.player = new Player(C_W / 2, 0);
        this.elevators = [];
        this.doors = [];
        this.enemies = [];
        this.bullets = [];
        this.documentsLeft = 0;
        
        // Elevators
        this.elevators.push(new Elevator(200, 0, B_H, 60));
        this.elevators.push(new Elevator(500, 0, B_H, 60));
        
        // Generate Level
        for (let i = 0; i <= FLOORS; i++) {
            let y = i * FL_H;
            
            if (i < FLOORS) {
                // Doors
                let numDoors = Math.floor(Math.random() * 3) + 1;
                for (let j = 0; j < numDoors; j++) {
                    let dx = 50 + Math.random() * (C_W - 100);
                    let isRed = Math.random() < 0.2; 
                    if (i === 0) isRed = false;
                    
                    let valid = true;
                    if (dx > 170 && dx < 290) valid = false; // keep away from shaft 1
                    if (dx > 470 && dx < 590) valid = false; // keep away from shaft 2
                    
                    if (valid) {
                        this.doors.push(new Door(dx, y + FL_H - 50, isRed));
                        if (isRed) this.documentsLeft++;
                    }
                }
                
                // Enemies
                let enemyProb = Math.min(0.7 + (this.level * 0.05), 0.95);
                if (i > 1 && Math.random() < enemyProb) {
                    let ex = 50 + Math.random() * (C_W - 100);
                    let valid = true;
                    if (ex > 170 && ex < 290) valid = false;
                    if (ex > 470 && ex < 590) valid = false;
                    if (valid) {
                        let e = new Enemy(ex, y + FL_H - 40);
                        e.vx *= (1 + (this.level - 1) * 0.1); 
                        e.cooldown *= (0.9 ** (this.level - 1)); 
                        this.enemies.push(e);
                    }
                }
            }
        }
        
        // Ensure at least one document
        if (this.documentsLeft === 0) {
            this.doors[1].isRed = true;
            this.doors[1].hasDocument = true;
            this.documentsLeft = 1;
        }
        
        this.updateUI();
    }

    updateUI() {
        document.getElementById('score').innerText = this.score;
        document.getElementById('lives').innerText = this.lives;
        document.getElementById('docs').innerText = this.documentsLeft;
    }
    
    update() {
        if (this.state === STATE_START) {
            if (keys.Enter) {
                initAudio();
                this.startLevelTransition();
            }
            return;
        }

        if (this.state === STATE_LEVEL) return;
        
        if (this.state === STATE_GAMEOVER || this.state === STATE_WIN) {
             if (keys.Enter) {
                 this.score = 0;
                 this.lives = 3;
                 this.level = 1;
                 this.initLevel();
                 this.startLevelTransition();
             }
             return;
        }

        // Gameplay update
        this.player.update(this.elevators, this.doors, this.bullets, this);
        
        for (let el of this.elevators) el.update();
        for (let enemy of this.enemies) enemy.update(this.bullets, this.player);
        for (let b of this.bullets) b.update();
        
        // Check collisions
        for (let b of this.bullets) {
            if (!b.active) continue;
            
            if (b.owner === 'player') {
                for (let e of this.enemies) {
                    if (!e.isDead && rectIntersect(b, e)) {
                        e.isDead = true;
                        b.active = false;
                        this.score += 100;
                        this.updateUI();
                    }
                }
            } else if (b.owner === 'enemy') {
                if (!this.player.isDead && !this.player.enteringDoor) {
                    let pRect = {
                        x: this.player.x, 
                        y: this.player.isDucking ? this.player.y + this.player.h/2 : this.player.y,
                        w: this.player.w,
                        h: this.player.isDucking ? this.player.h/2 : this.player.h
                    };
                    
                    if (rectIntersect(b, pRect)) {
                        this.player.die();
                        b.active = false;
                    }
                }
            }
        }
        
        // Clean up
        this.enemies = this.enemies.filter(e => !e.isDead);
        this.bullets = this.bullets.filter(b => b.active);
        
        // Player death sequence
        if (this.player.isDead) {
            this.lives--;
            this.updateUI();
            if (this.lives <= 0) {
                this.setState(STATE_GAMEOVER);
            } else {
                // Respawn slightly higher
                let respawnY = Math.floor(this.player.y / FL_H) * FL_H;
                if (respawnY < 0) respawnY = 0;
                this.player = new Player(C_W / 2, respawnY);
            }
        }
        
        // Win condition (reach bottom floor and have all documents)
        if (this.player.y >= B_H - this.player.h && this.player.isGrounded) {
             if (this.documentsLeft <= 0) {
                 this.score += 1000;
                 this.updateUI();
                 Sound.levelComplete();
                 this.level++;
                 this.initLevel();
                 this.startLevelTransition();
             }
        }
    }
    
    startLevelTransition() {
        this.setState(STATE_LEVEL);
        document.getElementById('level-title').innerText = `LEVEL ${this.level}`;
        setTimeout(() => {
            if (this.state === STATE_LEVEL) {
                this.setState(STATE_PLAYING);
            }
        }, 3000);
    }
    
    draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, C_W, C_H);
        
        if (this.state !== STATE_PLAYING) return;
        
        let scrollY = this.player.y - C_H / 2 + this.player.h / 2;
        if (scrollY < 0) scrollY = 0;
        if (scrollY > B_H - C_H) scrollY = B_H - C_H;
        
        // Draw Floors
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#222';
        for (let i = 0; i <= FLOORS; i++) {
            let y = i * FL_H - scrollY;
            
            let segments = [
                {x: 0, w: 200},
                {x: 260, w: 240},
                {x: 560, w: 240}
            ];
            
            if (i === FLOORS) {
                 segments = [{x: 0, w: C_W}]; // Solid bottom floor
            }
            
            for (let seg of segments) {
                ctx.beginPath();
                ctx.moveTo(seg.x, y);
                ctx.lineTo(seg.x + seg.w, y);
                ctx.stroke();
                ctx.fillRect(seg.x, y, seg.w, 10);
            }
        }
        
        // Draw Doors
        for (let d of this.doors) d.draw(ctx, scrollY);
        
        // Draw Elevators
        for (let el of this.elevators) el.draw(ctx, scrollY);
        
        // Draw Entities
        for (let e of this.enemies) e.draw(ctx, scrollY);
        this.player.draw(ctx, scrollY);
        for (let b of this.bullets) b.draw(ctx, scrollY);
        
        // Missing documents indicator
        if (this.player.y > B_H - FL_H * 2 && this.documentsLeft > 0) {
             ctx.fillStyle = '#f33';
             ctx.font = '16px "Press Start 2P"';
             ctx.fillText(`MISSING ${this.documentsLeft} DOCUMENTS!`, C_W/2 - 180, 50);
        }
    }
    
    setState(newState) {
        this.state = newState;
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        if (newState === STATE_START) document.getElementById('start-screen').classList.add('active');
        if (newState === STATE_GAMEOVER) {
            document.getElementById('final-score').innerText = this.score;
            document.getElementById('game-over-screen').classList.add('active');
        }
        if (newState === STATE_WIN) {
            document.getElementById('win-score').innerText = this.score;
            document.getElementById('win-screen').classList.add('active');
        }
        if (newState === STATE_LEVEL) {
            document.getElementById('level-screen').classList.add('active');
        }
    }
}

const game = new Game();

function loop() {
    game.update();
    game.draw();
    requestAnimationFrame(loop);
}

loop();
