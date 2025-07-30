// mainMenu.renderer.js
const welcomeMessage = document.getElementById('welcome-message');

window.electronAPI.onSetUser((userName) => {
    welcomeMessage.textContent = `${userName}さん、ようこそ！`;
});

// ゲームスタートボタンの処理をステージ選択画面への遷移に変更
document.getElementById('start-button').addEventListener('click', () => {
    window.electronAPI.navigateToStageSelect();
});

document.getElementById('stats-button').addEventListener('click', () => {
    console.log('統計データ画面へ');
});

document.getElementById('settings-button').addEventListener('click', () => {
    window.electronAPI.navigateToSettings();
});
