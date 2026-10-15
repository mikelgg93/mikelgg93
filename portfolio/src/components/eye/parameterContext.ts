import type { ParameterContext } from "./ParameterControl";

// Explicitly audited assignments at each call site. A slider's current setting
// is not a measurement merely because its default resembles a literature value.
export const parameterContext = {
	cornealRadius: {
		basis: "Literature-derived",
		text: "The 7.8 mm starting radius is a typical schematic anterior cornea. Adjusted radii are illustrative; displayed keratometric power uses the conventional index 1.3375, not a full two-surface calculation.",
		source: {
			label: "Atchison & Smith, Optics of the Human Eye (2000), Ch. 2",
			href: "/blog/webgl-eye-01-cornea#references",
		},
	},
	asphericity: {
		basis: "Literature-derived",
		text: "Q is dimensionless. The −0.26 starting example represents a prolate cornea; individual corneas vary. Slider settings and presets illustrate shape rather than diagnose it.",
		source: {
			label: "Corneal shape references",
			href: "/blog/webgl-eye-01-cornea#references",
		},
	},
	thickness: {
		basis: "Literature-derived",
		text: "The starting central thickness is 550 µm (0.55 mm), a typical example rather than a patient measurement. The slider varies this model dimension.",
		source: {
			label: "Corneal anatomy references",
			href: "/blog/webgl-eye-01-cornea#references",
		},
	},
	material: {
		basis: "Illustrative",
		text: "Three.js physical material with an 80–420 nm iridescence range. This is an artistic interference effect, not physiological lipid thickness or a spectral tear-film calculation.",
	},
	pupil: {
		basis: "Illustrative",
		text: "Pupil diameter in millimetres, chosen for this visualisation. It is independent of luminance here; no eye has been measured.",
	},
	entrancePupil: {
		basis: "Illustrative",
		text: "Entrance-pupil diameter in mm: the corneal image of the iris opening. Used for area and trolands here; the 3D material is not a calibrated magnification model.",
	},
	luminance: {
		basis: "Illustrative",
		text: "Scene luminance in cd/m² is an input to the demo, not a screen calibration or measurement. The reflex uses a simplified luminance-only relationship, not the full Watson–Yellott model.",
		source: {
			label: "Watson & Yellott (2012): fuller model",
			href: "https://doi.org/10.1167/12.10.12",
		},
	},
	sce: {
		basis: "Illustrative",
		text: "A centred Gaussian in entrance-pupil coordinates uses rho10 = 0.05 mm⁻² (rhoE ≈ 0.115 mm⁻²). This simplified SCE efficiency changes the effective area, not the physical pupil diameter.",
		source: {
			label: "Stiles & Crawford (1933)",
			href: "https://doi.org/10.1098/rspb.1933.0019",
		},
	},
	latency: {
		basis: "Illustrative",
		text: "The 220 ms delay and unequal response time constants are simulation parameters. Actual PLR timing varies with stimulus, adaptation, age and other conditions.",
	},
	cognitive: {
		basis: "Illustrative",
		text: "An additive diameter offset in millimetres demonstrates a non-light influence. It is not a calibrated measure of effort, arousal or cognitive load.",
		source: {
			label: "Beatty (1982)",
			href: "https://doi.org/10.1037/0033-2909.91.2.276",
		},
	},
	domes: {
		basis: "Illustrative",
		text: "Radius in millimetres for two identical spherical caps. These matching surfaces are a construction exercise, not an anatomical crystalline-lens prescription.",
	},
	grin: {
		basis: "Illustrative",
		text: "Dimensionless core-to-surface refractive-index difference in a quadratic 2D GRIN model. The ray diagram demonstrates gradient bending; it is not fitted to an individual lens.",
		source: { label: "Lens models and references", href: "#references" },
	},
	accommodation: {
		basis: "Illustrative",
		text: "A dimensionless 0–1 animation control changes lens and ciliary geometry. It is not dioptres or a prediction of a person's accommodative response.",
	},
	demand: {
		basis: "Illustrative",
		text: "Accommodative demand in dioptres for a simplified paraxial demonstration. The available reserve limits the model response; neither slider is an individual clinical measurement.",
	},
	cataract: {
		basis: "Illustrative",
		text: "Opacity is a 0–1 visual material parameter, not a clinical cataract grade or a measured forward-scatter coefficient. The displayed pattern demonstrates location.",
	},
	retinaCup: {
		basis: "Illustrative",
		text: "A 0–1 interpolation bends a flat grid into a schematic retinal cup. The final radius is a drawing choice, not a universal retinal curvature.",
	},
	mosaic: {
		basis: "Illustrative",
		text: "A sparse schematic receptor mosaic contrasts central and peripheral organisation. Receptor sizes, counts and spacing are chosen for readability, not copied from a measured retinal patch.",
	},
	sampling: {
		basis: "Illustrative",
		text: "Frequency is in cycles across this panel; samples are evenly spaced mathematical points. This demonstrates aliasing, not visual acuity or an anatomical cone mosaic.",
	},
	schematicModel: {
		basis: "Literature-derived",
		text: "Named prescriptions retain their published geometry and optical assumptions. The teaching assembly is illustrative; the mesh alone does not perform GRIN or retinal ray tracing.",
		source: { label: "Prescription sources", href: "#references" },
	},
	refraction: {
		basis: "Literature-derived",
		text: "Spectacle refraction in dioptres drives the centred Atchison model's published dimensional relationships. This is a model input, not measured refraction of the rendered eye.",
		source: {
			label: "Atchison & Thibos (2016)",
			href: "https://doi.org/10.1111/cxo.12352",
		},
	},
	spread: {
		basis: "Illustrative",
		text: "A multiplier of the published standard deviation. The histogram contains synthetic Gaussian draws; changing spread does not describe a newly measured cohort.",
		source: {
			label: "Rozema et al. (2011), Tables A1/A2",
			href: "https://doi.org/10.1167/iovs.10-6705",
		},
	},
	population: {
		basis: "Literature-derived",
		text: "Means and covariances come from the published right-eye dataset's five-variable subset. Points are synthetic, with drawing guards; they are not individual patient records.",
		source: {
			label: "Rozema et al. (2011), Tables A1/A2",
			href: "https://doi.org/10.1167/iovs.10-6705",
		},
	},
	neon: {
		basis: "Measured",
		text: "Neon estimates physical left/right pupil diameters in millimetres, not simply apparent video diameters. Missing eyes remain gaps. Pausing offscreen drawing does not stop acquisition.",
		source: {
			label: "Pupil Labs: Neon real-time data",
			href: "https://docs.pupil-labs.com/neon/data-collection/data-streams/#pupil-diameters",
		},
	},
} satisfies Record<string, ParameterContext>;
