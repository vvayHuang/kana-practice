---
version: 1
slug: "src-main-js"
primary_target: "src/main.js"
related_targets: ["src/chart.js","src/quiz.js","src/style.css"]
---

# Surface brief: the whole app (chart, quiz setup, play, result)

Scope: every screen rendered from `src/main.js`. Visitor mode: Operate.

Audience and job: a beginner who cannot read kana yet, practising in short one-handed sessions on a phone. Tasks: look up a kana and hear it; choose which rows to practise; answer four-choice questions; see which kana were missed.

Constraints: the owner pinned a 習字帖 look, ink as the main colour, red only for correction (wrong answers, often-missed kana). No image generation is available, so the build is code-led. Stylesheets may only come from Google Fonts; everything else is inline.

Unresolved: whether the owner prefers a white-paper ground over the felt ground (the tokens make that a one-line swap).

## Direction contract

THESIS: The screen is a calligraphy desk: sheets of white hanshi lying on a navy felt mat, written in ink and corrected in vermilion. It refuses the stack of rounded, shadowed cards on a cream ground.

OWN-WORLD: Navy felt ground; square-cornered white paper sheets with no shadow; hairline ruled grids with dashed centre guides in every practice cell; ink-filled blocks for selected and primary; vermilion appears only as a correction mark. Kana in Klee One, interface lettering in LXGW WenKai TC, captions in the system sans.

STORY: The learner sees the syllabary as one ruled table with row and column names, picks rows by seeing the kana they contain, answers with the thumb, and reads the teacher's red pen where they went wrong.

FIRST VIEWPORT: Felt strip with a paper name tag, two index tabs and the sound button. Below it one paper sheet: script switch and legend, then the 清音 table, five columns under a i u e o with a row-name column at the left, each kana in a guided cell at about 30px.

SIGNATURE: A wrong answer is struck with a vermilion cross drawn stroke by stroke; the right answer fills with ink.

FORM: 書道 model sheet on a felt underlay, candidate 7 of 7 on the grounded list. Seed key a6556322 (roll ran degraded: no challengers).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
