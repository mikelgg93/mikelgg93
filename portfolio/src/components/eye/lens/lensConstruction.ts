import * as THREE from "three";

// Central radii and thickness from the relaxed Navarro (1985) schematic eye.
// Spherical caps and the peripheral blend below are teaching approximations,
// not that paper's aspheric optical prescription.
export const FRONT_RADIUS = 10.2;
export const BACK_RADIUS = 6;
export const EQUATOR_RADIUS = 4.5;
export const LENS_THICKNESS = 4;
const sag = (radius: number, r: number) =>
	radius - Math.sqrt(radius * radius - r * r);

export function createTeachingCap(radius: number) {
	const edgeSag = sag(radius, EQUATOR_RADIUS);
	const points = Array.from({ length: 49 }, (_, i) => {
		const r = EQUATOR_RADIUS * (1 - i / 48);
		return new THREE.Vector2(r, edgeSag - sag(radius, r));
	});
	const geometry = new THREE.LatheGeometry(points, 64);
	geometry.rotateX(Math.PI / 2);
	return geometry;
}

// Preserve the central spherical patches, then blend each into a common
// equator with a cubic Bézier whose tangent matches both adjoining surfaces.
export function roundedLensProfile() {
	const joinRadius = 3.8;
	function half(radius: number, apex: number) {
		const points = Array.from({ length: 41 }, (_, i) => {
			const r = (joinRadius * i) / 40;
			return new THREE.Vector2(r, apex - sag(radius, r));
		});
		const start = points.at(-1)!;
		const slope = -joinRadius / Math.sqrt(radius ** 2 - joinRadius ** 2);
		const blend = new THREE.CubicBezierCurve(
			start,
			new THREE.Vector2(joinRadius + 0.45, start.y + 0.45 * slope),
			new THREE.Vector2(EQUATOR_RADIUS, 0.4),
			new THREE.Vector2(EQUATOR_RADIUS, 0),
		);
		return [...points, ...blend.getPoints(24).slice(1)];
	}
	// The 1.7/2.3 mm split and blend handles are visual parameters.
	const back = half(BACK_RADIUS, 2.3).map((p) => new THREE.Vector2(p.x, -p.y));
	const front = half(FRONT_RADIUS, 1.7).reverse();
	return [...back, ...front.slice(1)];
}

export function createRoundedLensGeometry() {
	const geometry = new THREE.LatheGeometry(
		roundedLensProfile().map(
			(p) =>
				new THREE.Vector2(p.x / EQUATOR_RADIUS, p.y / (LENS_THICKNESS / 2)),
		),
		96,
	);
	geometry.rotateX(Math.PI / 2);
	return geometry;
}
