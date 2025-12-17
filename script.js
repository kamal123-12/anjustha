// HTML要素の取得
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const speedSelect = document.getElementById('speed-select');
const scoreDisplay = document.getElementById('score');
const ngCountDisplay = document.getElementById('ng-count');
const messageBox = document.getElementById('message');
const messageText = document.getElementById('message-text');

// 定数と変数
const GRID_SIZE = 20; // 1マスのサイズ
const BOARD_SIZE = canvas.width; // 400x400
let snake = [];
let food = {};
let dx = GRID_SIZE; // X方向の移動量 (初期は右)
let dy = 0;        // Y方向の移動量
let gameLoopInterval = null;
let speed = 100; // ゲームの更新速度 (ms)
let isPaused = true;
let score = 0;
let ngCount = 0;
const MAX_NG = 10;
let lastKeyPressed = '';

// 画像ロード（assetsフォルダに配置を想定）
const foodImg = new Image();
foodImg.src = 'assets/food.png'; 
const headImg = new Image();
headImg.src = 'assets/head.png';
const bodyImg = new Image();
bodyImg.src = 'assets/body.png';

// ----------------------
// 初期化・リセット
// ----------------------
function initGame() {
    // 蛇の初期位置（左上から開始）
    snake = [
        { x: 4 * GRID_SIZE, y: 0 },
        { x: 3 * GRID_SIZE, y: 0 },
        { x: 2 * GRID_SIZE, y: 0 },
        { x: 1 * GRID_SIZE, y: 0 },
        { x: 0 * GRID_SIZE, y: 0 }
    ];
    dx = GRID_SIZE; // 右向き
    dy = 0;
    score = 0;
    ngCount = 0;
    isPaused = true;
    lastKeyPressed = 'ArrowRight';
    placeFood();
    updateStatus();
    drawGame();
    showMessage('ゲームスタートボタンを押してください');
}

// ----------------------
// 描画関連
// ----------------------
function placeFood() {
    let newFoodPosition;
    do {
        newFoodPosition = {
            x: Math.floor(Math.random() * (BOARD_SIZE / GRID_SIZE)) * GRID_SIZE,
            y: Math.floor(Math.random() * (BOARD_SIZE / GRID_SIZE)) * GRID_SIZE
        };
    } while (isSnakeCollision(newFoodPosition));
    food = newFoodPosition;
}

function drawGame() {
    // 盤面のクリア
    ctx.fillStyle = '#f1f8e9'; 
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // 餌の描画 (画像がない場合は赤の四角)
    if (foodImg.complete) {
        ctx.drawImage(foodImg, food.x, food.y, GRID_SIZE, GRID_SIZE);
    } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(food.x, food.y, GRID_SIZE, GRID_SIZE);
    }

    // 蛇の描画 (画像がない場合は色付きの四角)
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 頭
            if (headImg.complete) {
                drawRotatedImage(headImg, segment.x, segment.y, GRID_SIZE, GRID_SIZE);
            } else {
                ctx.fillStyle = '#4CAF50'; // 濃い緑
                ctx.fillRect(segment.x, segment.y, GRID_SIZE, GRID_SIZE);
            }
        } else {
            // 体
            if (bodyImg.complete) {
                ctx.drawImage(bodyImg, segment.x, segment.y, GRID_SIZE, GRID_SIZE);
            } else {
                ctx.fillStyle = '#81C784'; // 薄い緑
                ctx.fillRect(segment.x, segment.y, GRID_SIZE, GRID_SIZE);
            }
        }
    });
}

// 蛇の頭の方向に応じた回転描画
function drawRotatedImage(image, x, y, width, height) {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    let rotation = 0;

    if (dx === GRID_SIZE) rotation = 0; // 右
    else if (dx === -GRID_SIZE) rotation = Math.PI; // 左
    else if (dy === -GRID_SIZE) rotation = -Math.PI / 2; // 上
    else if (dy === GRID_SIZE) rotation = Math.PI / 2; // 下

    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
}

