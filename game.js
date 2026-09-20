const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const COLS = 10;
const ROWS = 20;

let BLOCK;

let board = [];

let score = 0;
let lines = 0;
let level = 1;

let highScore =
    Number(localStorage.getItem("tetrisHighScore")) || 0;

let currentPiece = null;

let dropCounter = 0;
let lastTime = 0;

let dropInterval = 800;

let gameOver = false;
let paused = false;

const colors = {
    I: "#00e5ff",
    O: "#ffd600",
    T: "#b14cff",
    S: "#00e676",
    Z: "#ff3d71",
    J: "#448aff",
    L: "#ff9100"
};

const shapes = {

    I: [
        [1, 1, 1, 1]
    ],

    O: [
        [1, 1],
        [1, 1]
    ],

    T: [
        [0, 1, 0],
        [1, 1, 1]
    ],

    S: [
        [0, 1, 1],
        [1, 1, 0]
    ],

    Z: [
        [1, 1, 0],
        [0, 1, 1]
    ],

    J: [
        [1, 0, 0],
        [1, 1, 1]
    ],

    L: [
        [0, 0, 1],
        [1, 1, 1]
    ]
};

function resizeCanvas() {

    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);

    ctx.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
    );

    BLOCK = rect.width / COLS;

    draw();
}

function createBoard() {

    board = Array.from(
        { length: ROWS },
        () => Array(COLS).fill(null)
    );
}

function randomPiece() {

    const keys = Object.keys(shapes);
    const type =
        keys[Math.floor(Math.random() * keys.length)];

    const matrix = shapes[type].map(row => [...row]);

    return {
        type,
        matrix,
        x: Math.floor(
            (COLS - matrix[0].length) / 2
        ),
        y: 0
    };
}

function rotateMatrix(matrix) {

    return matrix[0].map(
        (_, index) =>
            matrix.map(row => row[index]).reverse()
    );
}

function collision(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {

    for (let y = 0; y < matrix.length; y++) {

        for (let x = 0; x < matrix[y].length; x++) {

            if (!matrix[y][x]) continue;

            const px = piece.x + x + offsetX;
            const py = piece.y + y + offsetY;

            if (
                px < 0 ||
                px >= COLS ||
                py >= ROWS
            ) {
                return true;
            }

            if (py >= 0 && board[py][px]) {
                return true;
            }
        }
    }

    return false;
}

function mergePiece() {

    currentPiece.matrix.forEach((row, y) => {

        row.forEach((value, x) => {

            if (!value) return;

            const py = currentPiece.y + y;
            const px = currentPiece.x + x;

            if (py >= 0) {
                board[py][px] = currentPiece.type;
            }

        });

    });
}

function clearLines() {

    let cleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {

        if (
            board[y].every(cell => cell !== null)
        ) {

            board.splice(y, 1);

            board.unshift(
                Array(COLS).fill(null)
            );

            cleared++;
            y++;
        }
    }

    if (cleared > 0) {

        lines += cleared;

        const points = [
            0,
            100,
            300,
            500,
            800
        ];

        score +=
            points[cleared] * level;

        level =
            Math.floor(lines / 10) + 1;

        dropInterval =
            Math.max(
                80,
                800 - (level - 1) * 65
            );

        updateStats();
    }
}

function spawnPiece() {

    currentPiece = randomPiece();

    if (collision(currentPiece)) {
        endGame();
    }
}

function move(dx) {

    if (paused || gameOver) return;

    if (!collision(currentPiece, dx, 0)) {
        currentPiece.x += dx;
    }

    draw();
}

function rotate() {

    if (paused || gameOver) return;

    const rotated =
        rotateMatrix(currentPiece.matrix);

    const oldX = currentPiece.x;

    let offset = 0;

    if (collision(
        currentPiece,
        0,
        0,
        rotated
    )) {

        offset = 1;

        if (
            collision(
                currentPiece,
                offset,
                0,
                rotated
            )
        ) {

            offset = -1;

            if (
                collision(
                    currentPiece,
                    offset,
                    0,
                    rotated
                )
            ) {
                return;
            }
        }
    }

    currentPiece.x += offset;
    currentPiece.matrix = rotated;

    draw();
}

function softDrop() {

    if (paused || gameOver) return;

    if (
        !collision(
            currentPiece,
            0,
            1
        )
    ) {

        currentPiece.y++;
        score += 1;

    } else {

        lockPiece();
    }

    updateStats();
    draw();
}

function hardDrop() {

    if (paused || gameOver) return;

    let distance = 0;

    while (
        !collision(
            currentPiece,
            0,
            distance + 1
        )
    ) {
        distance++;
    }

    currentPiece.y += distance;

    score += distance * 2;

    lockPiece();

    updateStats();
    draw();
}

function lockPiece() {

    mergePiece();

    clearLines();

    spawnPiece();
}

function update(time = 0) {

    const deltaTime =
        time - lastTime;

    lastTime = time;

    if (!paused && !gameOver) {

        dropCounter += deltaTime;

        if (
            dropCounter >
            dropInterval
        ) {

            softDrop();

            dropCounter = 0;
        }
    }

    draw();

    requestAnimationFrame(update);
}

function drawBlock(x, y, type) {

    const px = x * BLOCK;
    const py = y * BLOCK;

    const size = BLOCK - 2;

    ctx.fillStyle =
        colors[type];

    ctx.beginPath();

    ctx.roundRect(
        px + 1,
        py + 1,
        size,
        size,
        Math.max(3, BLOCK * .12)
    );

    ctx.fill();

    /* light */

    ctx.fillStyle =
        "rgba(255,255,255,.16)";

    ctx.fillRect(
        px + 3,
        py + 3,
        size - 6,
        Math.max(2, size * .09)
    );

    /* shadow */

    ctx.fillStyle =
        "rgba(0,0,0,.18)";

    ctx.fillRect(
        px + 3,
        py + size - 5,
        size - 6,
        3
    );
}

function drawGrid() {

    ctx.strokeStyle =
        "rgba(255,255,255,.025)";

    ctx.lineWidth = 1;

    for (let x = 0; x <= COLS; x++) {

        ctx.beginPath();

        ctx.moveTo(
            x * BLOCK,
            0
        );

        ctx.lineTo(
            x * BLOCK,
            ROWS * BLOCK
        );

        ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y * BLOCK
        );

        ctx.lineTo(
            COLS * BLOCK,
            y * BLOCK
        );

        ctx.stroke();
    }
}

