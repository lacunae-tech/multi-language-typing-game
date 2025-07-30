// game.renderer.js

// --- HTML要素の取得 ---
const quitButton = document.getElementById('quit-button');
const bgmAudio = document.getElementById('bgm-audio');
const typeAudio = document.getElementById('type-audio');
const errorAudio = document.getElementById('error-audio');
const comboAudio = document.getElementById('combo-audio');
const explosionAudio = document.getElementById('explosion-audio');
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');
const remainingCountDisplay = document.getElementById('remaining-count-display');
const remainingCountLabel = document.querySelector('#remaining-count-display').previousElementSibling; 
const starCountDisplay = document.getElementById('star-count-display');
const kpmDisplay = document.getElementById('kpm-display');
const bonusDisplay = document.getElementById('bonus-display');
const questionText = document.getElementById('question-text');
const questionTextWrapper = document.getElementById('question-text-wrapper');
const questionDisplay = document.querySelector('.question-display');
const keyboardLayoutDiv = document.getElementById('keyboard-layout');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');
const asteroidContainer = document.getElementById('asteroid-container');
const comboDisplay = document.getElementById('combo-display');

let CURRENT_LAYOUT = []; // (New!) 現在のキーボードレイアウトを保持
let currentTranslation = {};
// --- ステージごとの設定 ---
const STAGE_CONFIG = {
    1: {
        title: "ホームキー・ならし",
        timeLimit: 90,
        questionLimit: 80,
        questionKeys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':'],
        gameMode: 'singleChar',
        kpmThreshold: 60,
        showKeyboard: true,
    },
    2: {
        title: "全キー・ならし",
        timeLimit: 90,
        questionLimit: 80,
        questionKeys: [], // 動的に設定
        gameMode: 'singleChar',
        kpmThreshold: 60,
        showKeyboard: true,
    },
    3: {
        title: "星降るホームキー",
        timeLimit: 120,
        questionLimit: 80,
        questionKeys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':'],
        gameMode: 'fallingStars',
        mistakePenalty: 1,
    },
    4: {
        title: "星降る全キー",
        timeLimit: 120,
        questionLimit: 80,
        questionKeys: [], // 動的に設定
        gameMode: 'fallingStars',
        mistakePenalty: 1,
    },
    5: {
        title: "単語れんしゅう",
        timeLimit: 120,
        questionLimit: 30, // 単語数
        wordList: [], // (Update!) JSONから動的に読み込むため、空にする
        gameMode: 'wordAsteroid',
    },
    6: {
        title: "文章れんしゅう",
        timeLimit: 120,
        questionLimit: 20, // 文章数
        wordList: [], // (Update!) JSONから動的に読み込むため、空にする
        gameMode: 'wordAsteroid',
    }
};

// --- ゲーム状態を管理する変数 ---
let settings = { bgm: true, sfx: true };
let score = 0;
let timeLeft = 0;
let timerInterval = null;
let isPlaying = false;
let totalCorrectTyped = 0; // 正解した総数（文字 or 単語）
let currentConfig = {};
let gameLoopId = null;


// --- wordAsteroidモード用の変数 ---
let word_currentWord = '';
let word_typedWord = '';
let word_consecutiveCorrect = 0;
let word_asteroidScale = 1.0;

// --- fallingStarsモード用の変数 ---
let activeStars = [];
let maxStarsOnScreen = 1;
let consecutiveCorrect = 0;
let lastSpawnTime = 0;

// --- singleCharモード用の変数 ---
let singleChar_currentQuestion = '';
let singleChar_highlightTimeout = null;
let singleChar_highlightedKeyElement = null;
let singleChar_consecutiveCorrectAnswers = 0;
let singleChar_isKeyboardVisible = true;

// --- 関数定義 ---
function createKeyboard() {
    keyboardLayoutDiv.innerHTML = '';
    CURRENT_LAYOUT.forEach(row => { // QWERTY_LAYOUTからCURRENT_LAYOUTに変更
        const rowDiv = document.createElement('div');
        rowDiv.className = 'key-row';
        row.forEach(keyChar => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.id = `key-${keyChar}`;
            keyDiv.textContent = keyChar;
            rowDiv.appendChild(keyDiv);
        });
        keyboardLayoutDiv.appendChild(rowDiv);
    });
}

