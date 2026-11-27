# Product

<!-- impeccable:product-schema 1 -->

> Facts marked (inferred) were taken from the repository and the owner's requests, not from an interview. The owner asked to skip the interview and start the redesign directly.

## Platform

web

## Users

Traditional Chinese speakers who are starting Japanese and cannot yet read kana, plus learners who know hiragana but are weak at katakana (inferred). They practise in short sessions, mostly on a phone held in one hand, sometimes on a computer (inferred). All interface copy is in Traditional Chinese.

## Product Purpose

かな練習帳 teaches the kana syllabary: a reference chart with pronunciation, and quizzes on kana and on simple words. Success is a learner recognising kana quickly and accurately, and coming back for another short session.

## Positioning

Practice adapts to the learner. The quiz records right answers, wrong answers and answer time per kana, brings back the ones the learner keeps missing, and offers look-alike kana as wrong options. Word practice only uses words spelled with the kana the learner has selected.

## Operating Context

- Three tabs ordered as learning steps: 假名, 單字, 句子. Each tab first shows familiarity (the kana chart, the word book, or the list of example sentences, all with mastery marks) and keeps a practice bar at the bottom that leads to that tab's quiz: setup, play, result.
- The range of kana rows to practise is shared by all tabs; the word book and word quiz only use words spelled with those kana, and the sentence tab only uses those words' example sentences.
- Sentence questions come in three kinds: put the shuffled chunks in order (two extra chunks mixed in), read a sentence and pick its meaning, or hear it and pick its meaning. Situational questions (ordering in a restaurant, a convenience store, asking the way) are planned next.
- Tapping a kana plays its sound through the browser's Japanese voice.
- After a word answer, a dictionary-style entry explains the word with an example sentence.
- Published two ways: GitHub Pages, and a single-file page on claude.ai where practice records sync to the viewer's account.

## Capabilities and Constraints

- Vanilla JavaScript with Vite; no framework. The claude.ai build inlines all CSS and JS into one HTML file.
- External resources are limited to Google Fonts stylesheets; everything else must be inline.
- Mastery levels: 已熟練, 練習中, 常答錯 (two or more misses), and not yet practised.
- Light and dark themes follow the system setting.

## Brand Commitments

- Name: かな練習帳 (a practice notebook).
- The owner asked for a 習字帖 (calligraphy practice book) look: ink as the main colour, red reserved for correction marks (wrong answers, often-missed kana).
- The owner chose a white paper page with an ink header band, and asked for the logo and product name to be removed from the header.
- The owner finds the previous look generic and does not want it kept.

## Evidence on Hand

- 104 kana with romaji in `src/kana.js`; about 300 words with meanings, notes and example sentences in `src/words.js` and `src/dict.js`. The 293 example sentences are written in kana with a space between chunks, which the sentence quiz relies on.
- No user research with real learners yet. A usability test outline exists but has not been run.

## Product Principles

1. The kana is the subject; the interface stays out of its way.
2. A beginner who cannot read kana must still be able to operate every control.
3. Marks on the page mean something: red is the teacher's pen, never decoration.
4. One hand, one thumb, short sessions.

## Accessibility & Inclusion

Text contrast of at least 4.5:1, touch targets of at least 44px on touch devices, mastery shown by shape as well as colour, and reduced-motion respected.
