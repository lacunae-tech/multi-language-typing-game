// romanji.js
// ひらがなをローマ字に変換するためのライブラリ
// ヘボン式、訓令式など、考えられる複数の表記に同時に対応

const RomanjiConverter = (function() {

    // 各かな文字に対応する、考えられるローマ字表記をすべて配列で定義
    const romanjiMap = {
        'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
        'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
        'さ': ['sa'], 'し': ['shi', 'si'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
        'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
        'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
        'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
        'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
        'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
        'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
        'わ': ['wa'], 'を': ['wo', 'o'], 'ん': ['n', 'nn'],
        'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
        'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
        'だ': ['da'], 'ぢ': ['ji', 'zi', 'di'], 'づ': ['zu', 'du'], 'で': ['de'], 'ど': ['do'],
        'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
        'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
        'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
        'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
        'ちゃ': ['cha', 'tya'], 'ちゅ': ['chu', 'tyu'], 'ちょ': ['cho', 'tyo'],
        'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
        'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
        'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
        'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
        'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
        'じゃ': ['ja', 'zya'], 'じゅ': ['ju', 'zyu'], 'じょ': ['jo', 'zyo'],
        'ぢゃ': ['ja', 'zya', 'dya'], 'ぢゅ': ['ju', 'zyu', 'dyu'], 'ぢょ': ['jo', 'zyo', 'dyo'],
        'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
        'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
        '。': ['.'], '、': [','], 'ー': ['-'], '「': ['['], '」': [']']
    };

    // カタカナをひらがなに変換
    function toHiragana(str) {
        return str.replace(/[\u30a1-\u30f6]/g, ch =>
            String.fromCharCode(ch.charCodeAt(0) - 0x60)
        );
    }

    /**
     * かな文字列を、複数のローマ字表記候補を持つオブジェクトの配列に変換します。
     * カタカナにも対応し、促音（っ/ッ）も考慮します。
     * @param {string} text - 変換するかな文字列。
     * @returns {Array<Object>} かなとローマ字候補の配列。例: [{ kana: 'し', romanji: ['shi', 'si'] }]
     */
    function convert(text) {
        let result = [];
        let i = 0;
        while (i < text.length) {
            const char = text[i];

            // 促音処理
            if (char === 'っ' || char === 'ッ') {
                const next = text[i + 1];
                if (next) {
                    const nextHira = toHiragana(next);
                    const romanjiOptions = romanjiMap[nextHira] || [nextHira];
                    result.push({ kana: char, romanji: [romanjiOptions[0].charAt(0)] });
                } else {
                    result.push({ kana: char, romanji: [''] });
                }
                i++;
                continue;
            }

            // 小書きのゃゅょ等を含む2文字の組み合わせ
            if (i + 1 < text.length) {
                const twoOrig = text.substring(i, i + 2);
                const twoHira = toHiragana(twoOrig);
                if (romanjiMap[twoHira]) {
                    result.push({ kana: twoOrig, romanji: romanjiMap[twoHira] });
                    i += 2;
                    continue;
                }
            }

            const oneOrig = char;
            const oneHira = toHiragana(oneOrig);
            const romanji = romanjiMap[oneHira] || [oneHira];
            result.push({ kana: oneOrig, romanji: romanji });
            i++;
        }
        return result;
    }

    return {
        convert: convert
    };
})();
