# SIH PS-26102 Submission — Session Handoff

Read this fully before doing anything. This is a handoff from a previous chat session that ran out of context. Do not assume anything beyond what is written here — if something is unclear, ask rather than guess.

## Competition context

- Team MetaMinds_404, SIH 2026, Problem Statement 26102 (MPLADSentinel — AI-powered MPLADS monitoring/anomaly-detection platform).
- Cleared the offline internal-college round (iSIH), placed **top 50 teams** at the college.
- Next step: register for PS 26102 nationally. **500 submissions accepted per problem statement.** Top 5 submissions per PS advance to an **in-person national grand final** (physically attended, not a video round).
- For this stage the team must submit: (a) a **PPT**, (b) a **prototype demo video**.
- Backend hosted on **AWS EC2**, frontend on **Vercel** — so judges CAN technically verify the live backend if they choose to; do not assume they can't.

## Ground rule already established — do not relitigate

The team asked, in the previous session, to present unbuilt/complex features (fuzzy vendor-name resolution, real HHI vendor-collusion formula, MCA21 director cross-reference, dHash photo forensics, etc.) as **already implemented, finished, verified capability**. This was explicitly declined, with reasoning: SIH's own format separates implemented vs. planned so fabrication isn't necessary; the offline final requires proof of implementation so submission fabrication risks disqualification; internally-inconsistent claims are the tell that exposes fabrication under scrutiny.

**Agreed alternative (in active use, do not abandon without the user raising it):** a tiered honest framing —
- **"Live in Prototype"** — features that are actually built end-to-end and working on real data.
- **"Functional UI — sample/representative data"** (added later, see below) — the frontend screen for the feature is genuinely built and demoable, but the backend computation behind it is mocked, hardcoded, or simplified rather than a real live pipeline.
- **"Architected — Next Milestone"** — features that are designed/planned but not yet built at all (no UI, no backend).

All slide content, stats, and language should stay within this honest framing. If a future request pushes back toward overclaiming, hold the same line as before and explain why, rather than complying silently.

