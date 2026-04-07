const statsDisplay = document.getElementById('statsDisplay');
function updateStatsDisplay() {
    if (!statsDisplay) return;
    let html = '<b>Level Progress:</b><br>';
    for (let i = 0; i < LEVELS.length; i++) {
        const lvl = LEVELS[i];
        const done = completedLevels.includes(i);
        const best = stats[lvl.id]?.bestScore || 0;
        html += `<span style="color:${done ? '#0f0':'#fff'};font-weight:${done?'bold':'normal'}">${lvl.name}</span> - ${done ? '✔️ Completed' : '❌ Not completed'} | Best: ${best}<br>`;
    }
    statsDisplay.innerHTML = html;
}
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
const mainMenuBtn = document.getElementById('mainMenuBtn');
const endingScreen = document.getElementById('endingScreen');
const endingTitle = document.getElementById('endingTitle');
const endingStats = document.getElementById('endingStats');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const endingMenuBtn = document.getElementById('endingMenuBtn');

// Track completed levels and stats
let completedLevels = JSON.parse(localStorage.getItem('gdashCompletedLevels') || '[]');
let stats = JSON.parse(localStorage.getItem('gdashStats') || '{}');

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
    { id: 'forest', name: 'Forest', bgGradient: 'linear-gradient(120deg,#022 0%, #0b3 100%)', music: 'music_forest.mp3', obstacleColor: '#2b8a3e', twisterChance: 0.06, baseSpeed: 5, decor: 'trees' },
    { id: 'desert', name: 'Desert', bgGradient: 'linear-gradient(120deg,#f6e27a 0%, #f39c12 100%)', music: 'music_desert.mp3', obstacleColor: '#b5651d', twisterChance: 0.04, baseSpeed: 6, decor: 'cactus' },
    { id: 'neon', name: 'Neon', bgGradient: 'linear-gradient(120deg,#0ff 0%, #ff00d4 100%)', music: 'music_neon.mp3', obstacleColor: '#ff0055', twisterChance: 0.12, baseSpeed: 7, decor: 'neon' },
    { id: 'crystal', name: 'Crystal Caverns', bgGradient: 'linear-gradient(120deg,#b3e6ff 0%, #6a1b9a 100%)', music: 'music_crystal.mp3', obstacleColor: '#7c4dff', twisterChance: 0.09, baseSpeed: 6, decor: 'crystals' }
];

// Level length in obstacles (can be tuned per level)
const LEVEL_LENGTHS = [18, 22, 26, 30, 36];

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
    const level = LEVELS[selectedLevelIndex] || LEVELS[0];
    for (let i = 0; i < 12; i++) {
        if (level.decor === 'trees') {
            // Forest: trees
            decorShapes.push({
                type: 'tree',
                x: Math.random() * canvas.width,
                y: canvas.height - 80 - Math.random() * 60,
                w: 18 + Math.random() * 18,
                h: 60 + Math.random() * 40,
                color: '#145a32',
                speed: 0.7 + Math.random() * 0.5
            });
        } else if (level.decor === 'cactus') {
            // Desert: cactus
            decorShapes.push({
                type: 'cactus',
                x: Math.random() * canvas.width,
                y: canvas.height - 60 - Math.random() * 30,
                w: 14 + Math.random() * 10,
                h: 40 + Math.random() * 30,
                color: '#b5651d',
                speed: 0.6 + Math.random() * 0.4
            });
        } else if (level.decor === 'crystals') {
            // Crystal Caverns: crystals
            decorShapes.push({
                type: 'crystal',
                x: Math.random() * canvas.width,
                y: canvas.height - 70 - Math.random() * 40,
                w: 16 + Math.random() * 18,
                h: 50 + Math.random() * 40,
                color: `hsl(${260 + Math.random()*60}, 80%, 70%)`,
                speed: 0.8 + Math.random() * 0.6
            });
        } else if (level.decor === 'neon') {
            // Neon: glowing shapes
            decorShapes.push({
                type: 'neon',
                x: Math.random() * canvas.width,
                y: Math.random() * (canvas.height - 100),
                r: 10 + Math.random() * 30,
                color: `hsl(${Math.random()*360}, 100%, 60%)`,
                speed: 1.2 + Math.random() * 0.8
            });
        } else {
            // fallback: colored circles
            decorShapes.push({
                type: 'circle',
                x: Math.random() * canvas.width,
                y: Math.random() * (canvas.height - 100),
                r: 10 + Math.random() * 30,
                color: `hsl(${Math.random()*360}, 80%, 60%)`,
                speed: 0.5 + Math.random()
            });
        }
    }
    isDying = false;
    deathParticles = [];
    deathTimer = 0;
    levelObstaclesPassed = 0;
}

let levelObstaclesPassed = 0;
let levelCompleted = false;

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
    levelCompleted = false;
    // level-specific tuning
    gameSpeed = easyRetry ? Math.max(3, level.baseSpeed - 1.5) : level.baseSpeed;
    minObstacleGap = easyRetry ? 420 : 320;
    // obstacle color default
    spawnObstacle();
    playMusicForLevel(level);
    gameLoop();
}

