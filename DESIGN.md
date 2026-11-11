---
name: かな練習帳
description: A kana practice notebook laid out as a calligraphy desk, ink on white paper over a navy felt mat.
colors:
  felt: "#1b2338"
  felt-raised: "#28324d"
  on-felt: "#f3f1ea"
  on-felt-muted: "#b9c0d4"
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
    padding: "18px 16px"
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
    textColor: "{colors.on-felt}"
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

**Creative North Star: "The Calligraphy Desk"**

The screen is a desk set for writing practice. A navy felt mat is the ground. White sheets of paper lie on it with square corners and no shadow. Everything the learner reads is written in ink, and the only other colour is the teacher's vermilion pen, which appears where an answer was wrong and nowhere else.

The kana is the subject. It sits in a ruled practice cell with dashed centre guides, the same cell whether it is one of 46 in the chart, a missed kana in the results, or the single large character of a quiz question. Controls stay plain: a selected thing is filled with ink, an unselected thing is an outline.

The previous look, rounded shadowed cards on a cream ground with a terracotta accent, was rejected by the owner as generic and is not to be reintroduced.

**Key Characteristics:**
- Felt ground, paper sheets, ink marks, vermilion corrections
- Square corners (2px) and hairline rules instead of cards and shadows
- Kana always in a guided cell
- Selection shown by ink fill, never by colour
- One-thumb reach: the primary action sits at the bottom of the screen

## Colors

Two neutrals carry the whole interface, navy felt and warm-white paper, with ink for marks and a single vermilion for correction.

### Primary
- **Sumi Ink** (#15171c): all text on paper, primary buttons, selected segments and rows, table frames.

### Secondary
- **Teacher's Vermilion** (#c2301a): the cross on a wrong option, the wrong-answer message, the often-missed mark on a kana, and the note that says how many selected kana are often missed.
- **Vermilion Wash** (#fbe8e3): fill of the option the learner got wrong.

### Neutral
- **Navy Felt** (#1b2338): page ground and header.
- **Felt Raised** (#28324d): hover on controls that sit on felt.
- **Paper** (#fbfaf6): every sheet, every cell.
- **Paper Pressed** (#efeee8): hover on paper, the active script in the kana detail slip.
- **Ink Secondary** (#3f4450) and **Ink Tertiary** (#5d6370): supporting text on paper, both above 4.5:1.
- **On Felt** (#f3f1ea) and **On Felt Muted** (#b9c0d4): text, icons and outlines on felt.
- **Rule** (#c9cace): hairlines between cells. **Guide** (#dddcd6): dashed centre guides inside cells.

At night the same roles hold with felt #0f131d, paper #232836, ink #eef0f4 and vermilion #ff8f76.

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
- **Headline** (WenKai 700, 20px, 1.3): sheet titles.
- **Title** (WenKai 700, 17px): buttons, feedback line, result sub-headings.
- **Body** (system 400, 16px, 1.5): dictionary notes, capped at 34em.
- **Control** (WenKai 700, 15px): segments. **Label** (system 600, 14px): hints, counts. Nothing smaller than 12px, and 12px only for romaji inside chart cells and column heads.

### Named Rules
**The Model Hand Rule.** Kana is always set in Klee One at weight 600. Never substitute a Mincho or Gothic face for kana a learner is meant to copy.

## Layout

Below 1000px: one column, at most 640px wide, centred on the felt with 12px of felt showing at each side; sheets stack with a 12px gap. From 1000px the desk is 1064px wide and sheets lie side by side: on the chart 清音 is on the left with 濁音 and 拗音 on the right; on the quiz setup the range picker is on the left with the other settings and the start bar on the right. Play and result stay a single 640px sheet in the middle. Inside a sheet the padding is 18px by 16px and sections are separated by 28px.

Tables are CSS grids with a 1px gap over the rule colour, so the lines are the gaps, inside a 1.5px ink frame. The kana chart has a 28px first column holding the row name written vertically.

The header is one 60px row at every width: paper name tag, two tabs, action buttons. Below 560px the title text is hidden visually and kept for screen readers.

On the play screen the question sheet takes the remaining height so the four options and the next button sit at the bottom of the viewport. The quiz setup keeps its start bar stuck to the bottom of the viewport.

Touch targets are at least 44px.

## Elevation & Depth

Flat. Sheets do not cast shadows; they are separated from the felt by colour alone.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 8px 24px rgb(6 10 22 / 0.38)`): only for things that float over other content: the kana detail slip, the sticky start bar, the sticky feedback bar, the toast. Each of these also takes a 1.5px ink border.

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
- Quiz range. A two-column ruled table of toggles; each shows the kana in the row at 22px with their romaji underneath. Selected rows are ink-filled.

### Sheets
- **Corner Style:** 2px
- **Background:** Paper
- **Shadow Strategy:** none (see Elevation)
- **Internal Padding:** 18px 16px

### Navigation
- Two tabs in a 1px On Felt Muted frame on the felt. The current tab is a paper block with ink text; the other is On Felt text and takes Felt Raised on hover.

### Practice cell
- A square with dashed horizontal and vertical centre guides. In the chart it holds a kana, its romaji at the bottom edge, and a mastery mark in the bottom left corner, never the top right where ゛ and ゜ are written: solid dot for mastered, ring for practising, vermilion cross for often missed.

### Answer option
- Paper tile with a 1.5px ink border, 76px tall. After answering: the right option stays paper and an ink ring is drawn at its right edge; a wrong pick turns Vermilion Wash with a vermilion cross drawn in two strokes; the rest drop to dashed outlines on the felt.

## Do's and Don'ts

### Do:
- **Do** put content on a paper sheet and controls that belong to the whole screen on the felt.
- **Do** show kana in a guided practice cell.
- **Do** show selection with ink fill.
- **Do** keep the main action within thumb reach at the bottom of the screen.
- **Do** keep text on paper at Ink Tertiary (#5d6370) or darker.

### Don't:
- **Don't** use vermilion for anything except marking something wrong.
- **Don't** add rounded cards, soft shadows on resting surfaces, or a cream ground.
- **Don't** add green for success; a right answer is marked in ink.
- **Don't** set kana in any face other than Klee One.
