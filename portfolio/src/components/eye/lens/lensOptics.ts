export const DOME_APERTURE = 4.5; // mm; illustrative geometry
export const GRIN_AXIAL_RADIUS = 2; // mm
export const GRIN_EQUATORIAL_RADIUS = 4.5; // mm
export const GRIN_EDGE_INDEX = 1.37;
export const SURROUNDING_INDEX = 1.336;

export function finiteClamp(value: number, min: number, max: number) {
	return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

// Height above the shared rim, using a stable difference of square roots.
export function capHeight(radius: number, radialDistance: number) {
	const R = finiteClamp(radius, 6, 14);
	const r = finiteClamp(radialDistance, 0, DOME_APERTURE);
	return (
		(DOME_APERTURE ** 2 - r ** 2) /
		(Math.sqrt(R ** 2 - r ** 2) + Math.sqrt(R ** 2 - DOME_APERTURE ** 2))
	);
}

export type RayPoint = { x: number; y: number };
function unit(v: RayPoint): RayPoint {
	const length = Math.hypot(v.x, v.y);
	return { x: v.x / length, y: v.y / length };
}
function ellipse(p: RayPoint) {
	return (p.x / GRIN_AXIAL_RADIUS) ** 2 + (p.y / GRIN_EQUATORIAL_RADIUS) ** 2;
}
function normal(p: RayPoint) {
	return unit({
		x: p.x / GRIN_AXIAL_RADIUS ** 2,
		y: p.y / GRIN_EQUATORIAL_RADIUS ** 2,
	});
}
function refract(
	direction: RayPoint,
	facingNormal: RayPoint,
	from: number,
	to: number,
): RayPoint | null {
	const eta = from / to;
	const cosine = -(direction.x * facingNormal.x + direction.y * facingNormal.y);
	const k = 1 - eta ** 2 * (1 - cosine ** 2);
	if (k < 0) return null;
	const factor = eta * cosine - Math.sqrt(k);
	return unit({
		x: eta * direction.x + factor * facingNormal.x,
		y: eta * direction.y + factor * facingNormal.y,
	});
}

// A deliberately simple quadratic GRIN, not an age- or subject-fitted profile.
export function grinIndex(x: number, y: number, gradient: number) {
	const delta = finiteClamp(gradient, 0, 0.06);
	return GRIN_EDGE_INDEX + delta * Math.max(0, 1 - ellipse({ x, y }));
}

// Integrate d(n t)/ds = grad(n), with Snell refraction at each surface.
// Coordinates and the integration step are in millimetres. This is an isolated
// monochromatic 2D lens, not a complete eye or a retinal-image simulation.
export function traceGrinRay(height: number, gradient: number, step = 0.02) {
	const y = finiteClamp(height, -3.2, 3.2);
	const delta = finiteClamp(gradient, 0, 0.06);
	const ds = finiteClamp(step, 0.005, 0.05);
	let p = {
		x: -GRIN_AXIAL_RADIUS * Math.sqrt(1 - (y / GRIN_EQUATORIAL_RADIUS) ** 2),
		y,
	};
	let t = refract(
		{ x: 1, y: 0 },
		normal(p),
		SURROUNDING_INDEX,
		GRIN_EDGE_INDEX,
	)!;
	const points: RayPoint[] = [{ x: -4.8, y }, { ...p }];
	function bend(position: RayPoint, direction: RayPoint) {
		const n = grinIndex(position.x, position.y, delta);
		const gradientX = (-2 * delta * position.x) / GRIN_AXIAL_RADIUS ** 2;
		const gradientY = (-2 * delta * position.y) / GRIN_EQUATORIAL_RADIUS ** 2;
		const along = gradientX * direction.x + gradientY * direction.y;
		return {
			x: (gradientX - direction.x * along) / n,
			y: (gradientY - direction.y * along) / n,
		};
	}
	for (let i = 0; i < 2000; i++) {
		const b = bend(p, t);
		const middle = { x: p.x + (t.x * ds) / 2, y: p.y + (t.y * ds) / 2 };
		const middleT = unit({ x: t.x + (b.x * ds) / 2, y: t.y + (b.y * ds) / 2 });
		const middleB = bend(middle, middleT);
		const next = { x: p.x + middleT.x * ds, y: p.y + middleT.y * ds };
		const nextT = unit({ x: t.x + middleB.x * ds, y: t.y + middleB.y * ds });
		if (ellipse(next) >= 1 && i > 0) {
			let lo = 0,
				hi = 1;
			for (let j = 0; j < 30; j++) {
				const f = (lo + hi) / 2;
				if (
					ellipse({
						x: p.x + f * (next.x - p.x),
						y: p.y + f * (next.y - p.y),
					}) < 1
				)
					lo = f;
				else hi = f;
			}
			const f = (lo + hi) / 2;
			p = { x: p.x + f * (next.x - p.x), y: p.y + f * (next.y - p.y) };
			t = unit({ x: t.x + f * (nextT.x - t.x), y: t.y + f * (nextT.y - t.y) });
			points.push(p);
			const outward = normal(p);
			const exit = refract(
				t,
				{ x: -outward.x, y: -outward.y },
				GRIN_EDGE_INDEX,
				SURROUNDING_INDEX,
			);
			if (exit && exit.x > 0)
				points.push({ x: 7, y: p.y + ((7 - p.x) * exit.y) / exit.x });
			return { points, exit, complete: exit !== null };
		}
		p = next;
		t = nextT;
		points.push(p);
	}
	return { points, exit: null, complete: false };
}
