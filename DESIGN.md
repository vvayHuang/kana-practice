---
name: かな練習帳
description: A kana practice sheet, ink on white paper under an ink header band, with vermilion kept for correction.
colors:
  band: "#15171c"
  band-raised: "#2e313a"
  on-band: "#fbfaf6"
  on-band-muted: "#adb1bc"
  paper: "#fbfaf6"
  paper-pressed: "#efeee8"
  ink: "#15171c"
  ink-secondary: "#3f4450"
  ink-tertiary: "#5d6370"
  rule: "#c9cace"
  guide: "#dddcd6"
  vermilion: "#c2301a"
  vermilion-soft: "#fbe8e3"
typography:
  kana-display:
    fontFamily: "'Klee One', 'LXGW WenKai TC', 'Hiragino Mincho ProN', 'Yu Mincho', serif"
    fontSize: "calc(var(--box) * 0.72)"
    fontWeight: 600
    lineHeight: 1
  headline:
    fontFamily: "'LXGW WenKai TC', 'Klee One', 'BiauKai', 'DFKai-SB', 'Kaiti TC', serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "'LXGW WenKai TC', 'Klee One', 'BiauKai', 'DFKai-SB', 'Kaiti TC', serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "'LXGW WenKai TC', 'Klee One', 'BiauKai', 'DFKai-SB', 'Kaiti TC', serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.3
  label:
    fontFamily: "system-ui, -apple-system, 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  sheet: "2px"
spacing:
  hairline: "1px"
  tight: "8px"
  gutter: "12px"
  sheet: "16px"
  section: "28px"
components:
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "18px 4px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.sheet}"
    padding: "0 20px"
    height: "48px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.sheet}"
    padding: "0 20px"
    height: "48px"
  button-outline-hover:
    backgroundColor: "{colors.paper-pressed}"
  segment-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    height: "44px"
  segment:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    height: "44px"
  tab-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "44px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.on-band}"
    height: "44px"
  option:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    height: "76px"
  option-wrong:
    backgroundColor: "{colors.vermilion-soft}"
    textColor: "{colors.vermilion}"
---

# Design System: かな練習帳

## Overview

**Creative North Star: "The Practice Sheet"**

The whole page is one sheet of white practice paper. Everything the learner reads is written in ink, and the only other colour is the teacher's vermilion pen, which appears where an answer was wrong and nowhere else. A single ink band across the top carries the two tabs and the sound button; there is no logo or product name in it.

The kana is the subject. It sits in a ruled practice cell with dashed centre guides, the same cell whether it is one of 46 in the chart, a missed kana in the results, or the single large character of a quiz question. Controls stay plain: a selected thing is filled with ink, an unselected thing is an outline.

Two earlier looks were rejected by the owner and are not to be reintroduced: rounded shadowed cards on a cream ground with a terracotta accent, and white sheets on a navy felt ground.

**Key Characteristics:**
- White paper page, ink marks, vermilion corrections, one ink band at the top
- Square corners (2px) and ruled tables instead of cards and shadows
- Kana always in a guided cell
- Selection shown by ink fill, never by colour
- One-thumb reach: the primary action sits at the bottom of the screen

## Colors

Paper and ink carry the whole interface, with a single vermilion for correction.