function singleChar_updateKeyboardVisibility() {
    if (!currentConfig.showKeyboard) {
        keyboardLayoutDiv.style.visibility = 'hidden';
        return;
    }
    keyboardLayoutDiv.style.visibility = singleChar_isKeyboardVisible ? 'visible' : 'hidden';
}

function singleChar_clearHighlight() {
    if (singleChar_highlightedKeyElement) {
        singleChar_highlightedKeyElement.classList.remove('blinking');
        singleChar_highlightedKeyElement = null;
    }
}

function singleChar_setNextQuestion() {
    clearTimeout(singleChar_highlightTimeout);
    singleChar_clearHighlight();
    const randomIndex = Math.floor(Math.random() * currentConfig.questionKeys.length);
    singleChar_currentQuestion = currentConfig.questionKeys[randomIndex];
    questionText.classList.add('flipping');
    setTimeout(() => {
        questionText.textContent = singleChar_currentQuestion;
    }, 200);
    questionText.addEventListener('animationend', () => {
        questionText.classList.remove('flipping');
    }, { once: true });
    singleChar_highlightTimeout = setTimeout(() => {
        const keyElement = document.getElementById(`key-${singleChar_currentQuestion}`);
        if (keyElement) {
            keyElement.classList.add('blinking');
            singleChar_highlightedKeyElement = keyElement;
        }
    }, 2000);
}

// --- fallingStarsモード用関数 ---
function spawnStar() {
    const onScreenChars = activeStars.map(s => s.char);
    const availableChars = currentConfig.questionKeys.filter(k => !onScreenChars.includes(k));
    if (availableChars.length === 0) return;

    const char = availableChars[Math.floor(Math.random() * availableChars.length)];
    const starElement = document.createElement('div');
    starElement.className = 'star';
    starElement.textContent = char;
    
    const x = Math.random() * (questionDisplay.clientWidth - 60);
    const dx = (Math.random() - 0.5) * 2;
    const animationOffset = Math.random() * 5000;
    const baseScale = 1.0 + Math.random() * 0.1;
    const pulseRange = 0.1 + Math.random() * 0.1;
    const baseFallSpeed = 0.8 + Math.random() * 0.4; // 0.8から1.2のランダムな基本落下速度

    starElement.style.left = `${x}px`;
    starElement.style.top = `-50px`;

    questionDisplay.appendChild(starElement);
    activeStars.push({ char, element: starElement, x, y: -50, dx, isBouncing: false, spawnTime: Date.now(), animationOffset, baseScale, pulseRange, baseFallSpeed });
}

function fallingStars_gameLoop() {
    if (!isPlaying) return;
    const currentTime = Date.now();

    for (let i = activeStars.length - 1; i >= 0; i--) {
        const star = activeStars[i];

        if (!star.isBouncing) {
            // --- 新しい落下速度の計算ロジック ---
            const yPercent = star.y / questionDisplay.clientHeight;
            const speedModifier = 1.5 - yPercent; // 画面上部(0%)で1.5倍、下部(100%)で0.5倍
            const currentFallSpeed = star.baseFallSpeed * speedModifier;

            star.y += currentFallSpeed;
            star.x += star.dx;

            if (star.x <= 0 || star.x >= questionDisplay.clientWidth - star.element.clientWidth) {
                star.dx *= -1;
            }

            const pulse = Math.sin((currentTime + star.animationOffset) / 1000);
            const scale = star.baseScale + pulse * star.pulseRange; 
            
            star.element.style.transform = `scale(${scale})`;
            star.element.style.top = `${star.y}px`;
            star.element.style.left = `${star.x}px`;
        }

        if (star.y > questionDisplay.clientHeight) {
            star.element.remove();
            activeStars.splice(i, 1);
            if (maxStarsOnScreen > 1) {
                maxStarsOnScreen--;
                starCountDisplay.textContent = maxStarsOnScreen;
            }
            consecutiveCorrect = 0;
            if (settings.sfx) { errorAudio.currentTime = 0; errorAudio.play(); }
        }
    }

    if (activeStars.length < maxStarsOnScreen && (Date.now() - lastSpawnTime > 1500 / maxStarsOnScreen)) {
        spawnStar();
        lastSpawnTime = Date.now();
    }

    gameLoopId = requestAnimationFrame(fallingStars_gameLoop);
}