function draw() {

    if (!BLOCK) return;

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    ctx.fillStyle =
        "#05070c";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    drawGrid();

    /* board */

    for (let y = 0; y < ROWS; y++) {

        for (let x = 0; x < COLS; x++) {

            if (board[y][x]) {
                drawBlock(
                    x,
                    y,
                    board[y][x]
                );
            }
        }
    }

    /* current piece */

    if (currentPiece) {

        currentPiece.matrix.forEach(
            (row, y) => {

                row.forEach(
                    (value, x) => {

                        if (!value) return;

                        const px =
                            currentPiece.x + x;

                        const py =
                            currentPiece.y + y;

                        if (py >= 0) {

                            drawBlock(
                                px,
                                py,
                                currentPiece.type
                            );
                        }

                    }
                );

            }
        );
    }
}

function updateStats() {

    document.getElementById(
        "score"
    ).textContent = score;

    document.getElementById(
        "lines"
    ).textContent = lines;

    document.getElementById(
        "level"
    ).textContent = level;

    if (score > highScore) {

        highScore = score;

        localStorage.setItem(
            "tetrisHighScore",
            highScore
        );
    }

    document.getElementById(
        "highScore"
    ).textContent = highScore;
}

function endGame() {

    gameOver = true;

    document.getElementById(
        "finalScore"
    ).textContent = score;

    document.getElementById(
        "gameOver"
    ).classList.remove("hidden");

    updateStats();
}

function restart() {

    score = 0;
    lines = 0;
    level = 1;

    dropInterval = 800;

    gameOver = false;
    paused = false;

    dropCounter = 0;

    createBoard();

    spawnPiece();

    updateStats();

    document.getElementById(
        "gameOver"
    ).classList.add("hidden");

    document.getElementById(
        "pauseOverlay"
    ).classList.add("hidden");

    draw();
}

function togglePause() {

    if (gameOver) return;

    paused = !paused;

    document.getElementById(
        "pauseOverlay"
    ).classList.toggle(
        "hidden",
        !paused
    );
}

/* KEYBOARD */

document.addEventListener(
    "keydown",
    event => {

        switch (event.key) {

            case "ArrowLeft":
                move(-1);
                break;

            case "ArrowRight":
                move(1);
                break;

            case "ArrowDown":
                softDrop();
                break;

            case "ArrowUp":
            case "x":
            case "X":
                rotate();
                break;

            case " ":
                event.preventDefault();
                hardDrop();
                break;

            case "p":
            case "P":
            case "Escape":
                togglePause();
                break;
        }
    }
);

/* MOBILE BUTTONS */

document.querySelectorAll(
    "[data-action]"
).forEach(button => {

    button.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();

            const action =
                button.dataset.action;

            if (action === "left")
                move(-1);

            if (action === "right")
                move(1);

            if (action === "rotate")
                rotate();

            if (action === "drop")
                softDrop();

            if (action === "hardDrop")
                hardDrop();
        }
    );
});

/* PAUSE */

document.getElementById(
    "pauseBtn"
).addEventListener(
    "click",
    togglePause
);

document.getElementById(
    "resumeBtn"
).addEventListener(
    "click",
    togglePause
);

document.getElementById(
    "restartBtn"
).addEventListener(
    "click",
    restart
);

/* SWIPE */

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener(
    "touchstart",
    event => {

        const touch =
            event.changedTouches[0];

        touchStartX =
            touch.clientX;

        touchStartY =
            touch.clientY;
    },
    { passive: true }
);

canvas.addEventListener(
    "touchend",
    event => {

        const touch =
            event.changedTouches[0];

        const dx =
            touch.clientX -
            touchStartX;

        const dy =
            touch.clientY -
            touchStartY;

        const absX =
            Math.abs(dx);

        const absY =
            Math.abs(dy);

        const threshold = 25;

        if (
            absX < threshold &&
            absY < threshold
        ) {

            rotate();
            return;
        }

        if (absX > absY) {

            if (dx > 0)
                move(1);
            else
                move(-1);

        } else {

            if (dy > 0)
                hardDrop();
            else
                rotate();
        }

    },
    { passive: true }
);

/* TELEGRAM */

if (window.Telegram?.WebApp) {

    const tg =
        window.Telegram.WebApp;

    tg.ready();

    tg.expand();

    if (tg.setHeaderColor) {
        tg.setHeaderColor("#090b12");
    }

    if (tg.setBackgroundColor) {
        tg.setBackgroundColor("#090b12");
    }
}

/* START */

window.addEventListener(
    "resize",
    resizeCanvas
);

createBoard();

spawnPiece();

updateStats();

resizeCanvas();

requestAnimationFrame(update);