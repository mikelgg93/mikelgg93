# Eye construction presentation

Route: `/presentations/webgl-eye/`. One WebGL canvas, 16 construction steps, a black background and original procedural scenes. No external image assets.

The lesson follows the implementation: scene → camera → sphere → clipping → editable vertex buffers → conic sag → corneal shell → iris aperture → deformation → opposed lens caps → material → GRIN ray paths → suspension → accommodation → assembly → IOL. Three.js manages WebGL; snippets show the operation being taught, not complete standalone programs. The source link exposes the full loops and helpers.

- Previous / Next change slides. Pause / Replay controls each short animation.
- Left / Right and Page Up / Page Down change slides; Home / End jump to the ends.
- Space pauses or resumes; R restarts the current step. Drag the stopped scene to orbit.
- Reduced-motion mode shows each final state immediately.
- On phones, the figure appears before the code and navigation returns to the new heading.

Headings request a locally installed **Michelangelus Italic**, with bundled **Old Standard TT Italic** as the fallback. Microsoft's [official download](https://www.microsoft.com/en-us/download/details.aspx?id=108856) includes an EULA granting local installation/use but no distribution rights (§1b). No Microsoft font files are hosted or embedded. Old Standard TT and Geist are distributed under the SIL Open Font License; the offline export includes their notices and bundled library licences.

Run the normal `bun run build`, then `bun run preview --host` to review the site route.

Run `bun run build:presentation` to export `dist/presentations/webgl-eye/standalone.html`. This single file embeds scripts, styles and fallback fonts and opens offline in a WebGL-capable browser without a server. Only optional source/reference links use the network. Run the export after the site build, which replaces `dist`.

Model numbers and boundaries are stated on the slides. Camera coordinates, mesh density, timing, tissue detail and materials are illustration choices. GRIN rays reuse the article's isolated numerical lens model. The final anatomy is not a coupled whole-eye optical solver or a surgical simulation.
