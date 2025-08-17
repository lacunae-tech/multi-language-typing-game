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

const infoBarelements = document.querySelectorAll('.info-box');
const opponentInfoContainer = document.getElementById('opponent-info-container');
const opponentProgressAnimal = document.getElementById('opponent-progress-animal');
const myProgressAnimal = document.getElementById('my-progress-animal');
const myWordCount = document.getElementById('my-word-count');
const opponentWordCount = document.getElementById('opponent-word-count');

const MY_ANIMAL_IMAGES = {
    normal: './assets/img/fox_normal.png',
    mistake: './assets/img/fox_mistake.png',
    combo: './assets/img/fox_combo.png'
};

const OPPONENT_ANIMAL_IMAGES = {
    normal: './assets/img/camel_normal.png',
    mistake: './assets/img/camel_mistake.png',
    combo: './assets/img/camel_combo.png'
};

function setAnimalState(element, images, state) {
    element.src = images[state];
    if (state !== 'normal') {
        clearTimeout(element._stateTimeout);
        element._stateTimeout = setTimeout(() => {
            element.src = images.normal;
        }, state === 'combo' ? 1000 : 500);
    }
}

function updateAnimalPosition(element, score) {
    const progress = score / currentConfig.questionLimit;
    element.style.left = `${progress * 100}%`;
}

let CURRENT_LAYOUT = []; // (New!) 現在のキーボードレイアウトを保持
let CURRENT_ACCENT_MAP = {}; // (New!) 現在のレイアウトのアクセント情報
let KEY_CHAR_TO_ID = {}; // (New!) 文字から物理キーIDへのマッピング
let isShiftActive = false; // (New!) Shiftキーの状態
let currentTranslation = {};
// --- ステージごとの設定 ---
const STAGE_CONFIG = {
    1: {
        id:1,
        title: "ホームキー・ならし",
        timeLimit: 60,
        questionLimit: 60,
        questionKeys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':'],
        gameMode: 'singleChar',
        kpmThreshold: 60,
        showKeyboard: true,
    },
    2: {
        id:2,
        title: "全キー・ならし",
        timeLimit: 60,
        questionLimit: 60,
        questionKeys: [], // 動的に設定
        gameMode: 'singleChar',
        kpmThreshold: 60,
        showKeyboard: true,
    },
    3: {
        id:3,
        title: "星降るホームキー",
        timeLimit: 90,
        questionLimit: 60,
        questionKeys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':'],
        gameMode: 'fallingStars',
        mistakePenalty: 1,
    },
    4: {
        id:4,
        title: "星降る全キー",
        timeLimit: 90,
        questionLimit: 60,
        questionKeys: [], // 動的に設定
        gameMode: 'fallingStars',
        mistakePenalty: 1,
    },
    5: {
        id:5,
        title: "単語れんしゅう",
        timeLimit: 90,
        questionLimit: 60, // 単語数
        wordList: [], // (Update!) JSONから動的に読み込むため、空にする
        gameMode: 'wordAsteroid',
    },
    6: {
        id:6,
        title: "文章れんしゅう",
        timeLimit: 120,
        questionLimit: 15, // 文章数
        wordList: [], // (Update!) JSONから動的に読み込むため、空にする
        gameMode: 'wordAsteroid',
    },
    7: {
        id: 7,
        title: "対戦：進捗レース",
        gameMode: 'race', // 新しいゲームモードとして 'race' を定義
        wordList: [],     // 文章リストを使用 (ステージ6のものを流用)
        questionLimit: 60, // 1つの文章の早さを競う
    },
    8: {
        id: 8,
        title: "対戦：早食いチャレンジ",
        gameMode: 'scoreAttack', // 新しいゲームモードとして 'scoreAttack' を定義
        wordList: [],         // 単語リストを使用 (ステージ5のものを流用)
        timeLimit: 120,       // 仕様書に基づき制限時間を設定
        status: 'comingSoon',
    },
    9: {
        id: 9,
        title: "苦手キーれんしゅう",
        timeLimit: 60,
        questionLimit: 60,
        questionKeys: [], // 動的に設定
        gameMode: 'singleChar',
        kpmThreshold: 60,
        showKeyboard: true,
    }
};
/**
 * 結果を保存してゲームを終了する共通関数
 * @param {string} message - 終了時に表示するメッセージ
 */
