// 用瀏覽器內建的語音合成念日文，不需要網路或 API key。

import { getPref } from './store.js';
import { toast } from './ui.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let jaVoice = null;
let loaded = false;
let warned = false;

// 同一台裝置常常有好幾個日文語音，品質差很多。瀏覽器排第一個的不一定好聽
// （例如 macOS 的 Eddy、Windows 的 Ichiro 聽起來很像機器人），所以自己挑。
const GOOD = /natural|neural|premium|enhanced|siri/i; // 新一代、比較自然的語音
const NAMED = /google|nanami|kyoko|o-?ren|haruka|sayaka|ayumi|mizuki/i; // 已知清楚好聽的
const FLAT = /ichiro|otoya|hattori|keita/i; // 比較生硬的舊語音
const NOVELTY = /eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|espeak|compact/i; // 特效或合成感很重的

const score = (v) =>
  (GOOD.test(v.name) ? 100 : 0) + (NAMED.test(v.name) ? 50 : 0) - (FLAT.test(v.name) ? 40 : 0) - (NOVELTY.test(v.name) ? 80 : 0);

// 從裝置上的日文語音裡挑最自然的一個；分數一樣就照瀏覽器原本的順序
export function pickVoice(voices) {
  const ja = voices.filter((v) => /^ja([-_]|$)/i.test(v.lang));
  return ja.reduce((best, v) => (!best || score(v) > score(best) ? v : best), null);
}

export function initSpeech() {
  if (!synth) return;
  const pick = () => {
    const voices = synth.getVoices();
    if (!voices.length) return;
    loaded = true;
    jaVoice = pickVoice(voices);
  };
  pick();
  if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pick);
  else synth.onvoiceschanged = pick;
}

function warnOnce(msg) {
  if (warned) return;
  warned = true;
  toast(msg);
}

// force：使用者按了喇叭按鈕，就算關掉自動發音也要念
export function say(text, { force = false } = {}) {
  if (!force && !getPref('sound', true)) return;
  if (!synth) {
    warnOnce('這個瀏覽器不支援語音播放');
    return;
  }
  if (loaded && !jaVoice) {
    warnOnce('這台裝置沒有日文語音，可以到系統設定加裝「日文」語音');
    return;
  }
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.85;
    synth.speak(u);
  } catch {
    /* 有些瀏覽器會擋，忽略 */
  }
}
