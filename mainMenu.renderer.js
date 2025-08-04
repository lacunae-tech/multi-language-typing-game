// mainMenu.renderer.js
const welcomeMessage = document.getElementById('welcome-message');

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

window.electronAPI.onSetUser((userName) => {
    // welcomeMessage.textContent = `${userName}さん、ようこそ！`;

    // 翻訳データからテンプレート文字列を取得
    const messageTemplate = currentTranslation.mainMenuWelcome || "{userName}さん、ようこそ！";
    console.log(messageTemplate)
    // プレースホルダーを実際のユーザー名に置き換え
    const formattedMessage = messageTemplate.replace('{userName}', userName);
    welcomeMessage.textContent = formattedMessage;
    
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

// --- 初期化処理 ---
async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
}
initialize();