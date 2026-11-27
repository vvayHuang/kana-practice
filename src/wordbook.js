// 單字分頁：單字本。列出用已選範圍的假名就能寫出來的單字和熟練度，點一下聽發音、看字典解釋。

import { display } from './kana.js';
import { WORDS } from './words.js';
import { mastery, hasStats } from './store.js';
import { savedGroups, wordsIn, rangeLabel } from './range.js';
import { entryHTML } from './entry.js';
import { renderBook } from './book.js';
import { icons } from './ui.js';

const show = (w) => display(w, w.script);
const key = (w) => `word:${w.kana}`;

export function renderWordbook(root) {
  return renderBook(root, {
    cls: 'wordbook',
    filterPref: 'bookFilter',
    unit: '個',
    load() {
      const groups = savedGroups();
      const items = wordsIn(groups);
      const outside = WORDS.length - items.length;
      return {
        items,
        intro: `
          <div class="range-head">
            <h2 class="sheet-title">單字本</h2>
            <span class="muted">${items.length} 個能讀的單字</span>
          </div>
          <p class="w-range">只列出用 <b>${rangeLabel(groups) || '已選範圍'}</b> 的假名就能寫出來的單字${
            outside ? `，學更多行，還有 ${outside} 個會出現` : ''
          }。點一下單字可以聽發音、看解釋。</p>
          <a class="link-btn" href="#words/quiz">改範圍</a>`,
      };
    },
    sections: (xs) => [
      { title: '平假名', items: xs.filter((w) => w.script === 'hira') },
      { title: '片假名', items: xs.filter((w) => w.script === 'kata') },
    ],
    key,
    id: (w) => w.kana,
    rowHTML: (w) => `
      <span class="w-head"><span class="w-word" lang="ja">${show(w)}</span><span class="w-romaji">${w.romaji}</span></span>
      <span class="w-zh">${w.zh}</span>`,
    detailHTML: (w) => entryHTML(w, null),
    speakText: show,
    exText: (w) => w.dict?.ex || show(w),
    empty: {
      none: '這個範圍還寫不出單字。按下面的「練習單字」，多選幾行假名吧。',
      weak: '沒有常答錯的單字，很棒！',
      learning: '沒有正在練習的單字。',
      new: '這個範圍的單字都練過了！',
    },
    barHTML: (counts, total) => {
      const sum = !total
        ? '<b>還沒有能練的單字</b>先多選幾行假名'
        : counts.weak
          ? `<b>${counts.weak} 個常答錯</b>練習時會先出現`
          : `<b>${total} 個單字</b>下一步選題型和題數`;
      return `<p class="start-sum">${sum}</p>
        <a class="btn primary" href="#words/quiz">練習單字 ${icons.arrow}</a>`;
    },
    // 熟練了一些單字、還沒練過句子時，提醒可以往下一步走
    nextHTML() {
      if (hasStats('sent:')) return '';
      const good = WORDS.filter((w) => mastery(key(w)) === 'good').length;
      if (good < 10) return '';
      return `<section class="sheet start-card next-step">
        <p>已經熟練 ${good} 個單字<br />可以開始練句子了</p>
        <a class="link-btn" href="#sentences">去句子 ${icons.arrow}</a>
      </section>`;
    },
  });
}