// --- wordAsteroidモード用関数 ---
function setNextWordAsteroidQuestion() {
    word_currentWord = currentConfig.wordList[Math.floor(Math.random() * currentConfig.wordList.length)];
    word_typedWord = '';
    word_asteroidScale = 1.0;
    asteroidContainer.style.setProperty('transform', `scale(${word_asteroidScale})`, 'important');
    
    updateWordAsteroidDisplay();

    // フェードイン演出
    asteroidContainer.classList.remove('fade-in');
    questionTextWrapper.classList.remove('fade-in');
    void asteroidContainer.offsetWidth;
    asteroidContainer.classList.add('fade-in');
    questionTextWrapper.classList.add('fade-in');
}

function updateWordAsteroidDisplay() {
    questionText.innerHTML = '';
    for (let i = 0; i < word_currentWord.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = word_currentWord[i];

        if (i < word_typedWord.length) {
            if (word_typedWord[i] === word_currentWord[i]) {
                charSpan.classList.add('correct');
            } else {
                charSpan.classList.add('incorrect');
            }
        }
        if (i === word_typedWord.length) {
            charSpan.classList.add('current');
        }
        questionText.appendChild(charSpan);
    }
}

function createExplosionParticles() {
    if (settings.sfx) { explosionAudio.currentTime = 0; explosionAudio.play(); }
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        questionDisplay.appendChild(particle);

        const angle = Math.random() * 360;
        const distance = 50 + Math.random() * 150;
        const x = Math.cos(angle * Math.PI / 180) * distance;
        const y = Math.sin(angle * Math.PI / 180) * distance;

        // アニメーション開始
        particle.style.transform = `translate(${x}px, ${y}px)`;
        particle.style.opacity = 0;

        setTimeout(() => particle.remove(), 300);
    }
}

