# SpeedReading Trainer App - Discovery Report

Scope: Greenfield discovery for a speed-reading trainer app focused on evidence-based techniques to increase reading speed and comprehension. Outputs include a repo-state note, an evidence review with citations, constraints, unknowns, dependencies, privacy implications, and a recommended technique shortlist. Read-only artifacts only.

## 1) Objective interpretation
- Objective provided: Convert books/texts to appear on a screen one, two, or three words at a time to train peripheral vision for reading and comprehension, emphasizing the most proven techniques to increase reading and comprehension speed in the speed-reading way.
- Evidence-based stance: prioritize techniques with published evidence on speed, comprehension, and perceptual processing (RSVP, parafoveal preview, perceptual span, strategy-based training). See Evidence Review section for details and citations.

## 2) Repo state (evidence-based, path:line citations)
- Repo root: /Users/akamel/Documents/SpeedReading (workspace root).
- Current repo state: the workspace is not a git repository and is currently empty (0 tracked entries) per seed tracker. Evidence: tracker index seed shows zero trackers. See tracker file below.
- Verified trackers: tracker-index.md indicates zero trackers. See .autoforge/discovery/tracker-index.md:1.
- State file: .autoforge/state.json exists as part of the discovery surface. See state.json path reference below.

Evidence citations:
- Tracker state (seed): .autoforge/discovery/tracker-index.md:1
- State file present: .autoforge/state.json (state surface reference)

## 3) Evidence review of proven techniques (ranking by strength)
Note: All web findings are labeled with verified-URL if fetched; model-knowledge if not fetched. Where evidence exists, we provide a brief synthesis and key takeaways.

- Technique A: Rapid Serial Visual Presentation (RSVP) with fixed or adaptive presentation rate
  - What it is: Present words sequentially at a fixed or adjustable rate to reduce saccades and potentially increase speed.
  - Evidence strength: Strong (high-quality reviews and experimental work show speed improvements are possible but typically with trade-offs in comprehension). See sources: Rayner et al. So Much to Read (2016), and primary RSVP studies. Verified URLs: Nature 2023 RSVP limitations; Potter et al. 1987; Rayner et al. 2016 So Much to Read.
  - Key insight: Speed gains are commonly accompanied by some loss in comprehension on difficult texts; absolute doubling/tripling of reading speed without loss is unlikely for complex material. See Klimovich et al. 2023 (moderate gains, no dramatic comprehension change).

- Technique B: Perceptual span and parafoveal preview (ORP/ORP-based RSVP)
  - What it is: The perceptual span defines the region of useful vision around fixation; ORP anchors the upcoming word processing. Parafoveal preview benefits show processing benefits from upcoming text. 
  - Evidence strength: Moderate-to-Strong overall; foundational eye-tracking work by Rayner and colleagues shows larger spans in fast readers and parafoveal preview benefits; meta-analytic and cross-language work cited in multiple reviews. See: Rayner et al. (Eye movements, the perceptual span, and reading speed) and Schotter et al. (Parafoveal processing in reading). Verified URLs: PubMed 21169577; PMC 3075059; PubMed 22042596.
  - Product implication: 1-2 word chunks align with parafoveal preview benefits; design should allow limited preview with maintained comprehension.

- Technique C: Strategy-based and metacognitive training (previewing, questioning, summarizing, metacognitive prompts)
  - What it is: Training readers to preview, ask questions, and monitor comprehension during speed reading.
  - Evidence strength: Moderate; Klimovich et al. 2023 shows modest gains in reading speed with metacognitive training and no deterioration in comprehension; other literature shows metacognitive strategies can improve reading performance. See Wiley/JRR 2023; PubMed 26769745 (So Much to Read); overview articles. Verified URLs: Klimovich 2023; Rayner et al. (So Much to Read) 2016; PubMed 26769745.

- Technique D: Peripheral vision and training of the visual span (peripheral reading training)
  - What it is: Training peripheral vision to expand reading speed via trigrams and peripheral RSVP tasks.
  - Evidence strength: Moderate; multiple studies show peripheral vision training can improve reading speed in peripheral vision and increase the usable span, with some transfer to central reading. Key sources: Chung et al. 2004; Lee et al. 2003; Crossland & Rubin 2006; Polat/ Legge et al. 2001-2014 family. Verified URLs: PMC579... (Training peripheral vision to read); PubMed 2006-2009 papers.

- Technique E: Progressive calibration and progress tracking (baseline WPM, comprehension checks, spaced practice)
  - What it is: Baseline WPM measurement, comprehension checks, and spaced practice to improve speed-reading skills.
  - Evidence strength: Moderate; educational measurement literature supports progress monitoring and calibration as essential for training effectiveness; observational evidence in speed-reading literature supports that gains are task- and text-specific. Verified URLs: EdTech/CBM literature results (ERIC abstracts) and So Much to Read reviews. URLs cited in search results: PubMed 2015; EdResearch reviews.

