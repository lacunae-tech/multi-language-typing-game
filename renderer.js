// renderer.js

// HTMLの要素を取得
const nameInput = document.getElementById('name-input');
const confirmButton = document.getElementById('confirm-button');
const feedbackText = document.getElementById('feedback-text');
const userListDiv = document.getElementById('user-list');
const languageSelectContainer = document.getElementById('language-select-container');
const languageSelect = document.getElementById('language-select');

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

// --- イベントリスナーの設定 ---

// 決定ボタンがクリックされたときの処理
confirmButton.addEventListener('click', async () => {
    const userName = nameInput.value;
    if (!userName) {
        feedbackText.textContent = currentTranslation.feedbackNameEmpty;
        return;
    }
    handleLogin(userName);
});

// 入力欄でEnterキーが押されたときの処理
nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        confirmButton.click(); // 決定ボタンのクリックイベントを発火
    }
});

// 言語選択が変更されたときの処理
languageSelect.addEventListener('change', async () => {
    const newLang = languageSelect.value;
    await window.electronAPI.saveSettings({ language: newLang });
    currentTranslation = await window.electronAPI.getTranslation(newLang);
    translateUI();
    displayUsers();
});


// --- 関数の定義 ---

// ログイン/ユーザー作成を行う関数
async function handleLogin(userName) {
    // preload.js経由でmain.jsの処理を呼び出す
    const result = await window.electronAPI.loginOrCreateUser(userName);

    if (result.success) {
        feedbackText.textContent = currentTranslation.feedbackWelcome.replace('{userName}', result.userName);
        // ログイン成功後、メインメニューへ遷移
        window.electronAPI.navigateToMainMenu(result.userName);
    } else {
        feedbackText.textContent = currentTranslation.feedbackError.replace('{error}', result.error);
    }
}

// 既存ユーザーを読み込んで表示する関数
async function displayUsers() {
    // preload.js経由でmain.jsの処理を呼び出す
    const users = await window.electronAPI.getUsers();

    userListDiv.innerHTML = ''; // 一旦リストを空にする
    languageSelectContainer.style.display = 'none';

    if (users.length === 0) {
        userListDiv.textContent = currentTranslation.noUsersFound;
        languageSelectContainer.style.display = 'flex';
        return;
    }

    users.forEach(user => {
        const userButton = document.createElement('button');
        userButton.textContent = user;
        userButton.className = 'user-button';
        // 既存ユーザーのボタンが押されたら、その名前でログイン
        userButton.addEventListener('click', () => {
            handleLogin(user);
        });
        userListDiv.appendChild(userButton);
    });
}

// --- 初期化処理 ---
async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    languageSelect.value = settings.language;
    translateUI();
    displayUsers();
}
initialize();
