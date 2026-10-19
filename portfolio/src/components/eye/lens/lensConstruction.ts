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

// Sparse latitude/meridian lines expose the construction without triangle clutter.
export function createConstructionGrid(profile: THREE.Vector2[]) {
	const points: number[] = [];
	const point = (p: THREE.Vector2, angle: number) => {
		points.push(p.x * Math.cos(angle), p.x * Math.sin(angle), p.y);
	};
	for (let ring = 1; ring <= 8; ring++) {
		const p = profile[Math.round(((profile.length - 1) * ring) / 9)]!;
		for (let j = 0; j < 64; j++) {
			point(p, (j * Math.PI) / 32);
			point(p, ((j + 1) * Math.PI) / 32);
		}
	}
	for (let meridian = 0; meridian < 16; meridian++) {
		const angle = (meridian * Math.PI) / 8;
		for (let j = 1; j < profile.length; j++) {
			point(profile[j - 1]!, angle);
			point(profile[j]!, angle);
		}
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(points, 3),
	);
	const grid = new THREE.LineSegments(
		geometry,
		new THREE.LineBasicMaterial({
			color: 0xc4f9f4,
			transparent: true,
			opacity: 0.48,
			depthWrite: false,
		}),
	);
	grid.scale.setScalar(1.001);
	return grid;
}

export function domeSeparation(seconds: number) {
	// Start joined; pause at each end so the seam and the two caps can be inspected.
	const t = ((seconds % 10) + 10) % 10;
	const smooth = (x: number) => x * x * (3 - 2 * x);
	if (t < 2) return 0;
	if (t < 4) return 1.25 * smooth((t - 2) / 2);
	if (t < 6) return 1.25;
	if (t < 8) return 1.25 * (1 - smooth((t - 6) / 2));
	return 0;
}
