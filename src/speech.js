// 用瀏覽器內建的語音合成念日文，不需要網路或 API key。

import { getPref } from './store.js';
import { toast } from './ui.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let jaVoice = null;
let loaded = false;
let warned = false;

export function initSpeech() {
  if (!synth) return;
  const pick = () => {
    const voices = synth.getVoices();
    if (!voices.length) return;
    loaded = true;
    jaVoice = voices.find((v) => /^ja([-_]|$)/i.test(v.lang)) || null;
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