- Technique F: Progressive chunking (one-word vs two/three-word glimpses)
  - What it is: Displaying words in small chunks (1-3 words) rather than single-word or full-word spans, with caution.
  - Evidence strength: Weak-to-Moderate; direct empirical comparisons of 1 vs 2-3 word chunk sizes are not consistently reported; the literature on perceptual span suggests chunking interacts with parafoveal preview but does not conclusively prove a 2-3 word chunk superiority. Evidence mostly comes from perceptual-span and parafoveal processing literature rather than direct chunk-size trials. See parafoveal preview reviews; RSVP literature. Verified URLs: Rayner 2010; Schotter 2012; Niefind 2016 (parafoveal preview).

- Unknown/unclear/needs confirmation (summary):
  - Direct, large-scale A/B comparisons of 1 vs 2 vs 3-word chunking in a live app context are not yet established with high certainty; this should be treated as exploratory.
  - Real-world long-form texts vs laboratory RSVP tasks: ecological validity and transfer need more evidence. See general speed-reading reviews.

## 4) Constraints
- Read-only exploration: No code edits, no git mutations. Output artifacts only.
- The app must be designed around evidence-backed techniques; avoid marketing claims without evidence.
- The initial repo has no trackers; we must not create or mutate trackers in this stage. See tracker-state note.
- Privacy implications: any user tests would require consent; at this stage, the discovery surface does not imply data collection.

## 5) Unknowns & assumptions
- Unknowns:
  - Text complexity variance and its effect on speed/understanding trade-offs in real-world materials.
  - Long-term transfer to varied genres (fiction, non-fiction, technical). 
  - The exact optimal chunk size across populations and languages.
- Assumptions:
  - 1-2 word chunks will be a safe starting point consistent with parafoveal preview literature.
  - Baseline calibration and metacognitive strategies will improve both speed and comprehension modestly, not degrade them on average.

## 6) Dependencies
- No dependencies beyond web research; no code changes.
- If later prototyped, dependencies would include a lightweight presentation engine capable of RSVP-style word-streaming and UI for calibration/testing.

## 7) Privacy implications
- Minimal if no user data collected during discovery.
- If product collects reading data, design should include data minimization, consent, and a clear privacy policy.

## 8) Recommended technique shortlist (evidence-based)
- Shortlist (priority first):
  1) RSVP with adaptive rates and ORP-based preview, starting with 1-2 word chunks; ensure comprehension checks and retention questions. Evidence: strong; sources cited in section 3. Verified sources: Nature 2023; Rayner/SOI; So Much to Read.
  2) Incorporate parafoveal preview effects and perceptual span awareness (move from strict one-word to controlled chunk previews). Evidence: strong-to-moderate; supports chunked preview benefits. Verified: Rayner et al. reviews and Niefind 2016.
  3) Include strategy-based/metacognitive training (preview, questions, self-testing) to lift speed with minimal comprehension loss. Evidence: moderate; Klimovich 2023 and related work. Verified: Wiley JRR 2023.
  4) Peripheral vision training as a longer-term calibration path to improve reading speed with maintained comprehension on simpler texts. Evidence: moderate; Chung et al. 2004; 2016 peripheral vision work. Verified: PMC references.
  5) Baseline WPM and comprehension tests with spaced practice for ongoing calibration. Evidence: moderate; CBM literature; So Much to Read references.

Rationale: These selections balance speed gains with comprehension, align with the core scientific literature, and map to implementable UI/UX strategies in an RSVP-like viewing mode.

## 9) Next steps (high level)
- Build a minimal RSVP viewer supporting 1-2 word chunks with optional ORP alignment, plus a baseline/retention quiz module.
- Add a calibration workflow: measure baseline WPM, comprehension, and track progress over sessions.
- Prototype a metacognitive training pathway with explicit preview questions and self-testing prompts.
- Prepare a small literature appendix with the cited sources for team review.

## Appendix: Evidence sources (selected)
- RSVP and comprehension trade-offs: Rayner et al. So Much to Read (2016); Does speed-reading work? Klimovich et al. 2023; Balota 2016; Potter et al. 1987. Verified URLs: https://www.journals.sagepub.com/doi/10.1177/1529100615623267, https://www.nature.com/articles/s41598-023-30748-z, https://pmc.ncbi.nlm.nih.gov/articles/PMC4835101
- Perceptual span and parafoveal preview: Rayner et al. (Eye Movements in Reading) and Schotter et al. (Parafoveal processing). Verified: PubMed links above.
- Peripheral vision training and reading: Chung et al. (2004), Lee et al. (2003), Training peripheral vision to read (PMC5775067). Verified: PMC5775067, PMC2794940.
- Metacognitive strategies: Klimovich 2023; Rayner et al. (So Much to Read). Verified: Wiley 2023; PubMed 26769745.

Notes on citations: Verified URLs are provided in-line; model-knowledge was used where explicit URLs are not fetched or in cases where the literature is well-known to the field. See the Evidence section for details and URLs.

### End of report