// --- ゲーム状態を管理する変数 ---
let settings = { bgm: true, sfx: true };
let score = 0;
let timeLeft = 0;
let timerInterval = null;
let isPlaying = false;
let totalCorrectTyped = 0; // 正解した総数（文字 or 単語）
let currentConfig = {};
let gameLoopId = null;

let keyMistakeStats = {}; // (追加) このゲーム中のキーごとのミスを記録するオブジェクト

// --- wordAsteroidモード用の変数 ---
let word_currentWord = '';
let word_typedWord = '';
let word_consecutiveCorrect = 0;
let word_asteroidScale = 1.0;

// (New!) 日本語ステージ用ローマ字入力処理のための変数
let romajiSequence = null; // 現在の単語を構成するかなとローマ字候補の配列
let romajiIndex = 0;       // 現在入力中のかなインデックス
let romajiBuffer = '';     // 現在のかなに対して入力済みのローマ字文字列

// --- fallingStarsモード用の変数 ---
let activeStars = [];
let maxStarsOnScreen = 1;
let consecutiveCorrect = 0;
let lastSpawnTime = 0;

// --- singleCharモード用の変数 ---
let singleChar_currentQuestion = '';
let singleChar_highlightTimeout = null;
let singleChar_highlightedKeyElements = [];
let singleChar_inputSequence = [];
let singleChar_sequenceIndex = 0;
let singleChar_accentInfo = null;
let singleChar_consecutiveCorrectAnswers = 0;
let singleChar_isKeyboardVisible = true;

// (更新) レース用の進捗・スコア管理変数
let raceWordIndex = 0; // 現在の単語インデックス
let myScore = 0;
let opponentScore = 0;
let raceConsecutivePerfect = 0; // 連続ミスなし数
let raceWordHasMistake = false; // 現在の単語でミスが発生したか

// --- 関数定義 ---
function createKeyboard() {
    keyboardLayoutDiv.innerHTML = '';
    KEY_CHAR_TO_ID = {};
    CURRENT_LAYOUT.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'key-row';
        row.forEach(keyData => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            let id, defaultChar, shiftChar;
            if (typeof keyData === 'string') {
                id = keyData;
                defaultChar = keyData;
                shiftChar = keyData;
                if (keyData.length === 1) {
                    KEY_CHAR_TO_ID[keyData.toLowerCase()] = id;
                }
            } else {
                id = keyData.id;
                defaultChar = keyData.default;
                shiftChar = keyData.shift || keyData.default;
                KEY_CHAR_TO_ID[defaultChar.toLowerCase()] = id;
                KEY_CHAR_TO_ID[shiftChar.toLowerCase()] = id;
            }
            keyDiv.id = `key-${id}`;
            keyDiv.dataset.default = defaultChar;
            keyDiv.dataset.shift = shiftChar;
            keyDiv.textContent = isShiftActive ? shiftChar : defaultChar;
            rowDiv.appendChild(keyDiv);
        });
        keyboardLayoutDiv.appendChild(rowDiv);
    });
}

function updateShiftDisplay(active) {
    isShiftActive = active;
    const keys = keyboardLayoutDiv.querySelectorAll('.key');
    keys.forEach(key => {
        const char = active ? key.dataset.shift : key.dataset.default;
        key.textContent = char;
    });
}

