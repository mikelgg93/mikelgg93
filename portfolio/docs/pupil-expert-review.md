# Pupil expert-review follow-up

Checked against current master (`ae47637`) on 15 October 2026. The supplied review is a set of proposals, not evidence that the named researchers personally reviewed this article. Both languages are updated.

## Branch updates

Parts III–V were ancestors of master. All three branches were fast-forwarded to `ae47637` and pushed; the shared 83-page draft build passed. This preserves the latest Neon socket normalisation/resolved-IP/startup-error/permission fixes and the Cloudflare migration. Hosting/access settings and publication flags are unchanged.

## Scientific decisions

| Proposal | Decision |
| --- | --- |
| Separate anatomical/entrance/exit pupils | Define all three. The first demo represents the anatomical opening; trolands and luminance/SCE calculations use entrance-pupil coordinates. The 3D material is illustrative, not calibrated optical magnification. |
| All Neon telemetry is entrance-pupil diameter | Rejected: official Pupil Labs documentation describes estimates of physical pupil diameter in mm. No fixed corneal magnification is applied. |
| Fixed pupil positions/magnifications | Omitted as universal claims. The review summary also confuses axial positions with aperture sizes. Geometry, wavelength and viewing angle matter. |
| SCE tints the iris | Remove the shader tint. Existing numerical readouts explain efficiency without recolouring tissue or adding controls. |
| SCE exponent convention | Share rho10 = 0.05 mm^-2 and rhoE = rho10 ln(10) ≈ 0.115 mm^-2; label the value as illustrative, not an individual constant. |
| Waveguide/SCE-II explanation | Explain directional coupling and distinguish perceived hue changes from iris colour. Do not claim every cone is a single-mode guide with fixed V-number or one universally settled mechanism. |
| Generalised pupil / PSF / OTF / PTF / VSX | Add an optional short optics section. Distinguish amplitude from intensity and specify monochromatic scalar assumptions. Contrast reversals can occur; the demo does not compute VSX. |
| r^4 and optimal 2.5–3.5 mm | Qualify r^4 as one spherical-aberration term, not all Zernikes. Retain the approximate 3–4 mm teaching range with eye/task dependence; partial cornea/lens compensation does not set a universal cancellation diameter. |
| OPN/EWpg and sympathetic chain | Name olivary pretectal/preganglionic EW relays, retain partial crossing and bilateral projection, add the sympathetic chain and Horner example. Avoid a fixed crossing percentage. |
| Opioid/GABA microcircuit | Keep central-autonomic wording; do not add a species-independent receptor/circuit assertion without matching evidence. |
| LC-NE and cognitive response | Add a short explanation of the locus coeruleus–noradrenaline link; pupil size is neither a direct nor exclusive measure of that activity. No universal task-response amplitude. |
| Mathur off-axis model | Cite the measured flattened/decentred cosine behaviour and label orbiting illustrative. No quantitative flat-cosine model existed to replace. Do not apply a universal cos(0.9 theta)/25% correction to the material. |
| Replace Moon–Spencer citation | Rejected: Watson & Yellott explicitly review its tanh formula. Clarify that this demo's +0.4 shift is a chosen parameter, not the published cd/m² conversion. Preserve the existing animation relationship. |
| Lay-reader explanations | Explain entrance pupil and trolands directly; keep wave-optics detail optional. No external images. |

## Engineering decisions

- Synchronous ArrayBuffer parsing; bounded FIFO for Blob conversion (64 pending messages / 1 MiB including conversion in progress). Overflow fails and cleans up rather than silently dropping fragments. Disposal ignores late conversion results.
- Do not force `binaryType` on Monitor-owned sockets: its handlers may require Blob input. Preserve the recent socket fixes and documented payload. React numeric HUD updates are capped at 10 Hz; graph/rendering and acquisition remain independent.
- Preallocated circular arrays replace latency queues and graph-history shifting. Test chronology, exact delay boundary, wraparound and reset.
- Remove time-based pupil-margin noise, iris texture drift and pulsing red pupil colour. Keep intentional diameter/hippus dynamics. Visible iris canvases keep refreshing their transmissive material; offscreen rendering remains suspended.
- Use a transmitting front-facing cornea without redundant alpha transparency, correcting triangle winding to face outward.
- DPR-aware PLR canvas backing store, with CSS-pixel coordinates for line widths.
- Replace the neural pathway's extra RAF with R3F useFrame and visibility-driven always/demand/never scheduling. Retain reset/debug, reduced-motion and cleanup.
- Existing client:visible, capped DPR, mobile pan-y and disposal were already present. Keep the original visibility threshold: a 250px preload margin would initialise scenes sooner and does not guarantee fewer retained contexts.