// ----------------------
// ゲームロジック
// ----------------------

function moveSnake() {
    // 新しい頭の位置を計算
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // 衝突判定
    if (isCollision(head)) {
        handleCollision();
        return;
    }

    // 新しい頭を配列の先頭に追加
    snake.unshift(head);

    // 餌を食べたかチェック
    if (head.x === food.x && head.y === food.y) {
        score++;
        placeFood(); // 新しい餌を配置 (尻尾は削除しない)
    } else {
        // 餌を食べていない場合、尻尾を削除して長さを維持
        snake.pop();
    }

    updateStatus();
    drawGame();
}

function isCollision(head) {
    // 1. 壁との衝突
    const wallCollision = head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE;

    // 2. 自分自身との衝突
    const selfCollision = snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);

    return wallCollision || selfCollision;
}

// 蛇の体との衝突チェック (餌の配置時に使用)
function isSnakeCollision(pos) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}


function handleCollision() {
    ngCount++;
    updateStatus();

    if (ngCount >= MAX_NG) {
        gameOver();
    } else {
        // NG回数が上限に達していない場合、ゲームを一時停止し、NGを通知
        clearInterval(gameLoopInterval);
        isPaused = true;
        showMessage('NG! 残り: ' + (MAX_NG - ngCount) + '回');
        
        // 2秒後に自動的にリスタート
        setTimeout(() => {
            if (ngCount < MAX_NG) {
                // 蛇をリセットし、ゲーム再開
                initGame();
                startGame();
            }
        }, 2000);
    }
}

function gameOver() {
    clearInterval(gameLoopInterval);
    isPaused = true;
    showMessage('ゲームオーバー！ 最終スコア: ' + score);
    startButton.textContent = 'もう一度プレイ';
}

function updateStatus() {
    scoreDisplay.textContent = score;
    ngCountDisplay.textContent = ngCount;
}

function showMessage(text) {
    messageText.textContent = text;
    messageBox.classList.remove('hidden');
}

function hideMessage() {
    messageBox.classList.add('hidden');
}

function startGame() {
    if (!isPaused) return; // 既に実行中の場合は何もしない

    // 速度を更新
    speed = parseInt(speedSelect.value);

    // ループをクリアして再設定
    clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(moveSnake, speed);
    isPaused = false;
    hideMessage();
    startButton.textContent = 'リスタート';
}

// ----------------------
// イベントリスナー
// ----------------------
startButton.addEventListener('click', () => {
    // NG回数がMAXの場合は、完全に初期化してからスタート
    if (ngCount >= MAX_NG) {
        initGame();
    }
    startGame();
});

speedSelect.addEventListener('change', () => {
    // プレイ中に速度を変更した場合、ゲームループを再設定
    if (!isPaused) {
        startGame(); 
    }
});

// キー入力イベント
document.addEventListener('keydown', (event) => {
    // ゲームが一時停止中はキー入力を受け付けない
    if (isPaused) return; 

    const keyPressed = event.key;
    const goingUp = dy === -GRID_SIZE;
    const goingDown = dy === GRID_SIZE;
    const goingRight = dx === GRID_SIZE;
    const goingLeft = dx === -GRID_SIZE;

    // 現在の移動方向と逆の方向キー入力を無視
    if (keyPressed === 'ArrowLeft' && !goingRight) {
        dx = -GRID_SIZE;
        dy = 0;
        lastKeyPressed = keyPressed;
    } else if (keyPressed === 'ArrowUp' && !goingDown) {
        dx = 0;
        dy = -GRID_SIZE;
        lastKeyPressed = keyPressed;
    } else if (keyPressed === 'ArrowRight' && !goingLeft) {
        dx = GRID_SIZE;
        dy = 0;
        lastKeyPressed = keyPressed;
    } else if (keyPressed === 'ArrowDown' && !goingUp) {
        dx = 0;
        dy = GRID_SIZE;
        lastKeyPressed = keyPressed;
    }
});

// ゲーム開始時の初期化
initGame();