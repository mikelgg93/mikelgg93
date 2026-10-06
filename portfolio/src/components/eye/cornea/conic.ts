// A circular aperture must fit inside the valid domain of both meridians.
// Stay just inside the vertical tangent to keep normals well conditioned.
export function conicAperture(
	requested: number,
	rx: number,
	ry: number,
	q: number,
) {
	return q > -1
		? Math.min(requested, (0.999 * Math.min(rx, ry)) / Math.sqrt(1 + q))
		: requested;
}

export function conicSag(
	x: number,
	y: number,
	rx: number,
	ry: number,
	q: number,
) {
	const root = 1 - (1 + q) * ((x / rx) ** 2 + (y / ry) ** 2);
	if (root < 0) throw new RangeError("Point outside the conic surface domain");
	return ((x * x) / rx + (y * y) / ry) / (1 + Math.sqrt(root));
}
