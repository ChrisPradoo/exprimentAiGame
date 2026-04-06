const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreDiv = document.getElementById('score');
const finalScoreDiv = document.getElementById('finalScore');
const gameContainer = document.getElementById('gameContainer');
const highScoreDiv = document.getElementById('highScore');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const playerNameInput = document.getElementById('playerName');
const menuDemoCanvas = document.getElementById('menuDemo');
const levelsSelect = document.getElementById('levels');
const muteBtn = document.getElementById('muteBtn');

// Game variables
let player, obstacles, score, gameSpeed, gravity, jumpPower, isJumping, isGameOver, animationId, decorShapes, playerName;
let bgMusicAudio = null;
let muted = false;
let selectedLevelIndex = 0;
let isDying = false;
let deathParticles = [];
let deathTimer = 0;
let highScore = 0;
let highScoreName = '';
let minObstacleGap = 350;

// Load high score from localStorage
if (localStorage.getItem('gdashHighScore')) {
    highScore = parseInt(localStorage.getItem('gdashHighScore'));
    highScoreName = localStorage.getItem('gdashHighScoreName') || '';
}
if (highScoreDisplay) {
    highScoreDisplay.textContent = highScore > 0 ? `High Score: ${highScore} (${highScoreName})` : '';
}

// Levels / biomes
const LEVELS = [
    { id: 'forest', name: 'Forest', bgGradient: 'linear-gradient(120deg,#022 0%, #0b3 100%)', music: 'music_forest.mp3', obstacleColor: '#2b8a3e', twisterChance: 0.06, baseSpeed: 5 },
    { id: 'desert', name: 'Desert', bgGradient: 'linear-gradient(120deg,#f6e27a 0%, #f39c12 100%)', music: 'music_desert.mp3', obstacleColor: '#b5651d', twisterChance: 0.04, baseSpeed: 6 },
    { id: 'neon', name: 'Neon', bgGradient: 'linear-gradient(120deg,#0ff 0%, #ff00d4 100%)', music: 'music_neon.mp3', obstacleColor: '#ff0055', twisterChance: 0.12, baseSpeed: 7 }
];

function resetGame() {
    player = {
        x: 80,
        y: 300,
        width: 40,
        height: 40,
        velocityY: 0,
        color: '#00eaff',
        onGround: true
    };
    obstacles = [];
    score = 0;
    gameSpeed = 6;
    gravity = 0.55; // slower gravity
    jumpPower = -13; // adjust for slower gravity
    isJumping = false;
    isGameOver = false;
    scoreDiv.textContent = 'Score: 0';
    highScoreDiv.textContent = `High Score: ${highScore} ${highScoreName ? '(' + highScoreName + ')' : ''}`;
    // Decorations
    decorShapes = [];
    for (let i = 0; i < 12; i++) {
        decorShapes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height - 100),
            r: 10 + Math.random() * 30,
            color: `hsl(${Math.random()*360}, 80%, 60%)`,
            speed: 0.5 + Math.random()
        });
    }
    isDying = false;
    deathParticles = [];
    deathTimer = 0;
}

function startGame(easyRetry = false) {
    playerName = playerNameInput.value.trim() || 'Player';
    selectedLevelIndex = parseInt(levelsSelect.value || '0', 10);
    const level = LEVELS[selectedLevelIndex];
    // Apply visual theme
    document.body.style.background = level.bgGradient;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    resetGame();
    // level-specific tuning
    gameSpeed = easyRetry ? Math.max(3, level.baseSpeed - 1.5) : level.baseSpeed;
    minObstacleGap = easyRetry ? 420 : 320;
    // obstacle color default
    spawnObstacle();
    playMusicForLevel(level);
    gameLoop();
}

function gameOver() {
    // start death particle animation then show game over
    isDying = true;
    createDeathParticles();
    // stop spawning further obstacles
    setTimeout(() => {
        isGameOver = true;
        cancelAnimationFrame(animationId);
        gameContainer.style.display = 'none';
        gameOverScreen.style.display = 'flex';
        finalScoreDiv.textContent = `Final Score: ${score}`;
        stopMusic();
        // High score logic
        if (score > highScore) {
            highScore = score;
            highScoreName = playerName;
            localStorage.setItem('gdashHighScore', highScore);
            localStorage.setItem('gdashHighScoreName', highScoreName);
            if (highScoreDisplay) highScoreDisplay.textContent = `High Score: ${highScore} (${highScoreName})`;
        }
    }, 700);
}

