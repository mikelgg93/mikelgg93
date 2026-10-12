# Parts III–V: demo controls and inspection

All three articles use the same `InteractiveViewer` as Parts I–II. Part III has seven blocks, Part IV five and Part V three, in both English and Spanish: 30 rendered blocks in total.

## Changes

- Keep Preview, Code and Debug as the only top-level tabs. Translate them on Spanish pages, add keyboard tab navigation and selected-state semantics, and retain 44 px touch targets.
- Publish model state for the retinal layer diagram, retinal sampling diagram and normal-distribution histogram. Include the shared hook in their source panels. The comparison and population scenes now include prescription/sampling inputs in Debug.
- Refresh a 3D snapshot when opening Debug even if the controls have scrolled its canvas offscreen. Such snapshots are marked `settled-controls`; they evaluate the requested settings once without rendering or starting an offscreen loop. Ordinary rendered snapshots are marked `rendered-frame`. The inspection listener is removed on scene disposal.
- Collapse camera presets into one selector. Replace preset button groups with native selectors for lens type, assembly view, opacity pattern, retinal region, eye model and population sampling mode. Remove redundant distance presets where a slider already provides the same operation.
- Keep **Hide muscle & zonules**, the primary teaching actions and population download. Put the final retina's layer checkboxes and reset under **Layers and reset**. Selecting an IOL still opens the section; selecting an opacity pattern faces its affected region.
- Adjust only the short article instructions affected by these control changes. No scientific model, Neon integration or borrowed imagery was introduced or replaced.

Visible action buttons inside the default previews, excluding the three shared tabs and closed disclosures:

| Article | Buttons per block, in article order |
| --- | --- |
| III | 2, 2, 2, 0, 1, 0, 1 |
| IV | 2, 2, 1, 1, 2 |
| V | 1, 1, 3 |

## Verification

- Production build succeeds: 57 pages, including generated source fragments.
- All 36 existing tests pass, with 203,608 assertions.
- Scoped Biome check passes on every changed TS/TSX file; CSS was formatted with Biome independently of the project's CSS exclusion. `git diff --check` passes.
- Chromium at 390 × 844: all 30 blocks load Preview, their first source file and parseable Debug state; control changes refresh Debug; keyboard tab selection works. All 39 unique source-fragment URLs return highlighted code. No full-page horizontal overflow on the six article pages.
- Focused 320 px and 1440 px checks cover the IOL/section transition, hiding muscle and zonules, assembly modes, camera presets, retinal layers/reset, Atchison's −10 D input and exact source-file copying. The shared tabs and source/JSON clipboard actions also pass on Parts I–II. Narrow Spanish tab spacing was adjusted after screenshot inspection and rechecked at 320, 360 and 390 px: all labels fit on one line and all tab targets remain at least 44 px tall.
- The public tunnel serves the six article pages and required generated assets/source fragments. Article and source requests were also checked over HTTPS.

The existing global check failures remain: the Biome command cannot find its configured ignore file, and `astro check` crashes inside the installed language server. A TypeScript 5.9 compatibility run has the same ten baseline diagnostics in `ErrorBoundary.tsx` and the OG route, with no new diagnostics. The existing page-level React hydration warning remains; the demo checks pass after hydration. Phone-size Chromium checks do not replace an actual iOS Safari device review.
