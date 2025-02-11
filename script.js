const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let food = { x: 0, y: 0 };
let bonus = { x: 0, y: 0, active: false };
let score = 0;
let highestScore = localStorage.getItem("highestScore")
  ? parseInt(localStorage.getItem("highestScore"))
  : 0;
let gameOver = false;
let paused = false;
let wallsEnabled = false;
let mazeEnabled = false;
let mazeWalls = [];
let foodTimeout;
let bonusTimeout;
let naturalModeInterval;

let hue = 0;

const currentScoreElement = document.getElementById("current-score");
const highestScoreElement = document.getElementById("highest-score");
const restartButton = document.getElementById("restart-button");
const pauseButton = document.getElementById("pause-button");

// Initially hide the restart button
restartButton.style.display = "none";

function placeFood() {
  clearTimeout(foodTimeout);
  do {
    food.x = Math.floor(Math.random() * (canvas.width / 10)) * 10;
    food.y = Math.floor(Math.random() * (canvas.height / 10)) * 10;
  } while (isWall(food) || collisionWithSnake(food));
  foodTimeout = setTimeout(placeFood, 20000); // 20 seconds timeout for normal food
}

function placeBonus() {
  clearTimeout(bonusTimeout);
  if (!bonus.active) {
    do {
      bonus.x = Math.floor(Math.random() * (canvas.width / 10)) * 10;
      bonus.y = Math.floor(Math.random() * (canvas.height / 10)) * 10;
    } while (isWall(bonus) || collisionWithSnake(bonus));
    bonus.active = true;
    bonusTimeout = setTimeout(() => {
      bonus.active = false;
      placeBonus();
    }, 10000); // 10 seconds timeout for bonus food
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  snake.forEach((segment, index) => {
    const gradient = ctx.createLinearGradient(
      segment.x,
      segment.y,
      segment.x + 10,
      segment.y + 10
    );
    gradient.addColorStop(0, "green");
    gradient.addColorStop(1, "darkgreen");
    ctx.fillStyle = gradient;
    ctx.fillRect(segment.x, segment.y, 10, 10);
    ctx.strokeStyle = "black";
    ctx.strokeRect(segment.x, segment.y, 10, 10);

    // Draw eyes on the head
    if (index === 0) {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(segment.x + 3, segment.y + 3, 2, 0, Math.PI * 2);
      ctx.arc(segment.x + 7, segment.y + 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(segment.x + 3, segment.y + 3, 1, 0, Math.PI * 2);
      ctx.arc(segment.x + 7, segment.y + 3, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.fillStyle = "darkblue";
  ctx.beginPath();
  ctx.arc(food.x + 5, food.y + 5, 5, 0, Math.PI * 2);
  ctx.fill();

  if (bonus.active) {
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(bonus.x + 5, bonus.y + 5, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (wallsEnabled) {
    ctx.fillStyle = "darkred";
    ctx.fillRect(0, 0, canvas.width, 10); // Top wall
    ctx.fillRect(0, canvas.height - 10, canvas.width, 10); // Bottom wall
    ctx.fillRect(0, 0, 10, canvas.height); // Left wall
    ctx.fillRect(canvas.width - 10, 0, 10, canvas.height); // Right wall
  }

  if (mazeEnabled) {
    // Change the color of the maze walls here
    ctx.fillStyle = "darkred"; // Default color is darkred
    mazeWalls.forEach((wall) => {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
  }

  currentScoreElement.textContent = "Score: " + score;
  highestScoreElement.textContent = "Highest Score: " + highestScore;
}

function update() {
  if (gameOver || paused) return;
  let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Handle teleportation
  if (!wallsEnabled) {
    if (head.x < 0) head.x = canvas.width - 10;
    if (head.x >= canvas.width) head.x = 0;
    if (head.y < 0) head.y = canvas.height - 10;
    if (head.y >= canvas.height) head.y = 0;
  }

  if (wallsEnabled || mazeEnabled) {
    if (
      collision(head) ||
      (wallsEnabled && hitWall(head)) ||
      (mazeEnabled && hitMazeWall(head))
    ) {
      gameOver = true;
      displayGameOverMessage();
      if (score > highestScore) {
        highestScore = score;
        localStorage.setItem("highestScore", highestScore);
      }
      return;
    }
  } else {
    if (collision(head)) {
      gameOver = true;
      displayGameOverMessage();
      if (score > highestScore) {
        highestScore = score;
        localStorage.setItem("highestScore", highestScore);
      }
      return;
    }
  }

  if (head.x === food.x && head.y === food.y) {
    score++;
    placeFood();
    if (Math.random() < 0.3) {
      placeBonus();
    }
  } else if (bonus.active && head.x === bonus.x && head.y === bonus.y) {
    score += 2;
    snake.push({ ...snake[snake.length - 1] });
    bonus.active = false;
  } else {
    snake.pop();
  }

  snake.unshift(head);
}

function collision(head) {
  return snake.some(
    (segment, index) =>
      index !== 0 && segment.x === head.x && segment.y === head.y
  );
}

function hitWall(head) {
  return (
    head.x < 10 ||
    head.x >= canvas.width - 10 ||
    head.y < 10 ||
    head.y >= canvas.height - 10
  );
}

function hitMazeWall(head) {
  return mazeWalls.some(
    (wall) =>
      head.x >= wall.x &&
      head.x < wall.x + wall.width &&
      head.y >= wall.y &&
      head.y < wall.y + wall.height
  );
}

function isWall(position) {
  return hitWall(position) || hitMazeWall(position);
}

function changeDirection(event) {
  switch (event.key) {
    case "ArrowUp":
      if (direction.y === 0) direction = { x: 0, y: -10 };
      break;
    case "ArrowDown":
      if (direction.y === 0) direction = { x: 0, y: 10 };
      break;
    case "ArrowLeft":
      if (direction.x === 0) direction = { x: -10, y: 0 };
      break;
    case "ArrowRight":
      if (direction.x === 0) direction = { x: 10, y: 0 };
      break;
  }
}

document.addEventListener("keydown", changeDirection);

function displayGameOverMessage() {
  const gameOverMessage = document.createElement("div");
  gameOverMessage.textContent = "Game Over! Your score: " + score;
  gameOverMessage.style.position = "absolute";
  gameOverMessage.style.top = "50%";
  gameOverMessage.style.left = "50%";
  gameOverMessage.style.transform = "translate(-50%, -50%)";
  gameOverMessage.style.padding = "20px";
  gameOverMessage.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  gameOverMessage.style.color = "white";
  gameOverMessage.style.fontSize = "24px";
  gameOverMessage.style.borderRadius = "10px";
  gameOverMessage.style.opacity = "1";
  gameOverMessage.style.transition = "opacity 2s";

  document.body.appendChild(gameOverMessage);

  // Show the restart button in the middle of the screen
  restartButton.style.display = "block";
  restartButton.style.position = "absolute";
  restartButton.style.top = "50%";
  restartButton.style.left = "50%";
  restartButton.style.transform = "translate(-50%, -50%)";

  setTimeout(() => {
    gameOverMessage.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(gameOverMessage);
    }, 2000);
  }, 2000);
}

document.getElementById("tips-button").addEventListener("click", () => {
  const tipsPopup = document.getElementById("tips-popup");
  tipsPopup.classList.toggle("show");
  setTimeout(() => {
    tipsPopup.classList.remove("show");
  }, 5000);
});

document
  .getElementById("walls-checkbox")
  .addEventListener("change", (event) => {
    wallsEnabled = event.target.checked;
  });

document.getElementById("maze-checkbox").addEventListener("change", (event) => {
  mazeEnabled = event.target.checked;
  if (mazeEnabled) {
    generateMazeWalls();
  } else {
    mazeWalls = [];
  }
});

function generateMazeWalls() {
  mazeWalls = [];
  const wallCount = 35; // Increased number of walls
  const wallLength = 60; // Increased length of each wall
  for (let i = 0; i < wallCount; i++) {
    let x, y, horizontal, wall;
    do {
      x = Math.floor(Math.random() * (canvas.width / 10)) * 10;
      y = Math.floor(Math.random() * (canvas.height / 10)) * 10;
      horizontal = Math.random() > 0.5;
      wall = {
        x: x,
        y: y,
        width: horizontal ? wallLength : 10,
        height: horizontal ? 10 : wallLength,
      };
    } while (
      mazeWalls.some(
        (existingWall) =>
          wall.x < existingWall.x + existingWall.width &&
          wall.x + wall.width > existingWall.x &&
          wall.y < existingWall.y + existingWall.height &&
          wall.y + wall.height > existingWall.y
      ) ||
      collisionWithSnake(wall) ||
      collisionWithFood(wall)
    );
    mazeWalls.push(wall);
  }
}

function collisionWithSnake(wall) {
  return snake.some(
    (segment) =>
      wall.x < segment.x + 10 &&
      wall.x + wall.width > segment.x &&
      wall.y < segment.y + 10 &&
      wall.y + wall.height > segment.y
  );
}

function collisionWithFood(wall) {
  return (
    (wall.x < food.x + 10 &&
      wall.x + wall.width > food.x &&
      wall.y < food.y + 10 &&
      wall.y + wall.height > food.y) ||
    (bonus.active &&
      wall.x < bonus.x + 10 &&
      wall.x + wall.width > bonus.x &&
      wall.y < bonus.y + 10 &&
      wall.y + wall.height > bonus.y)
  );
}

let gameSpeed = 100;
let gameInterval;

function setGameSpeed(speed) {
  gameSpeed = speed;
  clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    draw();
    update();
    hue += 2;
    if (hue >= 360) hue = 0;
  }, gameSpeed);
}

function setActiveMode(buttonId) {
  const buttons = document.querySelectorAll(".game-btn");
  buttons.forEach((button) => {
    if (button.id === buttonId) {
      button.classList.add("active-mode");
    } else {
      button.classList.remove("active-mode");
    }
  });
}

document.getElementById("easy-mode").addEventListener("click", () => {
  setGameSpeed(150);
  setActiveMode("easy-mode");
  clearInterval(naturalModeInterval);
});

document.getElementById("normal-mode").addEventListener("click", () => {
  setGameSpeed(100);
  setActiveMode("normal-mode");
  clearInterval(naturalModeInterval);
});

document.getElementById("hard-mode").addEventListener("click", () => {
  setGameSpeed(50);
  setActiveMode("hard-mode");
  clearInterval(naturalModeInterval);
});

document.getElementById("natural-mode").addEventListener("click", () => {
  setGameSpeed(150);
  setActiveMode("natural-mode");
  clearInterval(naturalModeInterval);
  naturalModeInterval = setInterval(() => {
    setGameSpeed(gameSpeed - 10); // Increase speed gradually
  }, 20000); // Every 20 seconds
});

// Initial game setup
placeFood();
placeBonus();
setGameSpeed(gameSpeed);

restartButton.addEventListener("click", () => {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 0, y: 0 };
  score = 0;
  gameOver = false;
  paused = false;
  placeFood();
  bonus.active = false;
  currentScoreElement.textContent = "Score: " + score;

  // Hide the restart button
  restartButton.style.display = "none";
});

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
});

highestScoreElement.textContent = "Highest Score: " + highestScore;

document.getElementById("up-button").addEventListener("click", () => {
  if (direction.y === 0) direction = { x: 0, y: -10 };
});

document.getElementById("down-button").addEventListener("click", () => {
  if (direction.y === 0) direction = { x: 0, y: 10 };
});

document.getElementById("left-button").addEventListener("click", () => {
  if (direction.x === 0) direction = { x: -10, y: 0 };
});

document.getElementById("right-button").addEventListener("click", () => {
  if (direction.x === 0) direction = { x: 10, y: 0 };
});
document.addEventListener("DOMContentLoaded", () => {
  const notification = document.getElementById("notification2");

  // Show the notification
  notification2.classList.add("show");

  // Hide the notification after 3 seconds
  setTimeout(() => {
    notification2.classList.remove("show");
  }, 3000);
});
