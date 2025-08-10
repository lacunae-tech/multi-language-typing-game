const appNameEl = document.getElementById('app-name');
const appVersionEl = document.getElementById('app-version');
const appAuthorEl = document.getElementById('app-author');
const appDescriptionEl = document.getElementById('app-description');
const appCopyrightEl = document.getElementById('app-copyright');
const appAuthorUrlEL = document.getElementById('app-author-url');
const backButton = document.getElementById('back-button');
const creditsTextarea = document.getElementById('credits-textarea'); 

let currentTranslation = {}; 

function translateUI() {
    document.querySelectorAll('[data-translate-key]').forEach(element => {
        const key = element.getAttribute('data-translate-key');
        if (currentTranslation[key]) {
            element.textContent = currentTranslation[key];
        }
    });
}
/**
 * クレジット情報をテキストエリアに設定する関数
 * @param {object} credits - credits.jsonから読み込んだデータ
 * @param {object} appInfo - package.jsonから読み込んだデータ
 * @param {string} lang - 現在の言語 ('ja', 'en'など)
 */



function populateCreditsTextarea(credits, appInfo, lang) {
    let fullText = '';

    if (credits) {
        fullText += '--- Assets ---\n\n';
        for (const key in credits) {
            const credit = credits[key];
            const title = credit.title[lang] || credit.title['ja'];
            fullText += `${title}: ${credit.source}\n`;
            if (credit.url) {
                fullText += `${credit.url}\n`;
            }
            fullText += '\n';
        }
    }

    // --- 使用技術（ライブラリ）部分 ---
    fullText += '--- Technologies ---\n\n';
    if (appInfo.dependencies) {
        for (const name in appInfo.dependencies) {
            fullText += `${name}: ${appInfo.dependencies[name]}\n`;
        }
    }
    if (appInfo.devDependencies) {
        fullText += '\n--- Dev Technologies ---\n\n';
        for (const name in appInfo.devDependencies) {
            fullText += `${name}: ${appInfo.devDependencies[name]}\n`;
        }
    }

    // textareaに生成したテキストを流し込む
    creditsTextarea.value = fullText;
}


// 情報を取得して画面に表示する
async function initialize() {
    // 翻訳処理
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();

    // アプリ情報の表示
    const info = await window.electronAPI.getAppInfo();
    appNameEl.textContent = info.name;
    appVersionEl.textContent = info.version;
    appAuthorEl.textContent = info.author.name;
    appDescriptionEl.textContent = info.description;
    appCopyrightEl.textContent = info.copyright;
    appAuthorUrlEL.textContent = info.author.url;

    // クレジット情報の取得と表示
    const creditsData = await window.electronAPI.getCreditsData();
    populateCreditsTextarea(creditsData, info, settings.language);
}

// 戻るボタンの処理 (設定画面に戻る)
backButton.addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

initialize();