function removeDiacritics(char) {
    return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getKeyElementForChar(char) {
    const id = KEY_CHAR_TO_ID[char] || KEY_CHAR_TO_ID[char.toLowerCase()] || KEY_CHAR_TO_ID[removeDiacritics(char.toLowerCase())] || char;
    return document.getElementById(`key-${id}`);
}

function getAccentInfo(char) {
    const layoutInfo = CURRENT_ACCENT_MAP[char];
    if (layoutInfo) {
        const base = char.normalize('NFD')[0];
        return {
            accentChar: layoutInfo.accentChar,
            baseChar: base !== char ? base : null,
            keyChar: layoutInfo.keyChar,
            needsShift: layoutInfo.needsShift
        };
    }
    return null;
}

function highlightAccent(info) {
    const keyElement = getKeyElementForChar(info.keyChar);
    if (keyElement) {
        keyElement.classList.add('blinking');
        singleChar_highlightedKeyElements.push(keyElement);
    }
    if (info.needsShift) {
        const shiftElement = document.getElementById('key-Shift');
        if (shiftElement) {
            shiftElement.classList.add('blinking');
            singleChar_highlightedKeyElements.push(shiftElement);
        }
    }
}

function singleChar_updateKeyboardVisibility() {
    if (!currentConfig.showKeyboard) {
        keyboardLayoutDiv.style.visibility = 'hidden';
        return;
    }
    keyboardLayoutDiv.style.visibility = singleChar_isKeyboardVisible ? 'visible' : 'hidden';
}

function singleChar_clearHighlight() {
    singleChar_highlightedKeyElements.forEach(el => el.classList.remove('blinking'));
    singleChar_highlightedKeyElements = [];
}

async function saveResultAndExit(endMessage) {
    const timeBonus = timeLeft > 0 ? timeLeft * 100 : 0;
    const totalScore = score + timeBonus;

    const resultData = {
        stageId: currentConfig.id,
        score: score,
        timeBonus: timeBonus,
        totalScore: totalScore,
        mistakes: keyMistakeStats,
        endMessage
    };

    await window.electronAPI.saveGameResult(resultData);
    window.electronAPI.navigateToResult(resultData);
}

function singleChar_setNextQuestion() {
    clearTimeout(singleChar_highlightTimeout);
    singleChar_clearHighlight();
    singleChar_inputSequence = [];
    singleChar_sequenceIndex = 0;
    const randomIndex = Math.floor(Math.random() * currentConfig.questionKeys.length);
    singleChar_currentQuestion = currentConfig.questionKeys[randomIndex];
    questionText.classList.add('flipping');
    setTimeout(() => {
        questionText.textContent = singleChar_currentQuestion;
    }, 200);
    questionText.addEventListener('animationend', () => {
        questionText.classList.remove('flipping');
    }, { once: true });
    singleChar_accentInfo = getAccentInfo(singleChar_currentQuestion);
    if (singleChar_accentInfo && singleChar_accentInfo.baseChar) {
        singleChar_inputSequence = [singleChar_accentInfo.accentChar, singleChar_currentQuestion];
    } else {
        singleChar_inputSequence = [singleChar_currentQuestion];
    }
    singleChar_highlightTimeout = setTimeout(() => {
        if (singleChar_accentInfo && singleChar_accentInfo.baseChar) {
            highlightAccent(singleChar_accentInfo);
        } else {
            const keyElement = getKeyElementForChar(singleChar_currentQuestion);
            if (keyElement) {
                keyElement.classList.add('blinking');
                singleChar_highlightedKeyElements.push(keyElement);
            }
            if (singleChar_accentInfo && singleChar_accentInfo.needsShift) {
                const shiftElement = document.getElementById('key-Shift');
                if (shiftElement) {
                    shiftElement.classList.add('blinking');
                    singleChar_highlightedKeyElements.push(shiftElement);
                }
            }
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

    // (New!) 日本語の場合はローマ字入力を初期化
    prepareRomaji(word_currentWord);

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

// (New!) 現在の単語に対してローマ字入力処理を初期化
function prepareRomaji(word) {
    if (settings.language === 'ja' && /[\u3040-\u30ff]/.test(word)) {
        romajiSequence = RomanjiConverter.convert(word);
        romajiIndex = 0;
        romajiBuffer = '';
    } else {
        romajiSequence = null;
    }
}

// (New!) 1文字入力を処理し、正誤を判定する
function processWordInput(key) {
    key = key.toLowerCase();
    if (romajiSequence) {
        if (romajiIndex >= romajiSequence.length) return false;
        const group = romajiSequence[romajiIndex];
        const newBuffer = romajiBuffer + key;
        const matches = group.romanji.filter(r => r.startsWith(newBuffer));
        if (matches.length === 0) {
            return false; // 誤入力
        }
        romajiBuffer = newBuffer;
        if (matches.includes(newBuffer)) {
            // 1文字分のかなを確定
            let kanaChar = group.kana;
            // romaji.js の促音処理では次子音がそのまま kana に入るため復元する
            if (kanaChar.length === 1 && !/^[\u3040-\u309f]$/.test(kanaChar)) {
                kanaChar = 'っ';
            }
            word_typedWord += kanaChar;
            romajiIndex++;
            romajiBuffer = '';
        }
        return true; // 正しい入力（未確定含む）
    } else {
        const expected = word_currentWord[word_typedWord.length];
        if (expected && key === expected.toLowerCase()) {
            word_typedWord += expected;
            return true;
        }
        return false;
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
        gameOver(currentTranslation.gameOverAsteroidCollision);
        return;
    }
    gameLoopId = requestAnimationFrame(wordAsteroid_gameLoop);
}
// --- キー入力処理 ---
function handleKeyPress(event) {
    if (event.key === 'Escape') { stopGame(null); return; }
    if (!isPlaying) return;
    if (event.key === 'Shift') return;
    let key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (currentConfig.gameMode === 'race') {
        if (key.length > 1) return;
        if (!word_currentWord) return; // 単語がなければ何もしない

        const ok = processWordInput(key);
        if (ok) {
            if (settings.sfx) { typeAudio.currentTime = 0; typeAudio.play(); }
            setAnimalState(myProgressAnimal, MY_ANIMAL_IMAGES, 'normal');
            updateWordAsteroidDisplay();

            if (word_typedWord === word_currentWord) {
                // ポイント計算
                let gained = raceWordHasMistake ? 1 : 3;
                myScore += gained;
                if (!raceWordHasMistake) {
                    raceConsecutivePerfect++;
                    if (raceConsecutivePerfect % 3 === 0) {
                        myScore += 3; // ボーナス
                        setAnimalState(myProgressAnimal, MY_ANIMAL_IMAGES, 'combo');
                        window.electronAPI.sendMessage({ type: 'status_update', value: 'combo' });
                    }
                } else {
                    raceConsecutivePerfect = 0;
                }

                // UI更新
                updateAnimalPosition(myProgressAnimal, myScore);
                myWordCount.textContent = myScore;

                // 相手にスコアを通知
                window.electronAPI.sendMessage({ type: 'score_update', value: myScore });

                // 勝敗判定
                if (checkRaceWinCondition()) return;

                // 次の単語へ
                setNextRaceWord();
            }

        } else {
            if (settings.sfx) { errorAudio.currentTime = 0; errorAudio.play(); }
            const expectedKey = romajiSequence && romajiIndex < romajiSequence.length
                ? (romajiSequence[romajiIndex].romanji[0][romajiBuffer.length] || romajiSequence[romajiIndex].romanji[0])
                : word_currentWord[word_typedWord.length];
            if (expectedKey) {
                keyMistakeStats[expectedKey] = (keyMistakeStats[expectedKey] || 0) + 1;
            }
            raceWordHasMistake = true;
            setAnimalState(myProgressAnimal, MY_ANIMAL_IMAGES, 'mistake');
            window.electronAPI.sendMessage({ type: 'status_update', value: 'mistake' });
        }
    } else if (currentConfig.gameMode === 'scoreAttack') {
        if (key.length > 1) return;

        const ok = processWordInput(key);
        if (ok) {
            if (settings.sfx) { typeAudio.currentTime = 0; typeAudio.play(); }

            if (word_typedWord === word_currentWord) {
                createExplosionParticles();
                word_consecutiveCorrect++;

                // スコア計算
                let scoreMultiplier = 1.0;
                if (word_consecutiveCorrect >= 5) {
                    if (word_consecutiveCorrect % 5 === 0) showCombo();
                    scoreMultiplier = 1.2;
                }
                score += Math.floor(word_currentWord.length * 50 * scoreMultiplier);
                scoreDisplay.textContent = score;

                // 対戦相手にスコアを送信
                window.electronAPI.sendMessage({ type: 'score_update', value: score });

                totalCorrectTyped++;
                setTimeout(setNextWordAsteroidQuestion, 300); // 次の単語へ
            }
        } else {
            if (settings.sfx) { errorAudio.currentTime = 0; errorAudio.play(); }
            const expectedKey = romajiSequence && romajiIndex < romajiSequence.length
                ? (romajiSequence[romajiIndex].romanji[0][romajiBuffer.length] || romajiSequence[romajiIndex].romanji[0])
                : word_currentWord[word_typedWord.length];
            if (expectedKey) {
                keyMistakeStats[expectedKey] = (keyMistakeStats[expectedKey] || 0) + 1;
            }
            word_consecutiveCorrect = 0; // コンボをリセット
        }
        updateWordAsteroidDisplay(); // 画面表示を更新
    } else if (currentConfig.gameMode === 'wordAsteroid') {
        if (key.length > 1) return;

        const ok = processWordInput(key);
        if (ok) {
            if (settings.sfx) { typeAudio.currentTime = 0; typeAudio.play(); }

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
            if (settings.sfx) { errorAudio.currentTime = 0; errorAudio.play(); }
            const expectedKey = romajiSequence && romajiIndex < romajiSequence.length
                ? (romajiSequence[romajiIndex].romanji[0][romajiBuffer.length] || romajiSequence[romajiIndex].romanji[0])
                : word_currentWord[word_typedWord.length];
            if (expectedKey) {
                keyMistakeStats[expectedKey] = (keyMistakeStats[expectedKey] || 0) + 1;
            }
            word_consecutiveCorrect = 0;
            word_asteroidScale += 0.25;
            asteroidContainer.style.setProperty('transform', `scale(${word_asteroidScale})`, 'important');
            if (word_asteroidScale >= 4.0) {
                gameOver(currentTranslation.gameOverAsteroidCollision);
            }
            // 何もせず、正しいキーの入力を待つ
        }
        updateWordAsteroidDisplay();
    } else if (currentConfig.gameMode === 'fallingStars') {
        const targetStarIndex = activeStars.findIndex(s => s.char === key);
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

            // (追加) どのキーでミスしたかを記録
            const expectedKey = word_currentWord[word_typedWord.length];
            if (expectedKey) {
                keyMistakeStats[expectedKey] = (keyMistakeStats[expectedKey] || 0) + 1;
            }
            timeLeft -= currentConfig.mistakePenalty;
            timerDisplay.textContent = timeLeft;
            consecutiveCorrect = 0;
        }
        if (totalCorrectTyped >= currentConfig.questionLimit) { gameClear(); }
    } else { // singleCharモード
        if (event.key === 'Dead' && singleChar_accentInfo) {
            key = singleChar_accentInfo.accentChar;
        }
        const pressedKeyElement = getKeyElementForChar(key);
        if (pressedKeyElement) {
            pressedKeyElement.classList.add('pressed');
            setTimeout(() => {
                pressedKeyElement.classList.remove('pressed');
            }, 100);
        }
        const expectedChar = singleChar_inputSequence[singleChar_sequenceIndex] || singleChar_currentQuestion;
        if (key === expectedChar) {
            if (singleChar_accentInfo && singleChar_sequenceIndex === 0 && singleChar_inputSequence.length > 1) {
                singleChar_sequenceIndex++;
                singleChar_clearHighlight();
                const baseKey = getKeyElementForChar(removeDiacritics(singleChar_currentQuestion));
                if (baseKey) {
                    baseKey.classList.add('blinking');
                    singleChar_highlightedKeyElements.push(baseKey);
                }
                return;
            }
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
            if (expectedChar) {
                keyMistakeStats[expectedChar] = (keyMistakeStats[expectedChar] || 0) + 1;
            }
            singleChar_sequenceIndex = 0;
            singleChar_clearHighlight();
            if (singleChar_accentInfo && singleChar_accentInfo.baseChar) {
                highlightAccent(singleChar_accentInfo);
            }
        }
    }
}

// --- ゲームフロー関数 ---
async function stopGame(message) {
    isPlaying = false;
    cancelAnimationFrame(gameLoopId);
    if (settings.bgm) bgmAudio.pause();
    clearInterval(timerInterval);
    if (message) await showModalAlert(message);
    window.electronAPI.navigateToStageSelect();
}

function gameClear(customMessage) {
    const endMessage = customMessage || currentTranslation.alertClearTitle;
    saveResultAndExit(endMessage);
}

function gameOver(customMessage) { // customMessageを受け取れるように変更
    // (追加) 早食いチャレンジの勝敗判定
    if (currentConfig.gameMode === 'scoreAttack' && timeLeft <= 0) {
        const myScore = score;
        const opponentScore = parseInt(opponentScoreDisplay.textContent, 10);
        if (myScore > opponentScore) {
            customMessage = `勝利！ (${myScore} vs ${opponentScore})`;
        } else if (myScore < opponentScore) {
            customMessage = `敗北... (${myScore} vs ${opponentScore})`;
        } else {
            customMessage = `引き分け！ (${myScore} vs ${opponentScore})`;
        }
    } else if (currentConfig.gameMode === 'race' && timeLeft <= 0) {
        judgeRaceResult();
        return;
    }
    const endMessage = customMessage || currentTranslation.alertTimeUp;
    saveResultAndExit(endMessage);

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
    keyMistakeStats = {}; // (追加) ゲーム開始時にミス統計をリセット
    
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
    } else if (currentConfig.gameMode === 'race') { // この else if を追加
        raceWordIndex = 0;
        myScore = 0;
        opponentScore = 0;
        raceConsecutivePerfect = 0;
        word_typedWord = '';
        currentConfig.timeLimit = 120; // 制限時間を設定
        timerDisplay.textContent = currentConfig.timeLimit;
        
        // UIの初期化
        opponentInfoContainer.style.display = 'block';
        updateAnimalPosition(myProgressAnimal, 0);
        updateAnimalPosition(opponentProgressAnimal, 0);
        setAnimalState(myProgressAnimal, MY_ANIMAL_IMAGES, 'normal');
        setAnimalState(opponentProgressAnimal, OPPONENT_ANIMAL_IMAGES, 'normal');
        myWordCount.textContent = '0';
        opponentWordCount.textContent = '0';

        // 最初の単語をセット
        setNextRaceWord();
    } else if (currentConfig.gameMode === 'scoreAttack') { // このelse ifブロックを追加
        word_consecutiveCorrect = 0;
        setNextWordAsteroidQuestion(); // 最初の単語を表示
        // wordAsteroid_gameLoop() は呼び出さない
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

function listenToOpponent() {
    window.electronAPI.onNetworkData(data => {
        if (data.type === 'score_update' && currentConfig.gameMode === 'race') {
            opponentScore = data.value;
            updateAnimalPosition(opponentProgressAnimal, opponentScore);
            opponentWordCount.textContent = opponentScore;
            checkRaceWinCondition();
        }
        if (data.type === 'status_update' && currentConfig.gameMode === 'race') {
            setAnimalState(opponentProgressAnimal, OPPONENT_ANIMAL_IMAGES, data.value);
        }
        if (data.type === 'opponent_quit') {
            // (追加) 相手が退出したら、勝利としてゲームを終了する
            gameOver(currentTranslation.gameOverOpponentDisconnected);
            return; // 以降の処理は不要
        }
        if (data.type === 'score_update' && currentConfig.gameMode === 'scoreAttack') {
            // 相手のスコアを更新
            opponentScoreDisplay.textContent = data.value;
        } else if (data.type === 'game_clear') {
            // 相手がクリアした場合（進捗レース用）
            gameOver(currentTranslation.gameOverOpponentFinished);
        }
    });
}

function setNextRaceWord() {
    if (!currentConfig.wordList || currentConfig.wordList.length === 0) return;
    if (raceWordIndex >= currentConfig.wordList.length) {
        raceWordIndex = 0; // 単語リストをループ
    }
    word_currentWord = currentConfig.wordList[raceWordIndex];
    raceWordIndex++;
    word_typedWord = '';
    raceWordHasMistake = false;
    // (New!) 日本語の場合はローマ字入力を初期化
    prepareRomaji(word_currentWord);
    updateWordAsteroidDisplay(); // 表示更新ロジックは流用
}

// (追加) 勝敗判定を行う関数
function checkRaceWinCondition() {
    if (myScore >= currentConfig.questionLimit || opponentScore >= currentConfig.questionLimit) {
        // 合計 questionLimit 単語に達した場合
        judgeRaceResult();
        return true;
    }
    return false;
}

// (追加) 最終的な勝敗を判定してゲームを終了する関数
function judgeRaceResult() {
    let msg = "";
    if (myScore > opponentScore) {
        msg = `勝利！ (${myScore} vs ${opponentScore})`;
    } else if (myScore < opponentScore) {
        msg = `敗北... (${myScore} vs ${opponentScore})`;
    } else {
        msg = currentTranslation.gameOverTie
            .replace('{myCount}', myScore)
            .replace('{opponentCount}', opponentScore);
    }
    stopGame(msg);
}


async function initialize() {
    settings = await window.electronAPI.getSettings();
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
    if (layoutData && layoutData.displayLayout && layoutData.practiceKeys) {
        // グローバル変数を設定（キーボード描画用）
        CURRENT_LAYOUT = layoutData.displayLayout;
        CURRENT_ACCENT_MAP = layoutData.accentMap || {};

        // ホームキーを使うステージ（1と3）の設定
        STAGE_CONFIG[1].questionKeys = layoutData.practiceKeys.homeRow;
        STAGE_CONFIG[3].questionKeys = layoutData.practiceKeys.homeRow;

        // 全キーを使うステージ（2と4）の設定
        STAGE_CONFIG[2].questionKeys = layoutData.practiceKeys.alphabet;
        STAGE_CONFIG[4].questionKeys = layoutData.practiceKeys.alphabet;
    }
    // (New!) 単語リストデータに基づいてステージ設定を動的に更新
    if (wordListData) {
        if (wordListData.stage5_words) {
            STAGE_CONFIG[5].wordList = wordListData.stage5_words;
            STAGE_CONFIG[7].wordList = wordListData.stage5_words;
            STAGE_CONFIG[8].wordList = wordListData.stage5_words;
        }
        if (wordListData.stage6_sentences) {
            STAGE_CONFIG[6].wordList = wordListData.stage6_sentences;
        }

    }
    const stageId = await window.electronAPI.getCurrentStageId();
    if (stageId === 9) {
        const statsData = await window.electronAPI.getStatsData();
        if (statsData && statsData.keyStats) {
            const topKeys = Object.entries(statsData.keyStats)
                .sort((a, b) => b[1].mistakes - a[1].mistakes)
                .slice(0, 10)
                .map(([key]) => key);
            STAGE_CONFIG[9].questionKeys = topKeys.length > 0 ? topKeys : STAGE_CONFIG[2].questionKeys;
        } else {
            STAGE_CONFIG[9].questionKeys = STAGE_CONFIG[2].questionKeys;
        }
    }
    currentConfig = STAGE_CONFIG[stageId] || STAGE_CONFIG[1];
    createKeyboard();
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keydown', e => { if (e.key === 'Shift') updateShiftDisplay(true); });
    window.addEventListener('keyup', e => { if (e.key === 'Shift') updateShiftDisplay(false); });
    quitButton.addEventListener('click', () => {
        // (追加) 対戦モードの場合、相手に退出を通知する
        if (currentConfig.gameMode === 'race' || currentConfig.gameMode === 'scoreAttack') {
            window.electronAPI.sendMessage({ type: 'opponent_quit' });
        }
        stopGame(null);
    });
    window.electronAPI.onNetworkEvent((event, data) => {
        if (event === 'opponent_disconnected') {
            gameOver(currentTranslation.gameOverNetworkError);
        }
    });
    questionDisplay.className = 'question-display';
    asteroidContainer.style.display = 'none';
    questionTextWrapper.style.display = 'none';
    questionText.style.display = 'none';
    if (currentConfig.gameMode === 'race' || currentConfig.gameMode === 'scoreAttack') {
        opponentInfoContainer.style.display = 'block';
        if (currentConfig.gameMode === 'race') {
            opponentProgressAnimal.style.display = 'block';
            myProgressAnimal.style.display = 'block';
        } else {
            document.getElementById('opponent-score-container').style.display = 'block';
            opponentProgressAnimal.style.display = 'none';
            myProgressAnimal.style.display = 'none';
        }
        asteroidContainer.style.display = 'none';
        questionTextWrapper.style.display = 'block';
        questionText.style.display = 'block';
        keyboardLayoutDiv.style.display = 'none';


        infoBarelements.forEach(el => {
            el.style.display = 'none';
        });


        const raceWordList = await window.electronAPI.getRaceWordList();
        if (raceWordList && raceWordList.length > 0) {
            currentConfig.wordList = raceWordList;
        }
        listenToOpponent();
    }else if (currentConfig.gameMode === 'wordAsteroid') {
        document.body.classList.add('night-sky-bg');
        questionDisplay.classList.add('mode-word-asteroid');
        keyboardLayoutDiv.style.display = 'none';
        ['star-count-box', 'kpm-box', 'bonus-box'].forEach(id => document.getElementById(id).style.display = 'none');
        asteroidContainer.style.display = 'block';
        questionTextWrapper.style.display = 'block';
        questionText.style.display = 'block';
        remainingCountLabel.textContent = currentTranslation.remainingCounter;
    }else if (currentConfig.gameMode === 'fallingStars') {
        document.body.classList.add('night-sky-bg');
        questionDisplay.classList.add('mode-falling-stars');
        keyboardLayoutDiv.style.display = 'none';
        remainingCountLabel.textContent = currentTranslation.remainingCounter;
    } else {
        document.body.classList.remove('night-sky-bg');
        questionDisplay.classList.add('mode-single-char', 'perspective-3d');
        keyboardLayoutDiv.style.display = 'block';
        questionTextWrapper.style.display = 'block';
        remainingCountLabel.textContent = currentTranslation.remainingCounter;
    }
    
    startCountdown();
}
initialize();