function showEndingScreen() {
    // Mark level as completed
    if (!completedLevels.includes(selectedLevelIndex)) {
        completedLevels.push(selectedLevelIndex);
        localStorage.setItem('gdashCompletedLevels', JSON.stringify(completedLevels));
    }
    // Update stats
    stats[LEVELS[selectedLevelIndex].id] = {
        bestScore: Math.max(stats[LEVELS[selectedLevelIndex].id]?.bestScore || 0, score),
        completed: true
    };
    localStorage.setItem('gdashStats', JSON.stringify(stats));
    // Show ending UI
    endingTitle.textContent = `Level Complete! (${LEVELS[selectedLevelIndex].name})`;
    endingStats.innerHTML = `<b>Score:</b> ${score}<br><b>Level:</b> ${LEVELS[selectedLevelIndex].name}`;
    endingScreen.style.display = 'flex';
    gameContainer.style.display = 'none';
    stopMusic();
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
mainMenuBtn.onclick = () => {
    // Hide game over and game, show main menu
    gameOverScreen.style.display = 'none';
    gameContainer.style.display = 'none';
    startScreen.style.display = 'flex';
    updateStatsDisplay();
    // Optionally restart menu demo
    if (menuDemoCanvas) startMenuDemo();
};
if (endingMenuBtn) {
    endingMenuBtn.onclick = () => {
        endingScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        updateStatsDisplay();
        if (menuDemoCanvas) startMenuDemo();
    };
}

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
        if (shape.type === 'tree') {
            // Draw tree trunk
            ctx.fillStyle = '#784421';
            ctx.fillRect(shape.x + shape.w/2 - 4, shape.y + shape.h - 18, 8, 18);
            // Draw tree foliage
            ctx.beginPath();
            ctx.ellipse(shape.x + shape.w/2, shape.y + shape.h/2, shape.w, shape.h/2, 0, 0, Math.PI*2);
            ctx.fillStyle = shape.color;
            ctx.fill();
        } else if (shape.type === 'cactus') {
            // Draw cactus
            ctx.fillStyle = shape.color;
            ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
            ctx.beginPath();
            ctx.arc(shape.x + shape.w/2, shape.y, shape.w/2, Math.PI, 0);
            ctx.fill();
        } else if (shape.type === 'crystal') {
            // Draw crystal
            ctx.beginPath();
            ctx.moveTo(shape.x + shape.w/2, shape.y);
            ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
            ctx.lineTo(shape.x, shape.y + shape.h);
            ctx.closePath();
            ctx.fillStyle = shape.color;
            ctx.shadowColor = shape.color;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (shape.type === 'neon') {
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.r, 0, 2 * Math.PI);
            ctx.fillStyle = shape.color;
            ctx.shadowColor = shape.color;
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.r, 0, 2 * Math.PI);
            ctx.fillStyle = shape.color;
            ctx.fill();
        }
        ctx.restore();
        // Move shape
        shape.x -= shape.speed;
        // Respawn if off screen
        if ((shape.type === 'tree' || shape.type === 'cactus' || shape.type === 'crystal') && shape.x + shape.w < 0) {
            shape.x = canvas.width + shape.w;
        } else if ((shape.type === 'neon' || shape.type === 'circle') && shape.x + (shape.r || 0) < 0) {
            shape.x = canvas.width + (shape.r || 0);
            shape.y = Math.random() * (canvas.height - 100);
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
            levelObstaclesPassed++;
            scoreDiv.textContent = `Score: ${score}`;
            // Increase speed every 5 points
            if (score % 5 === 0) gameSpeed += 0.5;
            // Update high score live
            if (score > highScore) {
                highScoreDiv.textContent = `High Score: ${score} (${playerName})`;
            }
            // Check for level end
            if (!levelCompleted && levelObstaclesPassed >= (LEVEL_LENGTHS[selectedLevelIndex] || 20)) {
                levelCompleted = true;
                setTimeout(showEndingScreen, 800);
            }
        }
    }

    // Spawn new obstacles
    if (!levelCompleted && (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - minObstacleGap)) {
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

// Ending screen buttons
if (nextLevelBtn) {
    nextLevelBtn.onclick = () => {
        // Go to next level or main menu if last
        let nextIdx = (selectedLevelIndex + 1) % LEVELS.length;
        levelsSelect.value = nextIdx;
        selectedLevelIndex = nextIdx;
        endingScreen.style.display = 'none';
        startGame();
    };
}
if (endingMenuBtn) {
    endingMenuBtn.onclick = () => {
        endingScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        if (menuDemoCanvas) startMenuDemo();
    };
}

// Initial screen setup
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';
gameContainer.style.display = 'none';
endingScreen.style.display = 'none';
updateStatsDisplay();
