# Part IV: retina — model and review notes

The article is available in English and Spanish. Its five demos progress from a surface mesh to grouped layers, enlarged receptor icons, a separate one-dimensional sampling experiment and an anatomical assembly. The presentation now includes that construction, plus intermediate triangle, normal, reflection and zonule steps (25 slides total).

## Evidence and modelling boundaries

- Posterior radius 12 mm, globe centre z = −6.4 mm, posterior pole z = −18.4 mm and corneal apex z = 5.6 mm are schematic geometry choices. They are not fits to a subject. Atchison et al. (2004), PMID 15452039, supports the statement that eye shape and dimensions vary.
- Seven displayed bands group nerve fibres with ganglion cells and omit limiting membranes/Henle-fibre detail. Drawing-unit thicknesses, colours, separated-view gaps and the analytic pit profile are illustrative. Kolb's Webvision anatomy chapter (NBK11533) and Provis et al. (2013), PMID 23500068, support the layer order and central foveal specialisation. Pit depth is not treated as an acuity predictor.
- Curcio et al. (1990), PMID 2324310, reports study averages of 4.6 million cones and 92 million rods, with variation. The article labels these as study values. The instances are qualitatively arranged icons, not digitised measurements or a fitted density function. Central cone-only and mixed rod/cone presets intentionally omit individual cone classes and circuits.
- The S/M/L description uses overlapping spectral sensitivities, not RGB triplets. Stockman & Sharpe (2000), PMID 10814758, is the primary M/L sensitivity reference. No spectral calculation is implemented.
- OCT is described as depth-resolved backscatter measured using low-coherence interferometry (Huang et al. 1991, PMID 1957169). Spaide & Curcio (2011), PMID 21844839, supports care in mapping OCT bands to anatomy. The layer drawing is explicitly not synthetic OCT.
- The sampling model uses uniform point samples and frequencies in cycles/panel. The lower-frequency alternative includes the phase correction required by half-cell sample positions. The test verifies matching values at every sample, including Nyquist and phase edge cases. It is not a perception/acuity simulation. Williams (1985), PMID 4013088, supplies the human foveal aliasing context.
- The neural pathway paragraph follows Kolb's Webvision "How the Retina Works" (NBK610611). Phototransduction, lateral circuitry, ON/OFF channels and ipRGCs are explanatory context, not implemented computations.
- The finale retains Part III's cornea, iris and lens helpers and adds nested choroidal/scleral walls and an offset optic disc/nerve canal. There is no coupled whole-eye optical solver. The small-scale layers and receptors are separate views, never millimetre-sized cells embedded in the assembled eye.

- The choroid's outer-retinal supply and the optic disc/nerve relationship follow Kolb's anatomy chapter. Watson & Young (2004), PMID 15106941, supports the sclera's collagen-rich supporting role. The disc is drawn nasally (+x); its 0.3-radian offset, the wall radii 12/12.18/12.58/13.28 mm, colours and short nerve path are drawing parameters, not normative measurements. The choroid extends towards the ciliary body; the scleral rim meets the existing corneal edge. Anterior joins are schematic. Detailed lamina cribrosa, axons, vessels, meninges and anterior retina remain omitted.

## Implementation checks

The posterior walls have a real shared canal and prebuilt full/cutaway meshes with closed cut faces. Visibility toggles reuse them; disposal includes hidden meshes. Reusable geometry and instance buffers; computed normals/bounds after deformation; on-demand rendering; shared Three.js disposal and context-restoration support. Camera resets restore each retina model's own target. Phone canvas sizing is independent of inline renderer dimensions.

The new tests cover spherical cup coordinates and finite reused buffers, non-crossing layers with retained central outer bands, sampling/alias agreement and deterministic mosaic capacity. Browser review covers both languages, five viewport widths, slider endpoints, every button, source-panel loading, section rotation, idle frames and disposal of three WebGL contexts on navigation.

The banner is an original projection of the posterior-cup construction. SVG is retained as editable source; PNG is used by the existing Open Graph renderer. No external images were introduced.

Existing repository-wide issues remain outside this change: Biome's missing ignore file; Astro check's installed-toolchain fileExists failure; ten existing TypeScript diagnostics in ErrorBoundary and the OG route. The page layout's pre-existing React hydration warning is recorded separately from demo errors. Real iPhone Safari still needs user review.
