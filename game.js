const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreDiv = document.getElementById('score');
const finalScoreDiv = document.getElementById('finalScore');
const gameContainer = document.getElementById('gameContainer');

// Game variables
let player, obstacles, score, gameSpeed, gravity, jumpPower, isJumping, isGameOver, animationId;

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
    gravity = 1.1;
    jumpPower = -18;
    isJumping = false;
    isGameOver = false;
    scoreDiv.textContent = 'Score: 0';
}

function startGame() {
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    resetGame();
    spawnObstacle();
    gameLoop();
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    gameContainer.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    finalScoreDiv.textContent = `Final Score: ${score}`;
}

function spawnObstacle() {
    const height = 40 + Math.random() * 40;
    const width = 20 + Math.random() * 30;
    const y = canvas.height - height - 20;
    obstacles.push({
        x: canvas.width,
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
        }
    }

    // Spawn new obstacles
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 300) {
        spawnObstacle();
    }
}

// Initial screen setup
startScreen.style.display = 'flex';
gameOverScreen.style.display = 'none';
gameContainer.style.display = 'none';
