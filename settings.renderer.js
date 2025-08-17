// settings.renderer.js
const bgmToggle = document.getElementById('bgm-toggle');
const sfxToggle = document.getElementById('sfx-toggle');
const languageSelect = document.getElementById('language-select');
const layoutSelect = document.getElementById('layout-select'); // (New!)

let currentTranslation = {};

// UIのテキストを翻訳する関数
function translateUI() {
    document.documentElement.setAttribute('dir', currentTranslation.direction || 'ltr');
    document.querySelectorAll('[data-translate-key]').forEach(element => {
        const key = element.getAttribute('data-translate-key');
        if (currentTranslation[key]) {
            element.textContent = currentTranslation[key];
        }
    });
}

// 設定を保存する関数
async function saveCurrentSettings() {
    const newSettings = {
        bgm: bgmToggle.checked,
        sfx: sfxToggle.checked,
        language: languageSelect.value,
        layout: layoutSelect.value, // (New!)
    };
    await window.electronAPI.saveSettings(newSettings);
    
    // 言語が変更された場合は、UIを再翻訳
    currentTranslation = await window.electronAPI.getTranslation(newSettings.language);
    translateUI();
}

// ページ読み込み時に現在の設定を読み込んでUIに反映
async function loadAndApplySettings() {
    const settings = await window.electronAPI.getSettings();
    bgmToggle.checked = settings.bgm;
    sfxToggle.checked = settings.sfx;
    languageSelect.value = settings.language;
    layoutSelect.value = settings.layout; // (New!)

    // UIを翻訳
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
}

// イベントリスナーを設定
bgmToggle.addEventListener('change', saveCurrentSettings);
sfxToggle.addEventListener('change', saveCurrentSettings);
languageSelect.addEventListener('change', saveCurrentSettings);
layoutSelect.addEventListener('change', saveCurrentSettings); // (New!)

document.getElementById('back-button').addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

// 初期化
loadAndApplySettings();