### Primary
- **Sumi Ink** (#15171c): all text, primary buttons, selected segments and rows, table frames, and the header band.

### Secondary
- **Teacher's Vermilion** (#c2301a): the cross on a wrong option, the wrong-answer message, the often-missed mark on a kana, and the note that says how many selected kana are often missed.
- **Vermilion Wash** (#fbe8e3): fill of the option the learner got wrong.

### Neutral
- **Paper** (#fbfaf6): the page and every cell.
- **Paper Pressed** (#efeee8): hover on paper, the active script in the kana detail slip.
- **Ink Secondary** (#3f4450) and **Ink Tertiary** (#5d6370): supporting text, both above 4.5:1 on paper.
- **Band Raised** (#2e313a): hover on the inactive tab and the buttons in the band. **On Band** (#fbfaf6) and **On Band Muted** (#adb1bc): text, icons and outlines in the band.
- **Rule** (#c9cace): hairlines between cells. **Guide** (#dddcd6): dashed centre guides inside cells.

At night the page becomes a dark desk (#0f131d) with slightly lighter sheets (#232836) lying on it, ink turns light (#eef0f4) and vermilion becomes #ff8f76. Only at night do sheets differ from the ground.

### Named Rules
**The Red Pen Rule.** Vermilion means "this was wrong". It is never used for brand, emphasis, links, primary buttons or selection.

**The Ink Fill Rule.** Selected, current and primary are shown by filling with ink and reversing the text to paper. Colour does not carry selection.

## Typography

**Display Font:** Klee One (with LXGW WenKai TC, Hiragino Mincho ProN)
**Body Font:** system sans (PingFang TC, Noto Sans TC, Microsoft JhengHei)
**Lettering Font:** LXGW WenKai TC (with Klee One, BiauKai)

**Character:** Klee One is a textbook hand, so each kana shows the stroke shapes a learner should copy. LXGW WenKai TC is drawn from the same model, which lets Chinese headings and buttons sit beside the kana as one hand. Small captions use the system sans for legibility.

### Hierarchy
- **Kana display** (600, 72% of its cell, line-height 1): the question character and chart cells.
- **Headline** (WenKai 700, 20px, 1.3): section titles.
- **Title** (WenKai 700, 17px): buttons, feedback line, result sub-headings.
- **Body** (system 400, 16px, 1.5): dictionary notes, capped at 34em.
- **Control** (WenKai 700, 15px): segments. **Label** (system 600, 14px): hints, counts. Nothing smaller than 12px, and 12px only for romaji inside chart cells and column heads.

### Named Rules
**The Model Hand Rule.** Kana is always set in Klee One at weight 600. Never substitute a Mincho or Gothic face for kana a learner is meant to copy.

## Layout

Below 1000px: one column, at most 640px wide, with 16px side margins. Sections follow each other down the page, separated by space and by the ink frames of their tables, not by boxes. From 1000px the page is 1064px wide with two columns 40px apart: on the chart 清音 is on the left with 濁音 and 拗音 on the right; on the quiz setup the range picker is on the left with the other settings and the start bar on the right. Play and result stay a single 640px column in the middle.

Tables are CSS grids with a 1px gap over the rule colour, so the lines are the gaps, inside a 1.5px ink frame. The kana chart has a 28px first column holding the row name written vertically.

The header is one 60px ink band at every width holding the two tabs and the action buttons. The product name is present only as a visually hidden heading.

On the play screen the question takes the remaining height so the four options and the next button sit at the bottom of the viewport. Below 1000px the quiz setup keeps its start bar stuck to the bottom of the viewport.

Touch targets are at least 44px.

## Elevation & Depth

Flat. In the light theme a section is the same colour as the page.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 8px 24px rgb(21 23 28 / 0.22)`): only for things that float over other content: the kana detail slip, the sticky start bar, the sticky feedback bar, the toast. Each of these also takes a 1.5px ink border.

### Named Rules
**The Lying Flat Rule.** If it scrolls with the page it has no shadow.

## Shapes

Corners are 2px everywhere. The only round shapes are the two mastery marks (a solid ink dot and an ink ring) and the ring drawn on a correct answer. Frames are 1.5px ink; internal lines are 1px rule; guides are dashed.

## Components

### Buttons
- **Shape:** 2px corners, 48px tall.
- **Primary:** ink fill, paper text, WenKai 700 at 17px.
- **Outline:** 1px ink border on paper; hover fills with Paper Pressed.
- **Ghost:** no border, Ink Secondary text.
- **Disabled:** dashed Ink Tertiary border, no fill.

### Segments
- A row of equal cells inside a 1px ink frame, 44px tall, lettered in WenKai 700 at 15px. The selected cell is ink-filled.

### Row picker
- Quiz range. A two-column ruled table of toggles; each shows the kana in the row with their romaji underneath. Selected rows are ink-filled.

### Slips
- Things that sit on the page as a separate piece of paper (the first-visit note, the feedback line, the floating bars) take a 1.5px ink border in the light theme, since paper on paper would otherwise vanish.

### Navigation
- Two tabs in a 1px On Band Muted frame in the ink band. The current tab is a paper block with ink text; the other is On Band text and takes Band Raised on hover.

### Practice cell
- A square with dashed horizontal and vertical centre guides. In the chart it holds a kana, its romaji at the bottom edge, and a mastery mark in the bottom left corner, never the top right where ゛ and ゜ are written: solid dot for mastered, ring for practising, vermilion cross for often missed.

### Answer option
- Paper tile with a 1.5px ink border, 76px tall. After answering: the right option stays paper, its frame thickens to 4px of ink and an ink ring is drawn at its right edge; a wrong pick turns Vermilion Wash with a vermilion cross drawn in two strokes; the rest drop to dashed Ink Tertiary outlines.

## Do's and Don'ts

### Do:
- **Do** keep the page white paper and let ruled tables and space separate sections.
- **Do** show kana in a guided practice cell.
- **Do** show selection with ink fill.
- **Do** keep the main action within thumb reach at the bottom of the screen.
- **Do** keep text on paper at Ink Tertiary (#5d6370) or darker.

### Don't:
- **Don't** use vermilion for anything except marking something wrong.
- **Don't** add rounded cards, soft shadows on resting surfaces, a cream ground, or a coloured ground behind the paper in the light theme.
- **Don't** put a logo or the product name back in the header band.
- **Don't** add green for success; a right answer is marked in ink.
- **Don't** set kana in any face other than Klee One.