## Source checks

- [Pupil Labs data streams](https://docs.pupil-labs.com/neon/data-collection/data-streams/#pupil-diameters): physical pupil estimates and wearer IED dependence.
- [Watson & Yellott (2012)](https://doi.org/10.1167/12.10.12), introduction and equations 5–7: entrance pupil, Moon–Spencer history and unit conversion. Author-uploaded full text checked when the publisher blocked automated access.
- [Westheimer (2008)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2572678/): SCE conventions, directionality, second-kind effect and modelling limits.
- [Mathur et al. (2013)](https://doi.org/10.1167/13.6.3): off-axis shape and non-universal cosine fit.
- [McDougal & Gamlin (2015)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919817/): autonomic pathways and circuit/species qualifications.
- [Joshi & Gold (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7271902/): multiple pupil-linked neural circuits.
- [Artal et al. (2001)](https://pubmed.ncbi.nlm.nih.gov/12678609/): partial cornea/internal-optics compensation.
- [Thibos et al. (2004)](https://doi.org/10.1167/4.4.9): wavefront/image-quality metrics.

## Verification

- `bun test`: 46 passed, 0 failed (203,669 assertions). Includes empty/single/many graph histories, RTP layouts, SCE integration, bounded message decoding and disposal. A concurrent software-GPU run first exceeded an existing geometry test’s 5-second timeout; an isolated rerun passed in 4.18 seconds overall.
- Production build: 42 pages, successful. Updated III–V baseline: 83-page draft build successful.
- Biome: all 13 changed TypeScript/test files pass. Repository-wide `bun run check` still reports 12 existing errors, 1 warning and 1 info in untouched files; no unrelated formatting sweep.
- Installed `astro check` fails inside the language server (`fileExists` undefined) with the repository’s TypeScript 7 dependency. The same checker using an external TypeScript 5.9 compatibility runtime reports 0 errors and 0 warnings across the 13 changed files (4 hints); no dependency or lockfile changes.
- Chromium phone viewport: slider endpoints/reset; SCE readouts without iris tint (paired canvas screenshots differ by only 0.018/255 mean channel value from fractional scrolling); high-DPI graph; R3F motion, offscreen/reduced-motion pause and reset; no horizontal overflow; Spanish content and maths rendering.
- Mock Monitor bundle: mixed Blob/ArrayBuffer pupil data, `about://` socket normalisation, harmless startup warning, acquisition while offscreen, reset while streaming, disconnect removing the iframe and closing its socket; no browser errors. This exercises the retained interception architecture, not a substitute client.
- Final diff and whitespace checked. Publication flags, dates, protected-preview configuration and unrelated site UI remain unchanged.

Actual Neon hardware, iPhone hardware and authenticated Cloudflare preview access are unavailable in this workspace; protected previews are preserved, without a public tunnel.


## Interface follow-up

- Branch previews for III–V now select their own bilingual draft plus published posts using Cloudflare’s `CF_PAGES_BRANCH`; shared source is retained. Production visibility is unchanged.
- Compact callout paragraph spacing, sentence-case info popovers, aligned icon controls and thin accent sliders.
- Anatomy demo: pointer/keyboard muscle divider; starting diameter, pigment and optional illustrative motion inside caption settings. Reduced-motion preference suppresses motion.
- Unboxed optical/simulator readouts and collapsible settings below the canvas, including on desktop so adjustments do not cover the pupil. Neon’s heading is now a keyboard-accessible disclosure with a separate info trigger; acquisition code is unchanged.
- Conic presets use a dropdown with existing explanatory text. The conic and layer demos omit the requested reset buttons.
- Follow-up verification: 47 tests passed; changed TypeScript/Biome checks passed; production build passed (43 pages). Scoped Part III build passed (64 pages), with III present and IV/V absent in both languages. 390px and 1200px Chromium checks covered dragging/keyboard reveal, diameter endpoints, settings, shaders, popover casing, Neon address, dropdowns, reset removal and overflow. Additional checks cover reduced motion and settings below the canvas. Existing repository-wide checker limitations above remain.
