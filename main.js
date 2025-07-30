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
    language: 'ja', // (New!)
    layout: 'qwerty', // (New!)
};

let mainWindow;
let currentUser = null;
let currentStageId = null; // (New!) 現在選択されているステージID


// --- ネットワーク関連の変数 ---
let server = null;
let clientSocket = null;
let hostSocket = null;

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

// --- IPアドレスを取得する関数 ---
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

// (New!) 設定保存のAPI
ipcMain.handle('save-settings', (event, settings) => {
    return saveSettings(settings);
});
// (New!) 翻訳ファイルを読み込むAPI
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

// (New!) レイアウトファイルを読み込むAPI
ipcMain.handle('get-layout', (event, layoutName) => {
    try {
        const filePath = path.join(__dirname, `assets/layouts/${layoutName}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return []; // 見つからない場合は空の配列
    } catch (error) {
        console.error(`レイアウトファイル(${layoutName}.json)の読み込みに失敗:`, error);
        return [];
    }
});

// (New!) 単語リストファイルを読み込むAPI
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

// ゲーム画面への遷移処理 (New!)

ipcMain.on('navigate-to-stage-select', () => {
    if (mainWindow) {
        mainWindow.loadFile('stageSelect.html');
    }
});

// ゲーム画面への遷移 (ステージIDを受け取るように変更)
ipcMain.on('navigate-to-game', (event, stageId) => {
    currentStageId = stageId; // ステージIDを保持
    if (mainWindow) {
        mainWindow.loadFile('game.html');
    }
});

// (New!) ゲーム画面から現在のステージIDを要求されたときの処理
ipcMain.handle('get-current-stage-id', () => {
    return currentStageId;
});


// --- ネットワークAPI ---
ipcMain.handle('start-server', () => {
    server = net.createServer((socket) => {
        hostSocket = socket;
        mainWindow.webContents.send('network-event', 'client_connected', { userName: 'Opponent' }); // 仮
        
        socket.on('data', (data) => {
            // クライアントからのデータ受信処理
            const message = JSON.parse(data.toString());
            if (message.type === 'start_game_request') {
                 // ゲーム開始処理
            }
        });
    });
    server.listen(8080);
    return getLocalIpAddress();
});

ipcMain.handle('connect-to-server', (event, ip) => {
    clientSocket = new net.Socket();
    clientSocket.connect(8080, ip, () => {
        mainWindow.webContents.send('network-event', 'connected_to_host', { hostName: 'Host' }); // 仮
    });
});

ipcMain.handle('send-message', (event, message) => {
    const socket = isHost ? hostSocket : clientSocket;
    if (socket) {
        socket.write(JSON.stringify(message));
    }
});

ipcMain.on('close-connection', () => {
    if (server) server.close();
    if (clientSocket) clientSocket.destroy();
    if (hostSocket) hostSocket.destroy();
});