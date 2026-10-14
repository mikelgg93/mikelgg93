# Blog interaction review

Implemented on `feat/blog-interactions-and-search`; intended for review before pushing.

## Changes to review

| Area | Before | After |
| --- | --- | --- |
| Article headings | No discoverable copy action; TOC replaced history | Build-time unique anchors, copy-link feedback, sticky-header offset and native anchor history; explicit IDs retained |
| Simulation controls | Restore values manually | Individual resets use the mounted demo's actual initial values; full reset beside Debug also restores camera and animation state |
| Scientific context | Values explained mainly in article prose | Small focus/touch/hover popovers explicitly distinguish measured, literature-derived and illustrative values, with units and existing sources |
| Rendering | Some demos kept rendering offscreen | Shared visibility handling pauses rendering offscreen/in hidden documents, without rebuilding scenes; Neon acquisition continues |
| Dates | Different formatting across layouts | Shared semantic publication/update display and article structured data; unpublished drafts show no publication date |
| Missing pages | Static error | Existing first-entry eye animation leads home, with an immediate home link and reduced-motion/WebGL fallbacks |
| Search | Shortcut help only | Local searchable published articles, section text, portfolio sections/publications and the public eye project; keyboard and touch palette |
| Neon connection errors | Generic fetch failure | Explanation of HTTP/HTTPS mixed content, local-network permissions and CORS; original Companion Monitor interception retained |

The existing desktop TOC, reading-time pill, mobile gestures and published/draft visibility policy are retained. No dependency, scientific equation, article prose or publication date changes. Slides and Parts III–V remain unpublished. The branch retains the preceding blog-directory swipe-to-home change.

## Defaults and reset semantics

`CORNEA_REALISTIC_DEFAULTS` is the source for the requested physical-material model:

```json
{"model":"Illustrative physical material","iridescenceRangeNm":[80,420],"physiologicalThinFilm":false,"camera":[-3.9555121010005623,-2.292437857508836,-18.844061470083833],"target":[0,0,0]}
```

Other demos capture initial parameters once per mount, including conditional controls. Rerenders do not overwrite choices. There was no persisted/URL configuration system to supersede. Individual resets leave other parameters alone. Full reset clears model transients and returns the camera. The Neon reset only restores the camera and explicitly keeps streaming.

## File groups

- Heading IDs/search extraction: `src/lib/article-headings.mjs`, `astro.config.mjs`, `components/blog/HeadingLinks.astro`, both TOCs and `BlogLayout.astro`.
- Dates: `src/lib/articleDates.ts`, `components/blog/ArticleDates.astro`, `content.config.ts`, shared layouts, blog list and homepages.
- Controls/provenance: `components/eye/ParameterControl.tsx`, `parameterContext.ts`, `parameter-control.css`, cornea/pupil/lens/retina/model components, `ui/InteractiveViewer.astro` and source-tab registries.
- Lifecycle: `components/eye/visibility.ts`, `demoLoop.ts`, `lens/lensScene.ts`, `WebGLShader.tsx`, `WebGLEye.tsx`, `PupilHardwareSync.tsx`.
- 404: `src/pages/404.astro`, `Layout.astro`, existing `WebGLEye.tsx`.
- Search: `src/pages/search-index.json.ts`, `lib/search.ts`, `lib/keyboard.ts`, `components/CommandPalette.tsx`, `command-palette.css`, Header/Footer and section IDs; a small MobileMenu focus hand-off prevents nested modal conflicts. Replaces `ShortcutsModal.tsx`.
- Regression coverage: `tests/blog-interactions.test.ts` supplements the existing optical/geometry tests.

## Metadata and provenance requiring editorial confirmation

Original frontmatter dates are preserved, rather than inferred from Git or the current date. An optional `updated` date can be supplied after an editor confirms the date of a meaningful revision; none has been invented here. Draft dates are not represented as publication dates.

Popover classifications are assigned explicitly at each control. Typical anatomical starting values are literature-derived, adjusted geometry/material/response parameters are illustrative, and live Neon pupil diameters are measured. The 80–420 nm material setting is an illustrative Three.js iridescence parameter, not a claim about physiological tear-film thickness. Existing article references supply provenance; these controls do not independently validate individual anatomy.

## Verification and limits

- All 41 unit tests pass (203,626 assertions), including conic/eye geometry, model constraints, heading IDs, dates and search. Run with `bun test --timeout 20000` to accommodate the geometry suite under software-rendering load.
- Changed-file Biome checks pass. The repository-wide check still reports pre-existing issues in untouched files.
- Changed-source Astro diagnostics pass using TypeScript 5.9 from an external test tool directory. The repository's normal `astro check` currently crashes in its language server with the installed TypeScript 7 (`fileExists` undefined). Dependencies were not changed to conceal this incompatibility.
- Production and private draft builds tested; public search excludes drafts even in a draft build.
- Browser checks cover heading copying/history/fresh anchors, exact cornea camera reset, independent control resets, slider extremes, offscreen rendering and the 404 return-home path.
- Mocked Monitor bundle/WebSocket tests exercise the existing interception and packet path, streaming while hidden/offscreen, resumed presentation, reset without disconnecting, and disconnect cleanup. No physical Neon hardware was available.
- All five articles passed 320px layout checks with 23 sliders at both bounds, independent/full resets, and conditional model resets. Search/help/touch navigation, focus restoration (including from the sidebar), blocked Neon fetch cleanup and reduced-motion 404 were checked without browser errors.
- Phone layouts are tested in Chromium emulation with software WebGL; this is not a real iOS Safari/device test. Test render resolution was reduced for software-GPU performance; production resolution is unchanged.
- HTTPS-to-HTTP Neon access is subject to browser mixed-content, local-network and CORS policies. A fetch failure cannot identify which restriction caused it. Clearer errors do not bypass security or make the public HTTPS integration universally available. A local HTTP preview can avoid the mixed-content condition but still needs network/CORS access.
- The original eye transition is scroll-driven; the 404 reuses its path automatically over six seconds of visible animation time.

## Neon local-network permission follow-up

Connect now marks non-loopback device fetches with Chromium's `targetAddressSpace: "local"` hint. The fetch itself can trigger the browser-owned local-network permission prompt; no permission is silently granted. Loopback addresses retain ordinary fetch behaviour. See [Chrome's LNA documentation](https://developer.chrome.com/blog/local-network-access).

The stream watchdog starts when the Monitor script is attached, rather than expiring while a permission prompt is pending. Cancellation still aborts fetching and disposes the hidden iframe. A short connection note is always available; errors expand English/Spanish help with local-network permission settings, desktop Chrome/Edge's per-site insecure-content exception and the remaining CORS/WebSocket limitations. The help panel scrolls within the demo at phone widths.

This does not replace or rewrite the Companion Monitor integration. Real permission prompts and physical Neon connectivity require a supported browser/device test; a mocked delayed fetch verifies the timeout and fallback behaviour.

### Date provenance checked against Git

The Cornea `date: 2026-07-27` was already present in its original `5008ed7` commit, dated 31 July 2026. The Pupil `date: 2026-08-10` was already present in its original `214e4e3` commit, dated 14 September 2026. These are inherited editorial metadata, not verified first-publication events. Commit dates are also not deployment dates. The owner should confirm the actual publication dates before treating the labels/structured data as independently verified.
