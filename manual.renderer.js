const manualContentEl = document.getElementById('manual-content');
const backButton = document.getElementById('back-button');

let currentTranslation = {};

function translateUI() {
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (currentTranslation[key]) el.textContent = currentTranslation[key];
    });
}

async function initialize() {
    const settings = await window.electronAPI.getSettings();
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
    const content = await window.electronAPI.getManualContent(settings.language);
    manualContentEl.value = content;
}

backButton.addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

initialize();
