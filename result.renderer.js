const endMessageEl = document.getElementById('end-message');
const resultSummaryEl = document.getElementById('result-summary');
const scoreEl = document.getElementById('score');
const timeBonusEl = document.getElementById('time-bonus');
const totalScoreEl = document.getElementById('total-score');
const accuracyEl = document.getElementById('accuracy');

const retryButton = document.getElementById('retry-button');
const backButton = document.getElementById('back-button');
const clearHistoryButton = document.getElementById('clear-history-button');
const stageSelect = document.getElementById('stage-select');
const keyStatsGrid = document.getElementById('key-stats-grid');
const chartContainer = document.getElementById('chart-container');
const chartCanvas = document.getElementById('score-chart');
const scoreTableContainer = document.getElementById('score-table-container');
const scoreTable = document.getElementById('score-table');
const weakKeySection = document.getElementById('weak-key-section');

const isWindows7 = navigator.userAgent.includes('Windows NT 6.1');
const useChart = !isWindows7 && typeof Chart !== 'undefined';

if (!useChart) {
    chartContainer.style.display = 'none';
    scoreTableContainer.style.display = 'block';
}

let lastResult = null;
let statsData = null;
let scoreChart = null;
let currentTranslation = {};

function translateUI() {
    document.documentElement.setAttribute('dir', currentTranslation.direction || 'ltr');
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (currentTranslation[key]) el.textContent = currentTranslation[key];
    });
    document.querySelectorAll('[data-translate-key-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-key-placeholder');
        if (currentTranslation[key]) el.placeholder = currentTranslation[key];
    });
}

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

function renderKeyStats() {
    keyStatsGrid.innerHTML = '';
    if (!statsData || !statsData.keyStats) return;

    const keyStats = statsData.keyStats;
    const sortedKeys = Object.keys(keyStats).sort((a, b) => keyStats[b].mistakes - keyStats[a].mistakes);

    sortedKeys.forEach(key => {
        const stat = keyStats[key];
        const div = document.createElement('div');
        div.className = 'key-stat';
        if (stat.mistakes >= 5) {
            div.classList.add('weak');
        }
        const unit = currentTranslation.mistakeUnit || '回';
        div.innerHTML = `<div class="key-char">${key}</div><div class="mistake-rate">${stat.mistakes}${unit}</div>`;
        keyStatsGrid.appendChild(div);
    });
}

function renderScoreTable(stageKey) {
    chartContainer.style.display = 'none';
    scoreTableContainer.style.display = 'block';
    const thead = scoreTable.querySelector('thead');
    const tbody = scoreTable.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    if (!statsData || !statsData.scoreHistory || !statsData.scoreHistory[stageKey]) {
        return;
    }
    const attemptHeader = currentTranslation.attemptHeader || '#';
    const scoreHeader = currentTranslation.scoreLabel || 'Score';
    const accuracyHeader = currentTranslation.accuracyLabel || 'Accuracy';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>${attemptHeader}</th><th>${scoreHeader}</th><th>${accuracyHeader}</th>`;
    thead.appendChild(headerRow);
    const history = statsData.scoreHistory[stageKey];
    const maxScore = Math.max(...history.map(h => h.score));
    history.forEach((h, i) => {
        const row = document.createElement('tr');
        if (h.score === maxScore) row.classList.add('highlight');
        const accuracyText = h.accuracy != null ? `${h.accuracy.toFixed(1)}%` : '-';
        row.innerHTML = `<td>${i + 1}</td><td>${h.score.toLocaleString()}</td><td>${accuracyText}</td>`;
        tbody.appendChild(row);
    });
}

function renderChart(stageKey) {
    if (!useChart) {
        renderScoreTable(stageKey);
        return;
    }
    chartContainer.style.display = 'block';
    scoreTableContainer.style.display = 'none';
    if (scoreChart) {
        scoreChart.destroy();
    }
    if (!statsData || !statsData.scoreHistory || !statsData.scoreHistory[stageKey]) {
        return;
    }

    const history = statsData.scoreHistory[stageKey];
    const labels = history.map((_, i) => {
        const template = currentTranslation.attemptLabel || '{n}回目';
        return template.replace('{n}', i + 1);
    });
    const data = history.map(h => h.score);

    const dataset = {
        label: currentTranslation.scoreLabel || 'スコア',
        data: data,
        borderColor: '#81d4fa',
        tension: 0.1
    };

    if (lastResult && stageKey === `stage${lastResult.stageId}`) {
        const pointRadii = new Array(data.length).fill(4);
        const pointColors = new Array(data.length).fill('#29b6f6');
        pointRadii[data.length - 1] = 8;
        pointColors[data.length - 1] = '#f06292';
        dataset.pointRadius = pointRadii;
        dataset.pointBackgroundColor = pointColors;
    }

    scoreChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [dataset]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

stageSelect.addEventListener('change', () => {
    renderChart(stageSelect.value);
});

retryButton.addEventListener('click', () => {
    if (lastResult) {
        window.electronAPI.navigateToGame(lastResult.stageId);
    }
});

backButton.addEventListener('click', () => {
    if (lastResult) {
        window.electronAPI.navigateToStageSelect();
    } else {
        window.electronAPI.navigateToMainMenu();
    }
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

async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();

    [statsData, lastResult] = await Promise.all([
        window.electronAPI.getStatsData(),
        window.electronAPI.getLastGameResult()
    ]);

    if (lastResult) {
        if (lastResult.endMessage) {
            endMessageEl.textContent = lastResult.endMessage;
        } else {
            endMessageEl.style.display = 'none';
        }
        scoreEl.textContent = lastResult.score.toLocaleString();
        timeBonusEl.textContent = lastResult.timeBonus.toLocaleString();
        totalScoreEl.textContent = lastResult.totalScore.toLocaleString();
        accuracyEl.textContent = lastResult.accuracy != null ? `${lastResult.accuracy.toFixed(1)}%` : '-';
        weakKeySection.style.display = 'none';
    } else {
        resultSummaryEl.style.display = 'none';
        retryButton.style.display = 'none';
        endMessageEl.style.display = 'none';
    }

    populateStageOptions();
    if (lastResult) {
        stageSelect.value = `stage${lastResult.stageId}`;
    }
    renderKeyStats();
    renderChart(stageSelect.value);
}

initialize();

