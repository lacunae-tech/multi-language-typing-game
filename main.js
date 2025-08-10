// main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net'); // Node.jsのnetモジュールをインポート
const os = require('os');   // IPアドレス取得用にosモジュールをインポート

const saveDir = path.join(app.getPath('userData'), 'save_data');
if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
}
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
const defaultSettings = {
    bgm: true,
    sfx: true,
    language: 'en',
    layout: 'qwerty',
};

let translations = {};
function getAssetPath(...segments) {
    const base = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, 'assets');
    return path.join(base, ...segments);
}
function loadTranslations(lang) {
    try {
        const filePath = getAssetPath('lang', `${lang}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            translations = JSON.parse(data);
        } else {
            translations = {};
        }
    } catch (error) {
        console.error('翻訳ファイルの読み込みに失敗しました:', error);
        translations = {};
    }
}

// 初期翻訳の読み込み
loadTranslations(loadSettings().language);

let mainWindow;
let currentUser = null;
let currentStageId = null;
let currentRaceWordList = []; // (追加) レース用の単語リストを保持する変数

// --- ネットワーク関連の変数 ---
let server = null;
let clientSocket = null;
let hostSocket = null;
let isHost = false; // (FIX 1) Declare isHost variable
let lastGameResult = null;

function loadSettings() {
    try {
        if (fs.existsSync(settingsFilePath)) {
            const settingsData = fs.readFileSync(settingsFilePath, 'utf-8');
            return { ...defaultSettings, ...JSON.parse(settingsData) };
        } else {
            fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
            return defaultSettings;
        }
    } catch (error) {
        console.error('設定ファイルの読み込みに失敗しました:', error);
        return defaultSettings;
    }
}

function saveSettings(settings) {
    try {
        const currentSettings = loadSettings();
        const newSettings = { ...currentSettings, ...settings };
        fs.writeFileSync(settingsFilePath, JSON.stringify(newSettings, null, 2));
        if (settings.language && settings.language !== currentSettings.language) {
            loadTranslations(settings.language);
        }
        return { success: true };
    } catch (error) {
        console.error('設定ファイルの保存に失敗しました:', error);
        return { success: false, error: error.message };
    }
}

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}
// ユーザーデータを読み込むヘルパー関数
function loadUserData(userName) {
    const filePath = path.join(saveDir, `${userName}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
}

// ユーザーデータを保存するヘルパー関数
function saveUserData(userName, data) {
    const filePath = path.join(saveDir, `${userName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();
};


// ゲーム結果を保存するIPCハンドラ
ipcMain.handle('save-game-result', async (event, result) => {
    console.log('レンダラーからゲーム結果を受信しました:', result);
    console.log('現在のユーザー:', currentUser);
    if (!currentUser) return { success: false };

    const userData = loadUserData(currentUser);
    if (!userData) return { success: false };

    // スコア履歴の初期化
    if (!userData.scoreHistory) userData.scoreHistory = {};
    const stageKey = `stage${result.stageId}`;
    if (!userData.scoreHistory[stageKey]) userData.scoreHistory[stageKey] = [];

    // 新しいスコアを追加
    userData.scoreHistory[stageKey].push({
        score: result.score,
        date: new Date().toISOString()
    });

    // キーごとのミス統計をマージ
    if (!userData.keyStats) userData.keyStats = {};
    for (const key in result.mistakes) {
        if (!userData.keyStats[key]) userData.keyStats[key] = { mistakes: 0 };
        userData.keyStats[key].mistakes += result.mistakes[key];
    }

    saveUserData(currentUser, userData);
    return { success: true };
});

// 統計データを取得するIPCハンドラ
ipcMain.handle('get-stats-data', () => {
    if (!currentUser) return null;
    return loadUserData(currentUser);
});

// ユーザーデータの履歴をクリアするIPCハンドラ
ipcMain.handle('clear-user-history', () => {
    if (!currentUser) {
        return { success: false, error: 'No user logged in' };
    }
    try {
        const userData = loadUserData(currentUser) || {};
        userData.scoreHistory = {};
        userData.keyStats = {};
        saveUserData(currentUser, userData);
        return { success: true };
    } catch (error) {
        console.error('Failed to clear user history:', error);
        return { success: false, error: error.message };
    }
});

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('get-settings', () => {
    return loadSettings();
});

ipcMain.handle('get-users', async () => {
    const files = fs.readdirSync(saveDir);
    return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.parse(file).name);
});

ipcMain.handle('delete-user', async (event, userName) => {
    try {
        const filePath = path.join(saveDir, `${userName}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        if (currentUser === userName) {
            currentUser = null;
        }
        return { success: true };
    } catch (error) {
        console.error('ユーザーの削除に失敗しました:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-settings', (event, settings) => {
    return saveSettings(settings);
});
ipcMain.handle('get-translation', (event, lang) => {
    try {
        const filePath = getAssetPath('lang', `${lang}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error(`翻訳ファイル(${lang}.json)の読み込みに失敗:`, error);
        return {};
    }
});
ipcMain.on('navigate-to-stats', () => { mainWindow.loadFile('stats.html'); });
ipcMain.handle('get-layout', (event, layoutName) => {
    try {
        const filePath = getAssetPath('layouts', `${layoutName}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error(`レイアウトファイル(${layoutName}.json)の読み込みに失敗:`, error);
        return [];
    }
});

ipcMain.handle('get-word-list', (event, lang) => {
    try {
        const filePath = getAssetPath('words', `${lang}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error(`単語リストファイル(${lang}.json)の読み込みに失敗:`, error);
        return {};
    }
});

// (追加) レース用の単語リストを取得するAPI
ipcMain.handle('get-race-word-list', () => {
    return currentRaceWordList;
});

ipcMain.handle('login-or-create-user', async (event, userName) => {
    try {
        currentUser = userName;
        const filePath = path.join(saveDir, `${userName}.json`);
        if (!fs.existsSync(filePath)) {
            const newUser = {
                userName: userName,
                createdAt: new Date().toISOString(),
                highScores: {}
            };
            fs.writeFileSync(filePath, JSON.stringify(newUser, null, 2));
        }
        return { success: true, userName: userName };
    } catch (error) {
        console.error('ユーザーの作成/ログインに失敗しました:', error);
        const title = translations.errorTitle || 'Error';
        const message = translations.userDataError || 'An error occurred while processing user data.';
        dialog.showErrorBox(title, message);
        return { success: false, error: error.message };
    }
});

ipcMain.on('navigate-to-main-menu', () => {
    if (mainWindow && currentUser) {
        mainWindow.loadFile('mainMenu.html');
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('set-user', currentUser);
        });
    }
});

ipcMain.on('navigate-to-settings', () => {
    if (mainWindow) {
        mainWindow.loadFile('settings.html');
    }
});

ipcMain.on('navigate-to-stage-select', () => {
    if (mainWindow) {
        mainWindow.loadFile('stageSelect.html');
    }
});

ipcMain.on('navigate-to-game', (event, stageId) => {
    currentStageId = stageId;
    if (mainWindow) {
        mainWindow.loadFile('game.html');
    }
});

ipcMain.handle('get-current-stage-id', () => {
    return currentStageId;
});

ipcMain.on('navigate-to-lobby', (event, stageId) => {
    currentStageId = stageId;
    if (mainWindow) {
        mainWindow.loadFile('lobby.html');
    }
});

ipcMain.on('navigate-to-result', (event, result) => {
    lastGameResult = result;
    mainWindow.loadFile('result.html');
});

ipcMain.handle('get-last-game-result', () => {
    return lastGameResult;
});

ipcMain.on('navigate-to-about', () => {
    mainWindow.loadFile('about.html');
});

// --- ネットワークAPI ---
ipcMain.handle('start-server', () => {
    isHost = true;
    server = net.createServer((socket) => {
        hostSocket = socket;
        const clientName = (socket.remoteAddress || 'Unknown').replace(/^::ffff:/, '');
        mainWindow.webContents.send('network-event', 'client_connected', { userName: clientName });

        // (修正) クライアントからのゲーム中データを受信し、ホストのレンダラへ転送
        socket.on('data', (data) => {
            try {
                mainWindow.webContents.send('network-data', JSON.parse(data.toString()));
            } catch (e) { console.error(e); }
        });
        // (追加) クライアントとの接続が切れた場合の処理
        const handleDisconnect = () => {
            if (hostSocket) { // ソケットが存在する場合のみ処理
                hostSocket = null; // ソケットをクリア
                mainWindow.webContents.send('network-event', 'opponent_disconnected');
            }
        };
        socket.on('error', handleDisconnect);
        socket.on('close', handleDisconnect);
    });
    server.on('error', (err) => {
        mainWindow.webContents.send('network-event', 'server_error', err.message);
    });
    server.listen(8080);
    return getLocalIpAddress();
});

ipcMain.handle('connect-to-server', (event, ip) => {
    isHost = false;
    clientSocket = new net.Socket();
    clientSocket.connect(8080, ip, () => {
        const hostName = (clientSocket.remoteAddress || ip || 'Unknown').replace(/^::ffff:/, '');
        mainWindow.webContents.send('network-event', 'connected_to_host', { hostName });
    });

    clientSocket.on('data', (data) => {
        try {
            const message = JSON.parse(data.toString());
            // ゲーム開始コマンドとゲーム中データを区別
            if (message.type === 'start_game') {
                mainWindow.webContents.send('network-event', 'start_game', { stageId: message.stageId });
            } else {
                // (修正) ホストからのゲーム中データをクライアントのレンダラへ転送
                mainWindow.webContents.send('network-data', message);
            }
        } catch (e) { console.error(e); }
    });
    const handleDisconnect = () => {
        if (clientSocket) { // ソケットが存在する場合のみ処理
            clientSocket = null; // ソケットをクリア
            mainWindow.webContents.send('network-event', 'opponent_disconnected');
        }
    };
    clientSocket.on('error', handleDisconnect);
    clientSocket.on('close', handleDisconnect);
});

ipcMain.handle('get-app-info', () => {
    // package.jsonを動的に読み込む
    const packageJsonPath = path.join(app.getAppPath(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return {
        name: app.getName(), // アプリ名
        version: app.getVersion(), // バージョン
        author: packageJson.author, // 作者
        description: packageJson.description, // 説明
        copyright: packageJson.build.copyright, // 著作権情報
        dependencies: packageJson.dependencies, // (追加) 使用ライブラリ
        devDependencies: packageJson.devDependencies // (追加) 開発用ライブラリ
    };
});
ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url);
});

ipcMain.handle('get-credits-data', () => {
    try {
        const filePath = path.join(__dirname, 'assets/credits.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('クレジットファイルの読み込みに失敗:', error);
        return null;
    }
});

ipcMain.handle('send-message', (event, message) => {
    // ゲーム開始リクエストはホストのみ
    if (isHost && message.type === 'start_game_request') {
        // (修正) ステージ7の場合、単語リストを作成・保持する
        if (currentStageId === 7) {
            const lang = loadSettings().language;
            const wordsFilePath = getAssetPath('words', `${lang}.json`);
            if (fs.existsSync(wordsFilePath)) {
                const allWords = JSON.parse(fs.readFileSync(wordsFilePath, 'utf-8'));
                const wordPool = allWords.stage5_words || []; // ステージ5の単語を流用
                const shuffled = [...wordPool].sort(() => 0.5 - Math.random());
                if (shuffled.length < 60) {
                    const looped = [];
                    while (looped.length < 60) {
                        looped.push(...shuffled);
                    }
                    currentRaceWordList = looped.slice(0, 60);
                } else {
                    currentRaceWordList = shuffled; // 60語以上なら全て使用
                }
            } else {
                currentRaceWordList = [];
            }
        }
        const startGameMessage = JSON.stringify({ type: 'start_game', stageId: currentStageId });
        if (hostSocket) {
            hostSocket.write(startGameMessage);
        }
        mainWindow.webContents.send('network-event', 'start_game', { stageId: currentStageId });
        return;
    }

    // ゲーム中のデータ送信
    const socket = isHost ? hostSocket : clientSocket;
    if (socket) {
        socket.write(JSON.stringify(message));
    }
});


ipcMain.on('close-connection', () => {
    if (server) {
        server.close();
        server = null;
    }
    if (clientSocket) {
        clientSocket.destroy();
        clientSocket = null;
    }
    if (hostSocket) {
        hostSocket.destroy();
        hostSocket = null;
    }
    isHost = false; // Reset flag
});
