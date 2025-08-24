// stageSelect.renderer.js
const stageGrid = document.querySelector('.stage-grid');


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

// (修正) ステージボタンを生成する関数
async function createStageButtons() {
    stageGrid.innerHTML = ''; // 既存のボタンをクリア

    const stages = currentTranslation.stages;
    if (!stages) return;

    const comingSoonText = currentTranslation.comingSoon;

    // プレイ済みステージを取得
    const statsData = await window.electronAPI.getStatsData();
    const playedStages = new Set();
    if (statsData && statsData.scoreHistory) {
        for (const [key, history] of Object.entries(statsData.scoreHistory)) {
            const match = key.match(/^stage(\d+)$/);
            if (match && history && history.length > 0) {
                playedStages.add(parseInt(match[1], 10));
            }
        }
    }

    for (const [id, stage] of Object.entries(stages)) {
        const stageButton = document.createElement('button');
        stageButton.className = 'stage-button';

        const isComingSoon = stage.status === 'comingSoon' || stage.status === 'coming_soon' || stage.comingSoon === true || (comingSoonText && stage.description === comingSoonText);
        if (isComingSoon) {
            stageButton.classList.add('disabled');
        }

        stageButton.innerHTML = `
            <span class="stage-id">STAGE ${id}</span>
            <span class="stage-name">${stage.name}</span>
            <span class="stage-description">${stage.description}</span>
        `;

        if (!isComingSoon) {
            stageButton.addEventListener('click', () => {
                const stageId = parseInt(id, 10);
                if (stageId === 7 || stageId === 8) {
                    window.electronAPI.navigateToLobby(stageId);
                } else {
                    window.electronAPI.navigateToGame(stageId);
                }
            });
        }

        const stageIdNum = parseInt(id, 10);
        if (stageIdNum <= 6 && playedStages.has(stageIdNum)) {
            const clearLabel = document.createElement('span');
            clearLabel.className = 'stage-clear';
            clearLabel.textContent = 'Clear';
            const descEl = stageButton.querySelector('.stage-description');
            stageButton.insertBefore(clearLabel, descEl);
        }

        stageGrid.appendChild(stageButton);
    }
}

// 戻るボタンの処理
document.getElementById('back-button').addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

// --- 初期化処理 ---
async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (currentTranslation[key]) el.textContent = currentTranslation[key];
    });

    await createStageButtons(); // 翻訳データとプレイ履歴を使ってボタンを生成
}
initialize();