function showCombo() {
    if (settings.sfx) { comboAudio.currentTime = 0; comboAudio.play(); }
    comboDisplay.classList.add('combo-show');
    setTimeout(() => {
        comboDisplay.classList.remove('combo-show');
    }, 1000);
}
// (New!) wordAsteroidモード専用のゲームループ
function wordAsteroid_gameLoop() {
    if (!isPlaying) return;
    const growthRate = 0.002;
    word_asteroidScale += growthRate;
    asteroidContainer.style.setProperty('transform', `scale(${word_asteroidScale})`, 'important');
    if (word_asteroidScale >= 4.0) {
        gameOver("隕石が衝突しました！");
        return;
    }
    gameLoopId = requestAnimationFrame(wordAsteroid_gameLoop);
}
// --- キー入力処理 ---
function handleKeyPress(event) {
    if (event.key === 'Escape') { stopGame(null); return; }
    if (!isPlaying) return;

    if (currentConfig.gameMode === 'wordAsteroid') {
        if (event.key.length > 1) return;

        const correctNextChar = word_currentWord[word_typedWord.length];

        if (event.key === correctNextChar) {
            // --- 正解（途中）の場合 ---
            if (settings.sfx) { typeAudio.currentTime = 0; typeAudio.play(); }
        word_typedWord += event.key;


            // --- 単語全体を正解した場合 ---
            if (word_typedWord === word_currentWord) {
                createExplosionParticles();
                word_consecutiveCorrect++;
                let scoreMultiplier = 1.0;
                if (word_consecutiveCorrect >= 5) {
                    if (word_consecutiveCorrect % 5 === 0) showCombo();
                    scoreMultiplier = 1.2;
                }
                score += Math.floor(word_currentWord.length * 50 * scoreMultiplier);
                scoreDisplay.textContent = score;
                
                totalCorrectTyped++;
                remainingCountDisplay.textContent = currentConfig.questionLimit - totalCorrectTyped;

                if (totalCorrectTyped >= currentConfig.questionLimit) {
                    gameClear();
                    return;
                }
                setTimeout(setNextWordAsteroidQuestion, 300);
            }
        } else {
            // --- ミスした場合の処理 ---
            if (settings.sfx) { errorAudio.currentTime = 0; errorAudio.play(); }
            word_consecutiveCorrect = 0;
            word_asteroidScale += 0.25;
            asteroidContainer.style.setProperty('transform', `scale(${word_asteroidScale})`, 'important');
            if (word_asteroidScale >= 4.0) {
                gameOver("隕石が衝突しました！");
            }
                // 何もせず、正しいキーの入力を待つ
        }
        updateWordAsteroidDisplay();
    } else if (currentConfig.gameMode === 'fallingStars') {
        const targetStarIndex = activeStars.findIndex(s => s.char === event.key);
        if (targetStarIndex !== -1) {
            const targetStar = activeStars[targetStarIndex];
            if (targetStar.isBouncing) return;

            if (settings.sfx) { typeAudio.currentTime = 0; typeAudio.play(); }
            
            targetStar.isBouncing = true;

            const containerHeight = questionDisplay.clientHeight;
            const currentYPercent = (targetStar.y / containerHeight) * 100;
            
            // 1. 基本のバウンス率を決定
            let bouncePercent = (currentYPercent >= 80) ? 0.40 : 0.25;
            
            // 2. スピードボーナスを追加
            const reactionTime = Date.now() - targetStar.spawnTime;
            if (reactionTime < 500) {
                bouncePercent += 2.00;
            } else if (reactionTime < 1000) {
                bouncePercent += 1.50;
            }

            // 3. ピンチボーナスを追加
            const pinchZoneThreshold = containerHeight * 0.5;
            const pinchCount = activeStars.filter(s => s !== targetStar && s.y >= pinchZoneThreshold).length;

            if (pinchCount >= 8) {
                bouncePercent += 1.50;
            } else if (pinchCount >= 6) {
                bouncePercent += 0.80;
            } else if (pinchCount >= 4) {
                bouncePercent += 0.40;
            } else if (pinchCount >= 2) {
                bouncePercent += 0.20;
            }

            // 4. 新しい位置を計算
            const bounceAmount = containerHeight * bouncePercent;
            const targetY = Math.max(0, targetStar.y - bounceAmount);

            // 5. アニメーションと落下再開
            targetStar.element.style.top = `${targetY}px`;
            setTimeout(() => {
                targetStar.y = targetY;
                const onScreenChars = activeStars.map(s => s.char);
                const availableChars = currentConfig.questionKeys.filter(k => !onScreenChars.includes(k));
                if (availableChars.length > 0) {
                    const newChar = availableChars[Math.floor(Math.random() * availableChars.length)];
                    targetStar.char = newChar;
                    targetStar.element.textContent = newChar;
                    targetStar.spawnTime = Date.now();
                    targetStar.dx = (Math.random() - 0.5) * 2;
                } else {
                    const indexToRemove = activeStars.indexOf(targetStar);
                    if (indexToRemove > -1) activeStars.splice(indexToRemove, 1);
                    targetStar.element.remove();
                }
                targetStar.isBouncing = false;
            }, 200);

            score += 100;
            scoreDisplay.textContent = score;
            totalCorrectTyped++;
            remainingCountDisplay.textContent = currentConfig.questionLimit - totalCorrectTyped;
            
            consecutiveCorrect++;
            if (consecutiveCorrect > 0 && consecutiveCorrect % 5 === 0) {
                if (maxStarsOnScreen < 10) {
                    maxStarsOnScreen++;
                    starCountDisplay.textContent = maxStarsOnScreen;
                }
            }
        } else {
            if (settings.sfx) { errorAudio.currentTime = 0; errorAudio.play(); }
            timeLeft -= currentConfig.mistakePenalty;
            timerDisplay.textContent = timeLeft;
            consecutiveCorrect = 0;
        }
        if (totalCorrectTyped >= currentConfig.questionLimit) { gameClear(); }
    } else { // singleCharモード
        const pressedKeyElement = document.getElementById(`key-${event.key}`);
        if (pressedKeyElement) {
            pressedKeyElement.classList.add('pressed');
            setTimeout(() => {
                pressedKeyElement.classList.remove('pressed');
            }, 100);
        }
        if (event.key === singleChar_currentQuestion) {
            if (settings.sfx) { typeAudio.currentTime = 0; typeAudio.play(); }
            totalCorrectTyped++;
            remainingCountDisplay.textContent = currentConfig.questionLimit - totalCorrectTyped;
            const elapsedTime = currentConfig.timeLimit - timeLeft;
            const kpm = elapsedTime > 0 ? Math.floor((totalCorrectTyped * 60) / elapsedTime) : 0;
            kpmDisplay.textContent = kpm;
            if (currentConfig.kpmThreshold && kpm < currentConfig.kpmThreshold) {
                singleChar_consecutiveCorrectAnswers = 0;
            } else {
                singleChar_consecutiveCorrectAnswers++;
            }
            let bonusMultiplier = 1.0;
            if (currentConfig.kpmThreshold && kpm >= currentConfig.kpmThreshold) {
                if (singleChar_consecutiveCorrectAnswers >= 20) bonusMultiplier = 1.8;
                else if (singleChar_consecutiveCorrectAnswers >= 15) bonusMultiplier = 1.6;
                else if (singleChar_consecutiveCorrectAnswers >= 10) bonusMultiplier = 1.4;
                else if (singleChar_consecutiveCorrectAnswers >= 5) bonusMultiplier = 1.2;
            }
            bonusDisplay.textContent = `x${bonusMultiplier.toFixed(1)}`;
            score += Math.floor(100 * bonusMultiplier);
            scoreDisplay.textContent = score;
            if (singleChar_consecutiveCorrectAnswers >= 5) {
                singleChar_isKeyboardVisible = false;
            }
            singleChar_updateKeyboardVisibility();
            if (totalCorrectTyped >= currentConfig.questionLimit) {
                gameClear();
                return;
            }
            singleChar_setNextQuestion();
        } else {
            if (settings.sfx) { errorAudio.currentTime = 0; errorAudio.play(); }
            singleChar_consecutiveCorrectAnswers = 0;
            singleChar_isKeyboardVisible = true;
            singleChar_updateKeyboardVisibility();
            bonusDisplay.textContent = 'x1.0';
            if (currentConfig.mistakePenalty) {
                timeLeft -= currentConfig.mistakePenalty;
                timerDisplay.textContent = timeLeft;
            }
        }
    }
}

