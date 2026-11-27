// 句子分頁：單字本裡那些單字的例句和熟練度，點一下聽整句、看拼音和出自哪個單字。

import { display } from './kana.js';
import { savedGroups, rangeLabel } from './range.js';
import { SENTENCES, sentencesIn, sentenceKey } from './sentences.js';
import { markWord } from './entry.js';
import { renderBook } from './book.js';
import { icons } from './ui.js';

export function renderSentencebook(root) {
  return renderBook(root, {
    cls: 'sentencebook',
    filterPref: 'sentFilter',
    unit: '句',
    load() {
      const groups = savedGroups();
      const items = sentencesIn(groups);
      const outside = SENTENCES.length - items.length;
      return {
        items,
        intro: `
          <div class="range-head">
            <h2 class="sheet-title">單字的例句</h2>
            <span class="muted">${items.length} 句</span>
          </div>
          <p class="w-range">每個單字都附一句例句。這裡列出單字本裡的單字（範圍：<b>${
            rangeLabel(groups) || '已選範圍'
          }</b>）的例句${outside ? `，學更多行，還有 ${outside} 句會出現` : ''}。句子裡可能有還沒學過的假名，點開可以看拼音。</p>
          <a class="link-btn" href="#sentences/quiz">改範圍</a>`,
      };
    },
    sections: (xs) => [{ title: '', items: xs }],
    key: sentenceKey,
    id: (s) => s.id,
    rowHTML: (s) => `
      <span class="s-text">
        <span class="s-ja" lang="ja">${markWord(s.ja, s.word)}</span>
        <span class="s-zh">${s.zh}</span>
      </span>`,
    detailHTML: (s) => `
      <div class="s-detail">
        <div class="s-detail-row">
          <p class="s-romaji">${s.romaji}</p>
          <button type="button" class="icon-btn plain small" data-act="speak-ex" data-item="${s.id}" aria-label="再聽一次">${icons.volume}</button>
        </div>
        <p class="s-from">出自單字 <b lang="ja">${display(s.word, s.word.script)}</b> ${s.word.romaji}・${s.word.zh}</p>
      </div>`,
    speakText: (s) => s.ja,
    exText: (s) => s.ja,
    empty: {
      none: '這個範圍還沒有能讀的單字，所以也還沒有例句。按下面的「練習句子」，多選幾行假名吧。',
      weak: '沒有常答錯的句子，很棒！',
      learning: '沒有正在練習的句子。',
      new: '這個範圍的句子都練過了！',
    },
    barHTML: (counts, total) => {
      const sum = !total
        ? '<b>還沒有能練的句子</b>先多選幾行假名'
        : counts.weak
          ? `<b>${counts.weak} 句常答錯</b>練習時會先出現`
          : `<b>${total} 句</b>下一步選題型和題數`;
      return `<p class="start-sum">${sum}</p>
        <a class="btn primary" href="#sentences/quiz">練習句子 ${icons.arrow}</a>`;
    },
  });
}
