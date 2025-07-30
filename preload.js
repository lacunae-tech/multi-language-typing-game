// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 設定API
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings), // (New!)
    getTranslation: (lang) => ipcRenderer.invoke('get-translation', lang), // (New!)
    getLayout: (layoutName) => ipcRenderer.invoke('get-layout', layoutName), // (New!)
    getWordList: (lang) => ipcRenderer.invoke('get-word-list', lang), // (New!)

    // ユーザー選択画面で使うAPI
    getUsers: () => ipcRenderer.invoke('get-users'),
    loginOrCreateUser: (userName) => ipcRenderer.invoke('login-or-create-user', userName),
    
    // 画面遷移で使うAPI
    navigateToMainMenu: () => ipcRenderer.send('navigate-to-main-menu'),
    navigateToSettings: () => ipcRenderer.send('navigate-to-settings'),
    navigateToStageSelect: () => ipcRenderer.send('navigate-to-stage-select'), // (New!)
    navigateToGame: (stageId) => ipcRenderer.send('navigate-to-game', stageId), // (Updated!)
    navigateToLobby: (stageId) => ipcRenderer.send('navigate-to-lobby', stageId),

    // メインメニュー画面で使うAPI
    onSetUser: (callback) => ipcRenderer.on('set-user', (event, userName) => callback(userName)),

    // ゲーム画面で使うAPI (New!)
    getCurrentStageId: () => ipcRenderer.invoke('get-current-stage-id'),
    getRaceWordList: () => ipcRenderer.invoke('get-race-word-list'), // (追加)


    // --- ネットワークAPI ---
    startServer: () => ipcRenderer.invoke('start-server'),
    connectToServer: (ip) => ipcRenderer.invoke('connect-to-server', ip),
    sendMessage: (message) => ipcRenderer.invoke('send-message', message),
    onNetworkEvent: (callback) => ipcRenderer.on('network-event', (event, ...args) => callback(...args)),
    onNetworkData: (callback) => ipcRenderer.on('network-data', (event, data) => callback(data)), // この行を追加
    closeConnection: () => ipcRenderer.send('close-connection'),
});