// --- ゲームフロー関数 ---
function stopGame(message) {
    isPlaying = false;
    cancelAnimationFrame(gameLoopId);
    if (settings.bgm) bgmAudio.pause();
    clearInterval(timerInterval);
    if (message) alert(message);
    window.electronAPI.navigateToMainMenu();
}

function gameClear() {
    const timeBonus = timeLeft * 100;
    const finalScore = score + timeBonus;
    const message = `${currentTranslation.alertClearTitle}\n` +
                  `${currentTranslation.alertScore}: ${score}\n` +
                  `${currentTranslation.alertTimeBonus}: ${timeBonus}\n` +
                  `${currentTranslation.alertTotalScore}: ${finalScore}`;
    stopGame(message);
}

function gameOver() {
    const message = customMessage || `${currentTranslation.alertTimeUp} ${currentTranslation.alertScore}: ${score}`;
    stopGame(message);
}

function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) gameOver();
}

function startGame() {
    isPlaying = true;
    score = 0;
    totalCorrectTyped = 0;
    timeLeft = currentConfig.timeLimit;
    scoreDisplay.textContent = score;
    timerDisplay.textContent = timeLeft;
    remainingCountDisplay.textContent = currentConfig.questionLimit;
    
    if (settings.bgm) { bgmAudio.volume = 0.3; bgmAudio.currentTime = 0; bgmAudio.play(); }

    if (currentConfig.gameMode === 'wordAsteroid') {
        word_consecutiveCorrect = 0;
        setNextWordAsteroidQuestion();
        wordAsteroid_gameLoop();
    } else if (currentConfig.gameMode === 'fallingStars') {
        questionText.style.display = 'none';
        ['kpm-box', 'bonus-box'].forEach(id => document.getElementById(id).style.display = 'none');
        document.getElementById('star-count-box').style.display = 'block';
        activeStars = [];
        maxStarsOnScreen = 1;
        starCountDisplay.textContent = maxStarsOnScreen;
        consecutiveCorrect = 0;
        lastSpawnTime = 0;
        fallingStars_gameLoop();
    } else {
        questionText.style.display = 'inline-block';
        ['kpm-box', 'bonus-box'].forEach(id => document.getElementById(id).style.display = 'block');
        document.getElementById('star-count-box').style.display = 'none';
        singleChar_consecutiveCorrectAnswers = 0;
        singleChar_isKeyboardVisible = currentConfig.showKeyboard;
        singleChar_updateKeyboardVisibility();
        singleChar_setNextQuestion();
    }

    timerInterval = setInterval(updateTimer, 1000);
}

