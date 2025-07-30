// stageSelect.renderer.js
const stageGrid = document.querySelector('.stage-grid');

// 要件定義に基づいたステージ情報
const stages = [
    { id: 1, name: 'ホームキー・ならし', description: '基本の練習' },
    { id: 2, name: '全キー・ならし', description: 'すべてのキーの練習' },
    { id: 3, name: '星降るホームキー', description: 'ホームキーの練習' },
    { id: 4, name: '星降る全キー', description: 'すべてのキーの練習' },
    { id: 5, name: '単語れんしゅう', description: '隕石を破壊せよ！' }, // 更新
    { id: 6, name: '文章れんしゅう', description: '長文で隕石を破壊！' }, // 更新
    { id: 7, name: '対戦：進捗レース', description: '対戦1' },
    { id: 8, name: '対戦：早食いチャレンジ', description: '対戦2' },
    { id: 9, name: '苦手キー復習', description: '（準備中）' },
];

// ステージ情報を元にボタンを生成
stages.forEach(stage => {
    const stageButton = document.createElement('button');
    stageButton.className = 'stage-button';
    // ステージが準備中なら 'disabled' クラスを追加
    if (stage.description === '（準備中）') {
        stageButton.classList.add('disabled');
    }
    
    stageButton.innerHTML = `
        <span class="stage-id">STAGE ${stage.id}</span>
        <span class="stage-name">${stage.name}</span>
        <span class="stage-description">${stage.description}</span>
    `;

    // 準備中のステージはクリックできないようにする
    if (stage.description !== '（準備中）') {
        stageButton.addEventListener('click', () => {
            // ゲーム画面へ、選択したステージIDを渡して遷移
            if (stage.id === 7 || stage.id === 8) {
                window.electronAPI.navigateToLobby(stage.id); // lobbyへの遷移に変更
            } else {
                window.electronAPI.navigateToGame(stage.id);
            }
        });
    }

    stageGrid.appendChild(stageButton);
});

// 戻るボタンの処理
document.getElementById('back-button').addEventListener('click', () => {
    window.electronAPI.navigateToMainMenu();
});
