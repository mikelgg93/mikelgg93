// Drawing parameters and a separate one-dimensional sampling experiment.
// These functions do not fit a clinical retina or predict visual acuity.
export function bounded(
	value: number,
	min: number,
	max: number,
	fallback = min,
) {
	return Number.isFinite(value)
		? Math.min(max, Math.max(min, value))
		: fallback;
}
export const CUP_RADIUS = 12; // mm: schematic eye, not a universal retinal radius
export const CUP_CENTRE_Z = -6.4; // mm, in Part III's assembly coordinates
export function cupPoint(u: number, angle: number, curvature = 1) {
	const theta = bounded(u, 0, 1) * Math.PI * 0.49;
	const t = bounded(curvature, 0, 1);
	const r = CUP_RADIUS * Math.sin(theta);
	const z = CUP_CENTRE_Z - CUP_RADIUS + t * CUP_RADIUS * (1 - Math.cos(theta));
	return [r * Math.cos(angle), r * Math.sin(angle), z] as const;
}
export const retinalLayers = [
	{
		en: "Nerve fibres + ganglion cells",
		es: "Fibras nerviosas + células ganglionares",
		color: "#d2a28d",
		thickness: 30,
	},
	{
		en: "Inner plexiform layer",
		es: "Capa plexiforme interna",
		color: "#ad899d",
		thickness: 34,
	},
	{
		en: "Inner nuclear layer",
		es: "Capa nuclear interna",
		color: "#ba7895",
		thickness: 34,
	},
	{
		en: "Outer plexiform layer",
		es: "Capa plexiforme externa",
		color: "#c8a677",
		thickness: 20,
	},
	{
		en: "Outer nuclear layer",
		es: "Capa nuclear externa",
		color: "#9d6e8e",
		thickness: 46,
	},
	{
		en: "Photoreceptor segments",
		es: "Segmentos de los fotorreceptores",
		color: "#debd79",
		thickness: 48,
	},
	{
		en: "Pigment epithelium (RPE)",
		es: "Epitelio pigmentario (EPR)",
		color: "#795844",
		thickness: 16,
	},
] as const;
// Schematic profile in drawing units. Layers taper; nuclear/segment bands thicken.
// Outer plexiform detail/Henle fibres and limiting membranes are not resolved.
export function layerBounds(x: number, pit: boolean, separated: boolean) {
	const centre = pit ? Math.exp(-((x / 0.28) ** 4)) : 0;
	const widths = retinalLayers.map(
		(layer, i) =>
			layer.thickness *
			(i < 4
				? 1 - centre
				: i === 4
					? 1 + 0.3 * centre
					: i === 5
						? 1 + 0.18 * centre
						: 1),
	);
	let y = 310;
	const bands = widths.map(() => ({ top: 0, bottom: 0 }));
	for (let i = widths.length - 1; i >= 0; i--) {
		bands[i] = { top: y - widths[i]!, bottom: y };
		y -= widths[i]!;
	}
	return bands.map((band, i) => ({
		top: band.top - (separated ? (6 - i) * 10 : 0),
		bottom: band.bottom - (separated ? (6 - i) * 10 : 0),
	}));
}
export function samplingModel(frequency: number, count: number, phase: number) {
	const f = bounded(frequency, 1, 24, 4);
	const n = Math.round(bounded(count, 8, 32, 16));
	const p = bounded(phase, 0, Math.PI * 2);
	const fold = Math.round(f / n),
		alias = f - fold * n;
	const signal = (x: number) => 0.5 + 0.45 * Math.cos(2 * Math.PI * f * x + p);
	const alternative = (x: number) =>
		0.5 + 0.45 * Math.cos(2 * Math.PI * alias * x + p + Math.PI * fold);
	return {
		f,
		n,
		alias,
		nyquist: n / 2,
		signal,
		alternative,
		samples: Array.from({ length: n }, (_, i) => ({
			x: (i + 0.5) / n,
			value: signal((i + 0.5) / n),
		})),
	};
}
// Fixed, repeatable positions keep SSR and browser renders deterministic.
export function receptorMosaic(central: boolean) {
	const cones: { x: number; y: number }[] = [],
		rods: { x: number; y: number }[] = [];
	for (let row = -10; row <= 10; row++)
		for (let column = -10; column <= 10; column++) {
			const x =
				(column + (row & 1) * 0.5) * 0.48 +
				0.035 * Math.sin(row * 13 + column * 7);
			const y = row * 0.42 + 0.035 * Math.cos(column * 11 - row * 5);
			if (Math.hypot(x, y) > 4.7) continue;
			if (central || (column + row * 3 + 100) % 5 === 0) cones.push({ x, y });
			else rods.push({ x, y });
		}
	return { cones, rods };
}
