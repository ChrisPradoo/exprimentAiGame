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
const bgMusic = document.getElementById('bgMusic');

// Game variables
let player, obstacles, score, gameSpeed, gravity, jumpPower, isJumping, isGameOver, animationId, decorShapes, playerName;
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
}

function startGame() {
    playerName = playerNameInput.value.trim() || 'Player';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    resetGame();
    spawnObstacle();
    playMusic();
    gameLoop();
}

function gameOver() {
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
}

function spawnObstacle() {
    const height = 40 + Math.random() * 40;
    const width = 20 + Math.random() * 30;
    const y = canvas.height - height - 20;
    let lastX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : 0;
    let minGap = minObstacleGap + Math.random() * 100;
    let spawnX = Math.max(canvas.width, lastX + minGap);
    obstacles.push({
        x: spawnX,
        y: y,
        width: width,
        height: height,
        color: '#ff0055'
    });
}

function handleJump() {
    if (player.onGround && !isGameOver) {
        player.velocityY = jumpPower;
        player.onGround = false;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        handleJump();
    }
});
canvas.addEventListener('mousedown', handleJump);

startBtn.onclick = startGame;
restartBtn.onclick = startGame;

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
    player.y += player.velocityY;
    player.velocityY += gravity;
    if (player.y + player.height >= canvas.height - 20) {
        player.y = canvas.height - player.height - 20;
        player.velocityY = 0;
        player.onGround = true;
    }

    // Draw and update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Collision detection
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
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
}

gameOverScreen.style.display = 'none';
gameContainer.style.display = 'none';

// Music controls
function playMusic() {
    if (bgMusic) {
        bgMusic.currentTime = 0;
        bgMusic.volume = 0.3;
        // Try to play, catch errors for autoplay policy
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // If not allowed, play on first user interaction
                document.body.addEventListener('pointerdown', () => {
                    bgMusic.play();
                }, { once: true });
            });
        }
    }
}
function stopMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
}

// Initial screen setup
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';
gameContainer.style.display = 'none';
