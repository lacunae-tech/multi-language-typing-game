const manualContentEl = document.getElementById('manual-content');
const backButton = document.getElementById('back-button');

let currentTranslation = {};

function translateUI() {
    document.documentElement.setAttribute('dir', currentTranslation.direction || 'ltr');
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (currentTranslation[key]) el.textContent = currentTranslation[key];
    });
}

async function initialize() {
    const settings = await window.electronAPI.getSettings();
    currentTranslation = await window.electronAPI.getTranslation(settings.language);
    translateUI();
    const content = await window.electronAPI.getManualContent(settings.language);
    manualContentEl.value = content;
}

backButton.addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});

initialize();
