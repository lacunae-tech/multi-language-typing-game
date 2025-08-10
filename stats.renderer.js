const backButton = document.getElementById('back-button');
const clearHistoryButton = document.getElementById('clear-history-button');
const stageSelect = document.getElementById('stage-select');
const keyStatsGrid = document.getElementById('key-stats-grid');
const chartCanvas = document.getElementById('score-chart');
let scoreChart = null;
let statsData = null;
let currentTranslation = {};

function translateUI() {
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (currentTranslation[key]) el.textContent = currentTranslation[key];
    });
    document.querySelectorAll('[data-translate-key-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-key-placeholder');
        if (currentTranslation[key]) el.placeholder = currentTranslation[key];
    });
}

// ステージの選択肢を生成
function populateStageOptions() {
    stageSelect.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const option = document.createElement('option');
        option.value = `stage${i}`;
        const prefix = currentTranslation.stageOptionPrefix || 'Stage ';
        option.textContent = `${prefix}${i}`;
        stageSelect.appendChild(option);
    }
}

// 苦手キーを表示
function renderKeyStats() {
    keyStatsGrid.innerHTML = '';
    if (!statsData || !statsData.keyStats) return;

    const keyStats = statsData.keyStats;
    // ミスが多い順にソート
    const sortedKeys = Object.keys(keyStats).sort((a, b) => keyStats[b].mistakes - keyStats[a].mistakes);

    sortedKeys.forEach(key => {
        const stat = keyStats[key];
        const div = document.createElement('div');
        div.className = 'key-stat';
        // ミスが5回以上なら苦手キーとしてハイライト
        if (stat.mistakes >= 5) {
            div.classList.add('weak');
        }
        const unit = currentTranslation.mistakeUnit || '回';
        div.innerHTML = `<div class="key-char">${key}</div><div class="mistake-rate">${stat.mistakes}${unit}</div>`;
        keyStatsGrid.appendChild(div);
    });
}

// グラフを描画
function renderChart(stageKey) {
    if (scoreChart) {
        scoreChart.destroy(); // 既存のグラフを破棄
    }
    if (!statsData || !statsData.scoreHistory || !statsData.scoreHistory[stageKey]) {
        return; // データがなければ何もしない
    }

    const history = statsData.scoreHistory[stageKey];
    const labels = history.map((_, i) => {
        const template = currentTranslation.attemptLabel || '{n}回目';
        return template.replace('{n}', i + 1);
    });
    const data = history.map(h => h.score);

    scoreChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: currentTranslation.scoreLabel || 'スコア',
                data: data,
                borderColor: '#81d4fa',
                tension: 0.1
            }]
        }
    });
}

// 初期化処理
async function initialize() {
    statsData = await window.electronAPI.getStatsData();
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
    populateStageOptions();
    renderKeyStats();
    renderChart(stageSelect.value);
}

stageSelect.addEventListener('change', () => {
    renderChart(stageSelect.value);
});

backButton.addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

clearHistoryButton.addEventListener('click', async () => {
    const message = currentTranslation.confirmClearHistory || 'Are you sure you want to clear your history?';
    if (await showModalConfirm(message)) {
        await window.electronAPI.clearUserHistory();
        statsData = await window.electronAPI.getStatsData();
        renderKeyStats();
        renderChart(stageSelect.value);
    }
});

initialize();