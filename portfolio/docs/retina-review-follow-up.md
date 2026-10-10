# Part IV review follow-up — 10 October 2026

Follow-up to the AI review of `2402481`, organised through the requested reader, graphics, programming and vision-science perspectives. These are not reviews or endorsements by the named scientists.

## Resolved findings

| Finding | Change and evidence |
| --- | --- |
| R1: wall winding | Inner, outer, rim and cut-face winding are explicit. Closed coats now use front-face rendering. Tests assert opposite inner/outer normals and outward cut-face normals. |
| R2: nerve/canal mismatch | The in-canal nerve uses the canal axis and `distance * tan(angle)` radius, with an explicit row at the scleral exit. The external bend starts there with zero initial slope. Clearance assertions cover both cached meshes. |
| R3: unexplained final helper | Four additional slides teach nested walls and winding, the shared nasal opening, nerve placement, and pit/vessel construction. The deck has 29 steps and retains its black background, italic headings and four controls. |
| R4: missing landmarks | A Gaussian pit deforms the inner retinal surface; a muted macular tint and original stylised vessel tubes accompany it. The retinal-view preset exposes numbered fovea, macula and nasal disc landmarks. The whole-eye geometry is explicitly distinguished from the magnified layer and receptor views. |
| R5: keyboard orbit | Focusable canvases accept arrow-key rotation, announce that instruction and show focus. Events stay within the focused viewer and listeners are removed on disposal. Slide navigation keeps its shortcuts outside the canvas. |
| R6: repeated rim solving | The 32-iteration rim solution is cached per side/azimuth; fixed corneal-rim sags are computed outside the vertex loop. Whole/cut meshes remain cached. Actual iPhone initialization performance still needs device observation; emulation is not a hardware benchmark. |
| R7: sampling label | The lower panel says “Same frequency, same samples” below the aliasing condition, and “Matching low-frequency pattern” above it. The correct phase-adjusted alias relationship is unchanged. |
| R8: duplicated dimensions | Coat radii derive from `CUP_RADIUS` and named wall offsets. Shared anterior dimensions drive both geometry and biometry readouts. |
| R9: colour/magnification | The layer diagram now has numbers matching its key. The article and slides distinguish the magnified profile from the subtle pit at whole-eye scale. |

## Anatomical scope

The relaxed assembly has CCT **0.55 mm**, **internal** ACD **3.52 mm**, lens thickness **3.60 mm**, and anterior-cornea-to-RPE axial length **24.30 mm**. Geometry tests independently inspect corneal/lens vertices and retinal ray intersections to check those endpoints. The RPE is represented by the outer retinal boundary; it is not separately resolved as a microscopic layer in the assembled globe.

The chosen retinal wall is 0.30 mm outside the Gaussian depression. The 0.10 mm pit leaves 0.20 mm at its centre. These are geometry parameters, not a measured thickness map. Choroid and sclera offsets, disc opening, nerve length, tint and visible vessel calibres remain illustrative. The macular region uses an approximately 5.5 mm diameter, with a reference explaining the clinical definition. Its tint is a visual cue, not a spectral pigment model.

The fovea is placed on the schematic posterior axis; real visual/optical-axis offsets, individual asymmetry, anterior retinal extent, capillaries, lamina cribrosa detail, axons and meningeal layers are not reconstructed. The anterior pieces were retained from Part III rather than fitted to the same biometric dataset as the posterior globe. This is a coherent teaching assembly, not a clinically validated anatomical or whole-eye optical model. It does not predict acuity, an OCT scan or a retinal image.

All added geometry is procedural. No third-party images were added. The existing Neon browser integration is unchanged.

## Scientific checks

- [Webvision: The Architecture of the Human Fovea](https://www.ncbi.nlm.nih.gov/books/NBK554706/) supports the macular terminology and approximately 5.5 mm clinical diameter.
- [Provis et al., 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3658155/) supports the distinction between pit morphology, cone specialisation and the avascular region.
- [Webvision: Simple Anatomy of the Retina](https://www.ncbi.nlm.nih.gov/books/NBK11533/) supports disc/fovea relationships and the major vascular arrangement.
- [Ostrin et al., IMI—The Dynamic Choroid, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10153586/) supports the cornea-to-RPE axial-length endpoint. The chosen model values are not attributed to this paper.

## Verification

- 31 Bun tests pass, including conic extremes, the existing Neon parsing/graph tests, lens models, every slide's geometry endpoints/midpoint, posterior normal orientation, canal clearance, biometry, pit thickness, vessel placement and disposal of hidden geometry.
- Scoped Biome check passes for all 15 changed TS/TSX/test files; changed CSS formatted; `git diff --check` passes.
- Production build passes: 46 pages, including the two new lazy source fragments. Verification uses the existing isolated build workspace with synthetic résumé fixtures; task source is copied from the repository unchanged.
- Repository-wide `bun run check` remains blocked by the existing missing Biome ignore-file configuration. `astro check` remains blocked by the installed language-server/TypeScript incompatibility (`fileExists`). TypeScript 5.9 reports the same ten baseline diagnostics in ErrorBoundary and the OG route, with none in this change.
- EN/ES article checks pass for all five demos at 320, 390, 430, 844 and 1440 px: slider endpoints, every button, matching lazy sources, idle rendering, rotation and three disposed WebGL contexts. The pre-existing layout hydration warning remains; there are no new shader errors.
- All 29 slides pass on the production route and in the offline HTML at 320, 390, 768 and 1440 px: no page overflow, fullscreen enter/exit and unsupported-browser fallback, four controls, keyboard/phone navigation, pause/replay/orbit, reduced motion and zero offline network requests.
- Retinal-view/reset and three projected landmarks pass dedicated checks, as does focused-canvas rotation without changing the slide. Visual review corrected label stacking, cropped retinal framing, disc visibility on the landmark slide and the darkest band’s number contrast.
- Chromium phone-size tests do not certify iOS Safari behaviour or device performance. The public preview is limited to English/Spanish Part IV and the standalone slides; full source panels remain in the repository build.