function spawnObstacle() {
    const level = LEVELS[selectedLevelIndex] || LEVELS[0];
    // Decide whether to spawn a twister
    const isTwister = Math.random() < (level.twisterChance || 0);
    if (isTwister) {
        const size = 48 + Math.random() * 48;
        const y = 80 + Math.random() * (canvas.height - 200);
        let lastX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : 0;
        let minGap = minObstacleGap + Math.random() * 120;
        let spawnX = Math.max(canvas.width + 100, lastX + minGap);
        obstacles.push({ x: spawnX, y: y, size: size, type: 'twister', color: level.obstacleColor });
        return;
    }
    const height = 40 + Math.random() * 40;
    const width = 20 + Math.random() * 30;
    const y = canvas.height - height - 20;
    let lastX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : 0;
    let minGap = minObstacleGap + Math.random() * 100;
    let spawnX = Math.max(canvas.width, lastX + minGap);
    obstacles.push({ x: spawnX, y: y, width: width, height: height, color: level.obstacleColor });
}

function handleJump() {
    if (player.onGround && !isGameOver) {
        player.velocityY = jumpPower;
        player.onGround = false;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isGameOver) {
            // quick retry with easier difficulty
            startGame(true);
        } else if (!isDying) {
            handleJump();
        }
    }
});
canvas.addEventListener('mousedown', handleJump);

startBtn.onclick = startGame;
restartBtn.onclick = () => startGame(true);

levelsSelect.addEventListener('change', () => {
    selectedLevelIndex = parseInt(levelsSelect.value, 10);
});

muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = muted ? 'Muted' : 'Unmute';
    if (bgMusicAudio) bgMusicAudio.muted = muted;
});

function gameLoop() {
    animationId = requestAnimationFrame(gameLoop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw decorations (background shapes)
    for (let shape of decorShapes) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.r, 0, 2 * Math.PI);
        ctx.fillStyle = shape.color;
        ctx.fill();
        ctx.restore();
        shape.x -= shape.speed;
        if (shape.x + shape.r < 0) {
            shape.x = canvas.width + shape.r;
            shape.y = Math.random() * (canvas.height - 100);
            shape.r = 10 + Math.random() * 30;
            shape.color = `hsl(${Math.random()*360}, 80%, 60%)`;
            shape.speed = 0.5 + Math.random();
        }
    }

    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player physics
    if (!isDying) {
        player.y += player.velocityY;
        player.velocityY += gravity;
        if (player.y + player.height >= canvas.height - 20) {
            player.y = canvas.height - player.height - 20;
            player.velocityY = 0;
            player.onGround = true;
        }
    }

    // Draw and update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;
        if (obs.type === 'twister') {
            // twister rotates and moves vertically in a sine wave
            const t = performance.now() / 1000;
            const amp = 18;
            obs.y += Math.sin(t * (0.5 + obs.size * 0.01)) * 0.6;
            // draw spiral-ish
            ctx.save();
            ctx.translate(obs.x + obs.size/2, obs.y + obs.size/2);
            ctx.rotate(t % (Math.PI*2));
            ctx.fillStyle = obs.color;
            for (let s = 0; s < 5; s++) {
                ctx.beginPath();
                ctx.arc(0, 0, obs.size * (0.2 + s*0.15), 0, Math.PI*2 * (0.6 - s*0.08));
                ctx.fill();
            }
            ctx.restore();

            // approximate collision circle
            const cx = obs.x + obs.size/2;
            const cy = obs.y + obs.size/2;
            const prx = player.x + player.width/2;
            const pry = player.y + player.height/2;
            const dist = Math.hypot(cx - prx, cy - pry);
            if (dist < obs.size * 0.6 + Math.max(player.width, player.height)/2) {
                // collision
                createDeathParticles();
                gameOver();
                return;
            }

            if (obs.x + obs.size < 0) {
                obstacles.splice(i, 1);
                score++;
                scoreDiv.textContent = `Score: ${score}`;
                if (score % 5 === 0) gameSpeed += 0.5;
                if (score > highScore) highScoreDiv.textContent = `High Score: ${score} (${playerName})`;
            }
            continue;
        }

        // normal obstacle
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Collision detection
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            createDeathParticles();
            gameOver();
            return;
        }

        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            score++;
            scoreDiv.textContent = `Score: ${score}`;
            // Increase speed every 5 points
            if (score % 5 === 0) gameSpeed += 0.5;
            // Update high score live
            if (score > highScore) {
                highScoreDiv.textContent = `High Score: ${score} (${playerName})`;
            }
        }
    }

    // Spawn new obstacles
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - minObstacleGap) {
        spawnObstacle();
    }

    // Death particle animation
    if (isDying && deathParticles.length > 0) {
        for (let i = deathParticles.length - 1; i >= 0; i--) {
            const p = deathParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4; // gravity
            p.life -= 1;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            if (p.life <= 0) deathParticles.splice(i, 1);
        }
    }
}

