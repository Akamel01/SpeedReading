SpeedReading Studio (Local RSVP Trainer)

Live demo: https://akamel01.github.io/SpeedReading/ (same static app, served from this repo via GitHub Pages).

- What it is: a local-first RSVP speed-reading trainer that uses small 1-2 word chunks by default and a 3-word trial mode. It runs offline in your browser and keeps progress in IndexedDB.
- Run locally: python3 -m http.server 8080
- Open: http://localhost:8080/
- Tests: node --test (requires Node >= 22.7; zero dependencies)
- Privacy posture: no build, no backend, no accounts, no telemetry. After load there are zero network requests, except a URL import you explicitly trigger (the target site sees a normal fetch; most sites block cross-origin reads, in which case the app says so and offers the paste box). Text and progress stay in the browser. Export/import JSON is supported.
- Import formats: `.txt`, `.md` (formatting stripped, headings kept), `.epub` (DRM-free), `.docx`, `.pdf` (text-based; scanned-image PDFs need OCR), article URLs, or pasted text. Use only texts you have the rights to read; DRM-protected files are unsupported and never circumvented.
- PDF support vendors pdf.js (Mozilla, Apache-2.0) under `vendor/pdfjs/`; it loads only when a PDF is imported.
- Evidence notes: RSVP strong-with-comprehension-tradeoff; parafoveal preview/ORP moderate-strong; metacognitive + calibration moderate; peripheral/perceptual-span framed as calibration pathway NOT guaranteed speed boost; chunk-size 1/2/3: evidence strength is weak for 1 and 3, 2 is the default.
- Glossary: RSVP; ORP = Optimal Recognition Point; chunking; perceptual span; baseline calibration; cloze.
- Non-goals: accounts/cloud/social/LLM quizzes/PDF/DRM/mobile.
- Rights & DRM: user must own rights; DRM-protected files are unsupported and never circumvented.
- 4-week pilot plan: week 1 baseline WPM plus quiz; weeks 2-3 three sessions per week with a retention quiz; week 4 re-baseline. Judge progress via comprehension trend (not WPM alone).

Note: This README uses a plain, evidence-marked voice suitable for a technical reader.
