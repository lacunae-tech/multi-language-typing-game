const backButton = document.getElementById('back-button');
const stageSelect = document.getElementById('stage-select');
const keyStatsGrid = document.getElementById('key-stats-grid');
const chartCanvas = document.getElementById('score-chart');
let scoreChart = null;
let statsData = null;

// ステージの選択肢を生成
for (let i = 1; i <= 9; i++) {
    const option = document.createElement('option');
    option.value = `stage${i}`;
    option.textContent = `ステージ ${i}`;
    stageSelect.appendChild(option);
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
        div.innerHTML = `<div class="key-char">${key}</div><div class="mistake-rate">${stat.mistakes}回</div>`;
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
    const labels = history.map((_, i) => `${i + 1}回目`);
    const data = history.map(h => h.score);

    scoreChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'スコア',
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
    renderKeyStats();
    renderChart(stageSelect.value);
}

stageSelect.addEventListener('change', () => {
    renderChart(stageSelect.value);
});

backButton.addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

initialize();