gameOverScreen.style.display = 'none';
gameContainer.style.display = 'none';

// Music controls
function playMusicForLevel(level) {
    try {
        if (bgMusicAudio) {
            bgMusicAudio.pause();
            bgMusicAudio = null;
        }
        if (!level || !level.music) return;
        bgMusicAudio = new Audio(level.music);
        bgMusicAudio.loop = true;
        bgMusicAudio.volume = 0.28;
        bgMusicAudio.muted = muted;
        const playPromise = bgMusicAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                document.body.addEventListener('pointerdown', () => {
                    if (bgMusicAudio) bgMusicAudio.play();
                }, { once: true });
            });
        }
    } catch (err) {
        console.warn('Music play failed or file missing', err);
    }
}
function stopMusic() {
    try {
        if (bgMusicAudio) {
            bgMusicAudio.pause();
            bgMusicAudio.currentTime = 0;
        }
    } catch (err) {}
}

function createDeathParticles() {
    deathParticles = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
        deathParticles.push({
            x: player.x + player.width/2,
            y: player.y + player.height/2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 1.5) * 6,
            size: 4 + Math.random() * 6,
            life: 30 + Math.random() * 30,
            color: player.color
        });
    }
    isDying = true;
}

// Simple menu demo that loops while on the start screen
let demoAnimId = null;
const demo = {
    ctx: menuDemoCanvas ? menuDemoCanvas.getContext('2d') : null,
    w: menuDemoCanvas ? menuDemoCanvas.width : 800,
    h: menuDemoCanvas ? menuDemoCanvas.height : 240,
    player: { x: 60, y: 180, w: 36, h: 36, vy: 0, onGround: true },
    obstacles: [],
    speed: 4
};

function resetDemo() {
    if (!demo.ctx) return;
    demo.obstacles = [];
    demo.player.y = demo.h - demo.player.h - 20;
    demo.player.vy = 0;
    demo.player.onGround = true;
}

function spawnDemoObstacle() {
    const w = 18 + Math.random() * 22;
    const h = 24 + Math.random() * 36;
    demo.obstacles.push({ x: demo.w + 40, y: demo.h - h - 20, w, h, color: '#ff3366' });
}

function startMenuDemo() {
    if (!demo.ctx) return;
    resetDemo();
    if (demoAnimId) cancelAnimationFrame(demoAnimId);
    let lastSpawn = 0;
    function loop(t) {
        demoAnimId = requestAnimationFrame(loop);
        const ctxd = demo.ctx;
        ctxd.clearRect(0, 0, demo.w, demo.h);
        // background
        ctxd.fillStyle = 'rgba(0,0,0,0.06)';
        ctxd.fillRect(0,0,demo.w,demo.h);
        // player
        ctxd.fillStyle = '#00eaff';
        ctxd.fillRect(demo.player.x, demo.player.y, demo.player.w, demo.player.h);
        // physics
        demo.player.y += demo.player.vy;
        demo.player.vy += 0.6;
        if (demo.player.y + demo.player.h >= demo.h - 20) {
            demo.player.y = demo.h - demo.player.h - 20;
            demo.player.vy = 0;
            demo.player.onGround = true;
        }
        // obstacles
        for (let i = demo.obstacles.length - 1; i >= 0; i--) {
            const o = demo.obstacles[i];
            o.x -= demo.speed;
            ctxd.fillStyle = o.color;
            ctxd.fillRect(o.x, o.y, o.w, o.h);
            if (o.x + o.w < 0) demo.obstacles.splice(i,1);
            // if close and on ground, jump automatically
            if (o.x - demo.player.x < 120 && demo.player.onGround) {
                demo.player.vy = -11;
                demo.player.onGround = false;
            }
        }
        if (t - lastSpawn > 900 + Math.random()*600) {
            spawnDemoObstacle();
            lastSpawn = t;
        }
    }
    demoAnimId = requestAnimationFrame(loop);
}

// Start demo and restart demo when level selection changes
if (menuDemoCanvas) startMenuDemo();
levelsSelect && levelsSelect.addEventListener('change', () => {
    // give a visual preview by changing demo speed/color
    const lvl = LEVELS[parseInt(levelsSelect.value,10)];
    if (lvl) demo.speed = lvl.baseSpeed - 1.5;
    resetDemo();
});

// Initial screen setup
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';
gameContainer.style.display = 'none';