function startCountdown() {
    let count = 3;
    countdownText.textContent = count;
    countdownOverlay.style.display = 'flex';
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownText.textContent = count;
        } else {
            clearInterval(countdownInterval);
            countdownOverlay.style.display = 'none';
            startGame();
        }
    }, 1000);
}

async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (currentTranslation[key]) el.textContent = currentTranslation[key];
    });
    // (New!) レイアウトデータを読み込む
    const layoutData = await window.electronAPI.getLayout(settings.layout);
    // (New!) 単語リストデータを読み込む
    const wordListData = await window.electronAPI.getWordList(settings.language);

    // (New!) レイアウトデータに基づいてステージ設定を動的に更新
    if (layoutData && layoutData.layout && layoutData.homeRowKeys) {
        // グローバル変数を設定（キーボード描画用）
        CURRENT_LAYOUT = layoutData.layout;
    
        // ホームキーを使うステージ（1と3）の設定
        STAGE_CONFIG[1].questionKeys = layoutData.homeRowKeys;
        STAGE_CONFIG[3].questionKeys = layoutData.homeRowKeys;
    
        // 全キーを使うステージ（2と4）の設定
        STAGE_CONFIG[2].questionKeys = layoutData.layout.flat();
        STAGE_CONFIG[4].questionKeys = layoutData.layout.flat();
    }
    // (New!) 単語リストデータに基づいてステージ設定を動的に更新
    if (wordListData) {
        if (wordListData.stage5_words) {
            STAGE_CONFIG[5].wordList = wordListData.stage5_words;
        }
        if (wordListData.stage6_sentences) {
            STAGE_CONFIG[6].wordList = wordListData.stage6_sentences;
        }
    }
    const stageId = await window.electronAPI.getCurrentStageId();
    currentConfig = STAGE_CONFIG[stageId] || STAGE_CONFIG[1];
    createKeyboard();
    window.addEventListener('keydown', handleKeyPress);
    quitButton.addEventListener('click', () => stopGame(null));
    
    questionDisplay.className = 'question-display';
    asteroidContainer.style.display = 'none';
    questionTextWrapper.style.display = 'none';
    questionText.style.display = 'none';
    if (currentConfig.gameMode === 'wordAsteroid') {
        document.body.classList.add('night-sky-bg');
        questionDisplay.classList.add('mode-word-asteroid');
        keyboardLayoutDiv.style.display = 'none';
        ['star-count-box', 'kpm-box', 'bonus-box'].forEach(id => document.getElementById(id).style.display = 'none');
        asteroidContainer.style.display = 'block';
        questionTextWrapper.style.display = 'block';
        questionText.style.display = 'block';
        remainingCountLabel.textContent = 'のこり';
    }else if (currentConfig.gameMode === 'fallingStars') {
        document.body.classList.add('night-sky-bg');
        questionDisplay.classList.add('mode-falling-stars');
        keyboardLayoutDiv.style.display = 'none';
        remainingCountLabel.textContent = 'のこり';
    } else {
        document.body.classList.remove('night-sky-bg');
        questionDisplay.classList.add('mode-single-char', 'perspective-3d');
        keyboardLayoutDiv.style.display = 'block';
        questionTextWrapper.style.display = 'block';
        remainingCountLabel.textContent = 'のこり';
    }
    
    startCountdown();
}
initialize();
