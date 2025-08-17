// mainMenu.renderer.js
const welcomeMessage = document.getElementById('welcome-message');

let currentTranslation = {};
let currentUserName = '';

function translateUI() {
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (currentTranslation[key]) el.textContent = currentTranslation[key];
    });
    document.querySelectorAll('[data-translate-key-placeholder]').forEach(el => {
        const key = el.getAttribute('data-translate-key-placeholder');
        if (currentTranslation[key]) el.placeholder = currentTranslation[key];
    });
    updateWelcomeMessage();
}

function updateWelcomeMessage() {
    const messageTemplate = currentTranslation.mainMenuWelcome || "{userName}さん、ようこそ！";
    const formattedMessage = messageTemplate.replace('{userName}', currentUserName);
    welcomeMessage.textContent = formattedMessage;
}

window.electronAPI.onSetUser((userName) => {
    currentUserName = userName;
    updateWelcomeMessage();
});

// ゲームスタートボタンの処理をステージ選択画面への遷移に変更
document.getElementById('start-button').addEventListener('click', () => {
    window.electronAPI.navigateToStageSelect();
});

document.getElementById('stats-button').addEventListener('click', () => {
    window.electronAPI.navigateToStats();
});

document.getElementById('settings-button').addEventListener('click', () => {
    window.electronAPI.navigateToSettings();
});

document.getElementById('manual-button').addEventListener('click', () => {
    window.electronAPI.navigateToManual();
});

document.getElementById('about-button').addEventListener('click', () => {
    window.electronAPI.navigateToAbout();
});

// --- 初期化処理 ---
async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
}
initialize();