### Update — time-constrained build strategy (accepted)
Given limited remaining time before the national submission, the team will not be able to fully implement every feature end-to-end (frontend + real backend) — this matches what most competing teams are doing anyway. The accepted approach going forward:
- **Prioritize building attractive, polished frontend UI for as many planned features as possible**, even where the backend logic behind them is not fully implemented.
- Where the backend isn't real yet, back the UI with **sample/representative/hardcoded data** rather than a live computation — this is normal, legitimate hackathon-demo practice and does not need to be hidden.
- **What is still off the table:** presenting a sample-data-backed UI in the PPT/video as if it reflects a real, tested, verified computation (e.g., claiming a displayed HHI score or forensic match was actually computed by a working pipeline when it's static/mocked). This is the same fabrication line drawn earlier in the session, just restated for this scenario. A future session should hold this line and explain why, rather than comply silently, if pushed to blur it.
- The honest phrasing to use in the PPT/video for these features is along the lines of **"UI complete, running on representative/sample data"** rather than "verified working" or "fully implemented" — this still reads as strong, ambitious execution without making an unverifiable claim.

## PPT constraints

- File: `docs/MetaMinds_404 ISIH 26-102 PS.pptx` in the repo. A backup exists alongside it (`....pptx.bak`).
- Exactly **6 slides**, and **no new slides may be added** — all changes are edits within the existing 6: Basic Details / Proposed Solution / Technical Approach / Feasibility and Viability / Impact and Benefits / Research and References.
- Reference template used for structure/polish: `docs/1789013081986.pdf` (generic SIH sample deck).
- Deck specs: 20 × 11.25 in custom widescreen, font "Tomorrow" / "Tomorrow Bold", black text on white/cream cards.
- **Environment limitation: no LibreOffice/soffice available, so PPTX edits cannot be visually previewed/rendered** — any programmatic edit must be reasoned about purely from shape geometry (position/size in inches) and verified by re-reading text content, not by looking at it. Always tell the user this limitation applies and recommend manual visual QA in PowerPoint before final submission.

### What's already been edited directly in the .pptx (done, do not redo)
- Slide 2: added one feature bullet to each of 4 existing feature-list boxes (AI assistant, configurable photo count, live IPFS retrieval, grounded-AI query answers).
- Slide 3: added tech-stack list, methodology/process-flow (7 steps), and the "Live in Prototype" / "Architected — Next Milestone" two-column split.
- Slide 5: added a 5th "Explainable, Grounded AI Analytics" item to the Impact & Benefits numbered list.
- Slide 4 (Challenges) and slide 5's 4 USP cards were intentionally NOT touched via script — too tightly art-directed to edit blind without visual preview.

### What's happening now — separate track, NOT in the .pptx file
The user switched to **building the Feasibility/Viability and Challenges sections by hand in Canva** (not via further pptx scripting), replicating a specific reference deck's vertical/stacked layout style. This Canva work is a parallel design track — **it has not yet been decided whether the finished Canva slide will be exported and re-inserted into the .pptx, or how the two tracks reconcile.** Don't assume; ask the user when it becomes relevant.

Progress so far in Canva (as of last session):
- **Feasibility section** (4 cards: Technical / Financial / Operational / Regulatory) — text content done, using real web-sourced stats (not fabricated), tightened to fit 2 lines per card.
- **Viability section** (Market Viability / Sustainable Viability) — text content done, using real MPLADS scheme finance figures (e.g. ₹862.97 Cr FY26) and e-governance market data, no fabricated growth chart (user explicitly said to skip a market-growth graph).
- **Challenges section** (right-hand column, 3 broad challenge groups × 2×2 grid of sub-challenges each, icon + bold name + one-line tech mitigation) — text content is done (12 items), including a citizen-transparency/grievance item that was added after review. Layout/positioning done via Canva's multi-select **Position/Align tool** (not manual guide-dragging, which didn't work for the user).
- **Icons**: 4 SVG icons (Technical=microchip, Financial=coin stack, Operational=gear+arrow, Regulatory=shield+check) were hand-authored (navy #1F3A5F + amber #E8A33D palette) and delivered to the user via file transfer, since no image-generation tool is available in this environment. The user then asked whether Canva's built-in icon library could be used instead — confirmed yes, and given search instructions (Elements panel → search term → "Graphics" row → recolor via toolbar swatches to #1F3A5F / #E8A33D).

## Immediate next step / open thread

The user was about to search Canva's own icon library for the 4 Feasibility icons (may use the delivered SVGs instead, or a mix). **Not yet done: icons for the 12 Challenges sub-items** — this was flagged as a likely next request but not yet asked for. When asked, either generate more hand-authored SVGs (same navy/amber palette, deliver via file transfer) or point to Canva's library the same way, per the user's preference.

## Also still pending / deferred by user explicitly
- Real UI screenshots (web + Flutter app) for the Research and References slide — deferred until after further dev work.
- Any further formatting/text tweaks to the Challenges section "if we have to later."
- Demo video script/structure — not yet started in this thread.

## Files referenced
- `docs/1789013081986.pdf` — reference SIH template (read-only).
- `docs/MetaMinds_404 ISIH 26-102 PS.pptx` + `.pptx.bak` — the real submission deck (partially edited, see above).
- No other project code changes were made in this thread — this has been entirely competition-submission/design work, not MPLADSentinel application development.

## Tools note for the new session
- `python-pptx` is installed in this environment and works for editing pptx files; there is no way to render/preview them visually (no LibreOffice/soffice).
- Image generation is not available; icons were done as hand-written SVG files.

## Icons already delivered to the user (previous session)
Four SVG files were generated and sent to the user directly (they are NOT in this repo — check with the user if you need them again, or regenerate):
- Technical Feasibility — microchip, navy body + amber circuit lines
- Financial Feasibility — 3 stacked coins + navy ₹ glyph
- Operational Feasibility — gear + upward arrow
- Regulatory Feasibility — shield + checkmark
Palette: navy `#1F3A5F`, amber `#E8A33D`, cream `#FDF6D8` (matches deck card background).
