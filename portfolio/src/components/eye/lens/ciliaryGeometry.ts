import * as THREE from "three";
import { finiteClamp } from "./lensOptics";

// Interwoven muscle regions, separated by colour for teaching.
export const MUSCLE_REGIONS = [
	{
		name: "longitudinal",
		color: 0x995d7a,
		profile: [
			[6.65, 1.1],
			[7.1, 1.1],
			[7.1, -2.8],
			[6.65, -2.1],
			[6.65, 1.1],
		],
	},
	{
		name: "radial",
		color: 0xc58b56,
		profile: [
			[6.02, 0.9],
			[6.65, 1.1],
			[6.65, -2.1],
			[6.22, -0.8],
			[6.02, 0.9],
		],
	},
	{
		name: "circular",
		color: 0xe8a28a,
		profile: [
			[5.85, 0.85],
			[6.02, 0.9],
			[6.22, -0.8],
			[5.85, -0.25],
			[5.85, 0.85],
		],
	},
] as const;

export function ciliaryPoint(
	radius: number,
	angle: number,
	z: number,
	fraction: number,
) {
	const f = finiteClamp(fraction, 0, 1);
	// Keep the outer attachment while the inner/anterior tissue moves inward.
	const mobility = finiteClamp((7.1 - radius) / 1.1, 0, 1);
	const r = radius - 0.5 * f * mobility;
	return new THREE.Vector3(
		r * Math.cos(angle),
		r * Math.sin(angle),
		z + 0.18 * f * mobility,
	);
}

export function muscleGeometry(
	profile: readonly (readonly [number, number])[],
) {
	const positions: number[] = [],
		indices: number[] = [];
	const rows = profile.length;
	for (let j = 0; j <= 96; j++) {
		const angle = (j / 96) * Math.PI * 2;
		for (const [r, z] of profile)
			positions.push(r * Math.cos(angle), r * Math.sin(angle), z);
		if (j < 96)
			for (let k = 0; k < rows - 1; k++) {
				const a = j * rows + k,
					b = a + rows;
				indices.push(a, b, a + 1, b, b + 1, a + 1);
			}
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(positions, 3),
	);
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

export function deformCiliary(
	geometry: THREE.BufferGeometry,
	rest: Float32Array,
	fraction: number,
) {
	const attribute = geometry.getAttribute("position");
	for (let i = 0; i < attribute.count; i++) {
		const x = rest[i * 3]!,
			y = rest[i * 3 + 1]!,
			z = rest[i * 3 + 2]!;
		const p = ciliaryPoint(Math.hypot(x, y), Math.atan2(y, x), z, fraction);
		attribute.setXYZ(i, p.x, p.y, p.z);
	}
	attribute.needsUpdate = true;
	// Tracks are lines and have no index; only the solid regions need normals.
	if (geometry.index) geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
}
