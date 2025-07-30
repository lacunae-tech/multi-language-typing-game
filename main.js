// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
    language: 'ja',
    layout: 'qwerty',
};

let mainWindow;
let currentUser = null;
let currentStageId = null;


// --- ネットワーク関連の変数 ---
let server = null;
let clientSocket = null;
let hostSocket = null;
let isHost = false; // (FIX 1) Declare isHost variable

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
    mainWindow.webContents.openDevTools();
};

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

ipcMain.handle('save-settings', (event, settings) => {
    return saveSettings(settings);
});
ipcMain.handle('get-translation', (event, lang) => {
    try {
        const filePath = path.join(__dirname, `assets/lang/${lang}.json`);
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

ipcMain.handle('get-layout', (event, layoutName) => {
    try {
        const filePath = path.join(__dirname, `assets/layouts/${layoutName}.json`);
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
        const filePath = path.join(__dirname, `assets/words/${lang}.json`);
        console.log(lang);
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
        dialog.showErrorBox('エラー', 'ユーザーデータの処理中にエラーが発生しました。');
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

// --- ネットワークAPI ---
ipcMain.handle('start-server', () => {
    isHost = true;
    server = net.createServer((socket) => {
        hostSocket = socket;
        mainWindow.webContents.send('network-event', 'client_connected', { userName: 'Opponent' });

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
    server.listen(8080);
    return getLocalIpAddress();
});

ipcMain.handle('connect-to-server', (event, ip) => {
    isHost = false;
    clientSocket = new net.Socket();
    clientSocket.connect(8080, ip, () => {
        mainWindow.webContents.send('network-event', 'connected_to_host', { hostName: 'Host' });
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

ipcMain.handle('send-message', (event, message) => {
    // ゲーム開始リクエストはホストのみ
    if (isHost && message.type === 'start_game_request') {
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
    if (server) server.close();
    if (clientSocket) clientSocket.destroy();
    if (hostSocket) hostSocket.destroy();
    isHost = false; // Reset flag
});