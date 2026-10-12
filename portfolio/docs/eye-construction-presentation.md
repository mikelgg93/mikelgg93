# Eye construction presentation

Preview-only route: `/presentations/webgl-eye/`. Normal production builds omit this page and its article links. One WebGL canvas, 29 construction steps, a black background and original procedural scenes. No external image assets.

The lesson follows the implementation: scene → camera → sphere → clipping → vertex buffers → triangle indices → normals → conic sag → corneal shell → iris aperture → deformation → opposed lens caps → material and generated reflections → GRIN ray paths → muscle and zonules → accommodation → assembly → IOL → retinal cup → layer bands → foveal profile → instanced cones → nested coats and winding → shared nasal canal → fitted nerve → pit, macula and surface-following vessels → anatomical assembly. Three.js manages WebGL; snippets show the operation being taught, not complete standalone programs. The source link exposes the full loops and helpers.

- Fullscreen uses the browser API where available. On iPhone browsers without it, the button explains Safari’s Share → Add to Home Screen route.
- Previous / Next change slides. Pause / Replay controls each short animation.
- Left / Right and Page Up / Page Down change slides; Home / End jump to the ends.
- Space pauses or resumes; R restarts the current step. Drag the stopped scene to orbit, or focus its canvas and use the arrow keys.
- Reduced-motion mode shows each final state immediately.
- On phones, the figure appears before the code and navigation returns to the new heading.

Headings request a locally installed **Michelangelus Italic**, with bundled **Old Standard TT Italic** as the fallback. Microsoft's [official download](https://www.microsoft.com/en-us/download/details.aspx?id=108856) includes an EULA granting local installation/use but no distribution rights (§1b). No Microsoft font files are hosted or embedded. Old Standard TT and Geist are distributed under the SIL Open Font License; the offline export includes their notices and bundled library licences.

Run `bun run dev`, or `bun run build:drafts` followed by `bun run preview -- --host 0.0.0.0`, to review the site route. A draft build includes unpublished articles too; use the normal `bun run build` for production deployment.

Run `bun run build:presentation` to export `local-previews/webgl-eye/standalone.html`. This single file embeds scripts, styles and fallback fonts and opens offline in a WebGL-capable browser without a server. Only optional source/reference links use the network. The export is ignored by Git and stays outside the deployed `dist/` directory.

Model numbers and boundaries are stated on the slides. Camera coordinates, mesh density, timing, tissue detail and materials are illustration choices. GRIN rays reuse the article's isolated numerical lens model. The final anatomy is not a coupled whole-eye optical solver or a surgical simulation.
