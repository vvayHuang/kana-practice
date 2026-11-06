// 假名資料：只存平假名，片假名用字碼位移自動換算。

const row = (id, label, kind, cells) => ({
  id,
  label,
  kind,
  cells: cells.map((c) => (c ? { kana: c[0], romaji: c[1] } : null)),
});

export const SEION = [
  row('a', 'あ行', 'seion', [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']]),
  row('ka', 'か行', 'seion', [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']]),
  row('sa', 'さ行', 'seion', [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']]),
  row('ta', 'た行', 'seion', [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']]),
  row('na', 'な行', 'seion', [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']]),
  row('ha', 'は行', 'seion', [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']]),
  row('ma', 'ま行', 'seion', [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']]),
  row('ya', 'や行', 'seion', [['や', 'ya'], null, ['ゆ', 'yu'], null, ['よ', 'yo']]),
  row('ra', 'ら行', 'seion', [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']]),
  row('wa', 'わ行', 'seion', [['わ', 'wa'], null, null, null, ['を', 'wo']]),
  row('n', 'ん', 'seion', [['ん', 'n'], null, null, null, null]),
];

export const DAKUON = [
  row('ga', 'が行', 'dakuon', [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']]),
  row('za', 'ざ行', 'dakuon', [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']]),
  row('da', 'だ行', 'dakuon', [['だ', 'da'], ['ぢ', 'ji'], ['づ', 'zu'], ['で', 'de'], ['ど', 'do']]),
  row('ba', 'ば行', 'dakuon', [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']]),
  row('pa', 'ぱ行', 'dakuon', [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']]),
];

export const YOON = [
  row('kya', 'きゃ', 'yoon', [['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo']]),
  row('sha', 'しゃ', 'yoon', [['しゃ', 'sha'], ['しゅ', 'shu'], ['しょ', 'sho']]),
  row('cha', 'ちゃ', 'yoon', [['ちゃ', 'cha'], ['ちゅ', 'chu'], ['ちょ', 'cho']]),
  row('nya', 'にゃ', 'yoon', [['にゃ', 'nya'], ['にゅ', 'nyu'], ['にょ', 'nyo']]),
  row('hya', 'ひゃ', 'yoon', [['ひゃ', 'hya'], ['ひゅ', 'hyu'], ['ひょ', 'hyo']]),
  row('mya', 'みゃ', 'yoon', [['みゃ', 'mya'], ['みゅ', 'myu'], ['みょ', 'myo']]),
  row('rya', 'りゃ', 'yoon', [['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo']]),
  row('gya', 'ぎゃ', 'yoon', [['ぎゃ', 'gya'], ['ぎゅ', 'gyu'], ['ぎょ', 'gyo']]),
  row('ja', 'じゃ', 'yoon', [['じゃ', 'ja'], ['じゅ', 'ju'], ['じょ', 'jo']]),
  row('bya', 'びゃ', 'yoon', [['びゃ', 'bya'], ['びゅ', 'byu'], ['びょ', 'byo']]),
  row('pya', 'ぴゃ', 'yoon', [['ぴゃ', 'pya'], ['ぴゅ', 'pyu'], ['ぴょ', 'pyo']]),
];

export const SECTIONS = [
  { id: 'seion', title: '清音', note: '最基本的 46 個假名', cols: ['a', 'i', 'u', 'e', 'o'], rows: SEION },
  { id: 'dakuon', title: '濁音・半濁音', note: '右上加「゛」或「゜」', cols: ['a', 'i', 'u', 'e', 'o'], rows: DAKUON },
  { id: 'yoon', title: '拗音', note: 'い段假名＋小的ゃゅょ', cols: ['ya', 'yu', 'yo'], rows: YOON },
];

// 測驗範圍：清音每一行各自一組，濁音和拗音各一組
export const GROUPS = [
  ...SEION.map((r) => ({ id: r.id, label: r.label, kind: 'seion', items: r.cells.filter(Boolean) })),
  { id: 'dakuon', label: '濁音・半濁音', kind: 'dakuon', items: DAKUON.flatMap((r) => r.cells.filter(Boolean)) },
  { id: 'yoon', label: '拗音', kind: 'yoon', items: YOON.flatMap((r) => r.cells.filter(Boolean)) },
];

export const ALL = GROUPS.flatMap((g) => g.items);
export const BY_KANA = Object.fromEntries(ALL.map((i) => [i.kana, i]));

// 容易混淆或有特殊念法的假名
export const NOTES = {
  は: '當助詞時念 wa',
  へ: '當助詞時念 e',
  を: '幾乎只當助詞用，念 o',
  ぢ: '和 じ 同音，比較少用',
  づ: '和 ず 同音，比較少用',
  ん: '鼻音，不會出現在字首',
  し: '注意拼音是 shi 不是 si',
  ち: '注意拼音是 chi 不是 ti',
  つ: '注意拼音是 tsu 不是 tu',
  ふ: '介於 fu 和 hu 之間',
};

// 平假名 U+3041–U+3096 → 片假名 U+30A1–U+30F6
export const toKatakana = (s) =>
  s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

export const display = (item, script) => (script === 'kata' ? toKatakana(item.kana) : item.kana);
export const keyOf = (item, script) => `${script}:${item.kana}`;
