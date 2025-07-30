const endMessageEl = document.getElementById('end-message');
const finalScoreEl = document.getElementById('final-score');
const retryButton = document.getElementById('retry-button');
const backButton = document.getElementById('back-button');
const chartCanvas = document.getElementById('score-chart');

let lastResult = null;

// グラフと結果を表示するメインの関数
async function displayResults() {
    // 今回のゲーム結果と、過去の全統計データを取得
    lastResult = await window.electronAPI.getLastGameResult();
    const statsData = await window.electronAPI.getStatsData();

    if (!lastResult) {
        endMessageEl.textContent = '結果の取得に失敗しました';
        return;
    }

    // 今回の結果を表示
    endMessageEl.textContent = lastResult.endMessage;
    finalScoreEl.textContent = lastResult.score.toLocaleString();

    // グラフを描画
    const stageKey = `stage${lastResult.stageId}`;
    if (statsData && statsData.scoreHistory && statsData.scoreHistory[stageKey]) {
        renderScoreChart(statsData.scoreHistory[stageKey]);
    }
}

// グラフを描画する関数
function renderScoreChart(history) {
    const labels = history.map((_, i) => `${i + 1}回目`);
    const data = history.map(h => h.score);

    // 今回のスコアをグラフ上で目立たせるための設定
    const pointRadii = new Array(data.length - 1).fill(4);
    pointRadii.push(8); // 最後の点を大きく
    const pointColors = new Array(data.length - 1).fill('#29b6f6');
    pointColors.push('#f06292'); // 最後の点の色を変更

    new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `ステージ${lastResult.stageId}のスコア推移`,
                data: data,
                borderColor: '#81d4fa',
                pointBackgroundColor: pointColors,
                pointRadius: pointRadii,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ボタンのイベントリスナー
retryButton.addEventListener('click', () => {
    if (lastResult) {
        // 同じステージでゲームを再開
        window.electronAPI.navigateToGame(lastResult.stageId);
    }
});

backButton.addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

// 初期化
displayResults();