// renderer.js

// HTMLの要素を取得
const nameInput = document.getElementById('name-input');
const confirmButton = document.getElementById('confirm-button');
const feedbackText = document.getElementById('feedback-text');
const userListDiv = document.getElementById('user-list');

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

    if (users.length === 0) {
        userListDiv.textContent = currentTranslation.noUsersFound;
        return;
    }

    users.forEach(user => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'user-entry';

        const userButton = document.createElement('button');
        userButton.textContent = user;
        userButton.className = 'user-button';
        userButton.addEventListener('click', () => {
            handleLogin(user);
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = currentTranslation.userDeleteButton;
        deleteButton.className = 'user-delete-button';
        deleteButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const msg = currentTranslation.confirmUserDelete.replace('{userName}', user);
            if (await showModalConfirm(msg)) {
                await window.electronAPI.deleteUser(user);
                setTimeout(() => {
                    nameInput.focus(); // フォーカスを設定
                    displayUsers();
                }, 10);
            } else {
                nameInput.focus(); // フォーカスを設定
            }
        });

        entryDiv.appendChild(userButton);
        entryDiv.appendChild(deleteButton);
        userListDiv.appendChild(entryDiv);
    });
}

// --- 初期化処理 ---
async function initialize() {
    const settings = await window.electronAPI.getSettings();
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
    displayUsers();
}
initialize();