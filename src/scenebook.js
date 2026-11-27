// 情境題的「看熟悉度」：句子分頁最上面的情境卡片，以及每個情境的題目列表（先看、先聽，再練習）。

import { mastery } from './store.js';
import { SCENES, SCENE_BY_ID, sceneKey } from './scenes.js';
import { renderBook } from './book.js';
import { icons } from './ui.js';

const speakBtn = (q, which, label) =>
  `<button type="button" class="icon-btn plain small" data-act="speak-ex" data-item="${q.id}" data-say="${which}" aria-label="${label}">${icons.volume}</button>`;

// 句子分頁最上面：一個情境一張卡片，卡片上的記號是每一題的熟練度
export function sceneCardsHTML() {
  const total = SCENES.reduce((n, s) => n + s.items.length, 0);
  return `<section class="sheet sc-top">
    <div class="range-head">
      <h2 class="sheet-title">情境題</h2>
      <span class="muted">${SCENES.length} 個情境・${total} 題</span>
    </div>
    <p class="w-range">遇到這些場合要怎麼說？點一個情境，可以先看、先聽裡面的說法。</p>
    <div class="sc-grid">
      ${SCENES.map((s) => {
        const levels = s.items.map((q) => mastery(sceneKey(q)));
        const good = levels.filter((l) => l === 'good').length;
        return `<a class="sc-card" href="#scenes/${s.id}">
          <span class="sc-name">${s.name}</span>
          <span class="sc-sample" lang="ja">${s.sample}</span>
          <span class="sc-marks" aria-hidden="true">${levels.map((l) => `<i class="dot ${l}"></i>`).join('')}</span>
          <span class="sc-count">已熟練 ${good} / ${s.items.length}</span>
        </a>`;
      }).join('')}
    </div>
  </section>`;
}

// 一個情境的題目列表：場合、對方說的話、該說的話；點開看拼音和解說
export function renderScene(root, id) {
  const scene = SCENE_BY_ID[id];
  return renderBook(root, {
    cls: 'scenebook',
    filterPref: 'sceneFilter',
    unit: '題',
    load: () => ({
      items: scene.items,
      intro: `
        <a class="link-btn back-link" href="#sentences">${icons.back}回到句子</a>
        <div class="range-head">
          <h2 class="sheet-title">${scene.name}</h2>
          <span class="muted">${scene.items.length} 題</span>
        </div>
        <p class="w-range">每一題是一個場合和該說的話。點一下可以聽發音、看為什麼這樣說。</p>`,
    }),
    sections: (xs) => [{ title: '', items: xs }],
    key: sceneKey,
    id: (q) => q.id,
    rowHTML: (q) => `
      <span class="s-text">
        <span class="sc-ask">${q.ask}</span>
        ${q.they ? `<span class="sc-they-line">對方：<span lang="ja">${q.they.ja}</span></span>` : ''}
        ${q.answer.ja ? `<span class="s-ja" lang="ja">${q.answer.ja}</span>` : ''}
        <span class="s-zh">${q.answer.zh}</span>
      </span>`,
    detailHTML: (q) => `
      <div class="s-detail">
        ${
          q.they
            ? `<div class="s-detail-row">
                <p class="s-romaji">對方：${q.they.romaji}（${q.they.zh}）</p>
                ${speakBtn(q, 'they', '播放對方說的話')}
              </div>`
            : ''
        }
        ${
          q.answer.ja
            ? `<div class="s-detail-row">
                <p class="s-romaji">${q.answer.romaji}</p>
                ${speakBtn(q, 'answer', '播放這句話')}
              </div>`
            : ''
        }
        <p class="sc-note">${q.note}</p>
      </div>`,
    speakText: (q) => q.answer.ja || q.they?.ja || '',
    exText: (q, which) => (which === 'they' ? q.they?.ja : q.answer.ja) || '',
    empty: {
      none: '這個情境還沒有題目。',
      weak: '沒有常答錯的題目，很棒！',
      learning: '沒有正在練習的題目。',
      new: '這個情境的題目都練過了！',
    },
    barHTML: (counts, total) => `
      <p class="start-sum">${
        counts.weak ? `<b>${counts.weak} 題常答錯</b>練習時會先出現` : `<b>${total} 題</b>${scene.name}的情境題`
      }</p>
      <a class="btn primary" href="#scenes/${id}/quiz">練習這個情境 ${icons.arrow}</a>`,
  });
}
