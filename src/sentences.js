// 句子：每個單字的字典解釋裡都有一句例句（dict.js），句子測驗就用這些句子出題。
// 例句只用假名，詞和詞之間空一格，所以可以直接切成「排句子」用的詞塊。

import { BY_KANA, toHiragana } from './kana.js';
import { WORDS } from './words.js';
import { wordsIn } from './range.js';

const END = /[。！？]$/;
const MACRON = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };
const SMALL_VOWEL = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' }; // フォ → fo
const PARTICLE = { は: 'wa', へ: 'e', を: 'o' }; // 當助詞時的念法

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 把句子切成詞塊：照空格切，「、」跟著前面的詞。句尾的「。」不放進詞塊，免得一看就知道哪塊在最後。
function chunksOf(ja) {
  return ja.replace(END, '').replace(/、/g, '、 ').split(' ').filter(Boolean);
}

// 一段假名的拼音：拗音算一個音，っ 重複下一個子音，ー 把前一個母音拉長
function kanaRomaji(text) {
  const h = toHiragana(text);
  let r = '';
  let double = false;
  for (let i = 0; i < h.length; i++) {
    const ch = h[i];
    const two = h.slice(i, i + 2);
    let s;
    if (two.length === 2 && BY_KANA[two]) {
      s = BY_KANA[two].romaji;
      i++;
    } else if (ch === 'っ') {
      double = true;
      continue;
    } else if (ch === 'ー') {
      r = r.replace(/[aiueo]$/, (v) => MACRON[v]);
      continue;
    } else if (SMALL_VOWEL[ch]) {
      r = r.replace(/[aiueo]$/, '') + SMALL_VOWEL[ch];
      continue;
    } else if (BY_KANA[ch]) s = BY_KANA[ch].romaji;
    else {
      r += ch === '、' ? ',' : ch;
      continue;
    }
    if (double) r += s.startsWith('ch') ? 't' : s[0];
    double = false;
    r += s;
  }
  return r;
}

// 詞塊的拼音：最後一個字是助詞 は／へ／を 時，照助詞的念法另外寫（わたしは → watashi wa）
export function chunkRomaji(chunk) {
  const comma = chunk.endsWith('、');
  const body = comma ? chunk.slice(0, -1) : chunk;
  const last = body.slice(-1);
  const r =
    body.length > 1 && PARTICLE[last] ? `${kanaRomaji(body.slice(0, -1))} ${PARTICLE[last]}` : kanaRomaji(body);
  return comma ? `${r},` : r;
}

const ROMAJI_END = { '。': '.', '！': '!', '？': '?' };

// 一整句的拼音（句子中間的「。」也會換成句點，例如「はじめまして。たなかです。」）
export const romajiOf = (ja) =>
  (ja.match(/[^。！？]+[。！？]?/g) || [])
    .map((part) => {
      const end = part.match(END)?.[0] || '';
      return chunksOf(part).map(chunkRomaji).join(' ') + (ROMAJI_END[end] || '');
    })
    .join(' ');

export const SENTENCES = WORDS.filter((w) => w.dict?.ex).map((w) => {
  const ja = w.dict.ex;
  const chunks = chunksOf(ja);
  const end = ja.match(END)?.[0] || '';
  return {
    kind: 'sentence',
    id: w.kana, // 每個單字一句，用單字當編號
    ja,
    zh: w.dict.exZh,
    word: w,
    chunks,
    end,
    romaji: romajiOf(ja),
  };
});

export const sentenceKey = (s) => `sent:${s.id}`;

// 範圍裡的句子：單字本裡那些單字（用已選的假名就能寫出來）的例句
export function sentencesIn(groups) {
  const words = new Set(wordsIn(groups));
  return SENTENCES.filter((s) => words.has(s.word));
}

// 所有詞塊（去掉後面的「、」），排句子的干擾詞從這裡挑
const ALL_CHUNKS = [...new Set(SENTENCES.flatMap((s) => s.chunks.map((c) => c.replace(/、$/, ''))))];

// 排句子的詞塊：句子本身的詞，再加兩個別的句子裡的詞。
// 干擾詞優先挑最後一個字相同的（例如 コーヒーを 配 みずを），看起來比較像，不能只靠助詞猜。
function orderBank(s) {
  const own = new Set(s.chunks.map((c) => c.replace(/、$/, '')));
  const extra = [];
  const ok = (c) => !own.has(c) && !extra.includes(c) && [...c].length <= 8;
  for (const c of shuffle(s.chunks)) {
    if (extra.length >= 2) break;
    const tail = c.replace(/、$/, '').slice(-1);
    const same = ALL_CHUNKS.filter((x) => x.endsWith(tail) && ok(x));
    if (same.length) extra.push(pick(same));
  }
  while (extra.length < 2) extra.push(pick(ALL_CHUNKS.filter(ok)));
  return shuffle([...s.chunks, ...extra]).map((t) => ({ t, r: chunkRomaji(t) }));
}

// 選意思、聽句子的選項：其他句子的中文。優先挑長度差不多的，不能只看長短猜答案。
function meaningOptions(s, pool) {
  const candidates = shuffle(pool.length >= 8 ? pool : SENTENCES)
    .filter((o) => o !== s && o.zh !== s.zh)
    .map((o) => ({ o, d: Math.abs(o.zh.length - s.zh.length) + Math.random() * 3 }))
    .sort((a, b) => a.d - b.d);
  const picks = [];
  for (const { o } of candidates) {
    if (picks.length >= 3) break;
    if (!picks.some((p) => p.zh === o.zh)) picks.push(o);
  }
  return shuffle([s, ...picks]);
}

export const SENTENCE_MODES = ['order', 'mean', 'listen'];

// 準備一題句子題。mode 是設定的題型；混合時每題各自抽一種。
// 裝置沒有日文語音（canListen 為 false）時不出「聽句子」。重練答錯的題目時沿用原本的題型。
export function prepSentence(q, pool, mode, canListen) {
  const modes = canListen ? SENTENCE_MODES : SENTENCE_MODES.filter((m) => m !== 'listen');
  let m = q.mode || mode;
  if (!modes.includes(m)) m = pick(modes);
  if (m === 'order') return { ...q, mode: m, bank: orderBank(q.item), placed: [] };
  return { ...q, mode: m, options: meaningOptions(q.item, pool) };
}
