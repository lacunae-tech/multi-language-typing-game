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

// メニュー各ボタンのクリックイベントを簡潔に設定
[
    ['start-button', 'navigateToStageSelect'],
    ['stats-button', 'navigateToStats'],
    ['settings-button', 'navigateToSettings'],
    ['about-button', 'navigateToAbout'],
].forEach(([id, action]) => {
    document.getElementById(id).addEventListener('click', () => {
        window.electronAPI[action]();
    });
});

// --- 初期化処理 ---
async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
}
initialize();
