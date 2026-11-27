// 單字的字典解釋：意思、念法、詞性、漢字或來源、使用情境、例句。
// 單字測驗答題後顯示在題目下方，單字本點開一個單字時也用同一份。

import { display } from './kana.js';
import { icons } from './ui.js';

const show = (w) => display(w, w.script);

// 例句裡把這個單字標出來；い形容詞常會變化（からい → からくて），找不到整個字就標字幹
function markWord(ex, w) {
  const word = show(w);
  const hit = ex.includes(word) ? word : w.dict.pos === 'い形容詞' ? word.slice(0, -1) : '';
  return hit ? ex.replace(hit, `<b>${hit}</b>`) : ex;
}

// head：最上面那一行要寫什麼。畫面上已經大大顯示的東西就不再重複。
//   'zh'   寫意思和拼音（題目是單字的時候）
//   'word' 寫單字和拼音（題目是意思的時候）
//   null   不寫（單字本那一列已經寫了單字、拼音和意思）
export function entryHTML(w, head) {
  const d = w.dict;
  const headHTML =
    head === 'word'
      ? `<div class="entry-head"><span class="entry-word" lang="ja">${show(w)}</span><span class="entry-romaji">${w.romaji}</span></div>`
      : head === 'zh'
        ? `<div class="entry-head"><span class="entry-zh">${w.zh}</span><span class="entry-romaji">${w.romaji}</span></div>`
        : '';
  if (!d) return headHTML ? `<div class="entry">${headHTML}</div>` : '';
  const kata = w.script === 'kata';
  return `
    <div class="entry">
      ${headHTML}
      <div class="entry-tags">
        <span class="tag">${d.pos}</span>
        ${d.origin ? `<span class="tag">${kata ? '來源' : '漢字'} <b${kata ? '' : ' lang="ja"'}>${d.origin}</b></span>` : ''}
      </div>
      <p class="entry-label">使用情境</p>
      <p class="entry-note">${d.note}</p>
      <div class="entry-label">
        例句
        <button type="button" class="icon-btn plain small" data-act="speak-ex" data-word="${w.kana}" aria-label="播放例句">${icons.volume}</button>
      </div>
      <p class="ex-ja" lang="ja">${markWord(d.ex, w)}</p>
      <p class="ex-zh">${d.exZh}</p>
    </div>`;
}
