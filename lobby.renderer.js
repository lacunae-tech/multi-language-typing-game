// js/lobby.renderer.js
const backButton = document.getElementById('back-button');
// (他のUI要素の取得)

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

// ホストになるボタンの処理
document.getElementById('host-button').addEventListener('click', async () => {
    document.getElementById('initial-choice').style.display = 'none';
    document.getElementById('host-view').style.display = 'block';
    const ip = await window.electronAPI.startServer();
    document.getElementById('ip-address').textContent = ip;
});

// 参加するボタンの処理
document.getElementById('join-button').addEventListener('click', () => {
    document.getElementById('initial-choice').style.display = 'none';
    document.getElementById('client-view').style.display = 'block';
});

// 接続ボタンの処理
document.getElementById('connect-button').addEventListener('click', () => {
    const ip = document.getElementById('ip-input').value;
    window.electronAPI.connectToServer(ip);
});

// 対戦開始ボタンの処理
document.getElementById('start-match-button').addEventListener('click', () => {
    window.electronAPI.sendMessage({ type: 'start_game_request' });
});


window.electronAPI.onNetworkEvent((event, data) => {
    const hostStatus = document.getElementById('host-status');
    const clientStatus = document.getElementById('client-status');

    switch (event) {
        case 'client_connected':
            hostStatus.textContent = `${data.userName} が接続しました！`;
            document.getElementById('start-match-button').disabled = false;
            break;
        case 'connected_to_host':
            clientStatus.textContent = `${data.hostName} に接続しました。開始を待っています...`;
            break;
        case 'start_game':
            window.electronAPI.navigateToGame(data.stageId);
            break;
    }
});


backButton.addEventListener('click', () => {
    window.electronAPI.closeConnection();
    window.electronAPI.navigateToStageSelect();
});

async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
}
initialize();
