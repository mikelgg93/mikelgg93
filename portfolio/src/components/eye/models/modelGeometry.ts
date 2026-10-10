import * as THREE from "three";
import { biconicSag, type EyePrescription } from "./eyeModels";

const RADIAL = 32,
	ANGULAR = 80;
export type Patch =
	| "frontCornea"
	| "backCornea"
	| "frontLens"
	| "backLens"
	| "retina";
export const PATCHES: Patch[] = [
	"frontCornea",
	"backCornea",
	"frontLens",
	"backLens",
	"retina",
];

// All views share fixed apertures: cornea 10 mm, lens 8.4 mm, posterior patch 18 mm.
// These are drawing windows, not measurements of each model's full tissue diameter.
export function patchPoint(
	eye: EyePrescription,
	patch: Patch,
	r: number,
	angle: number,
): [number, number, number] {
	const x = r * Math.cos(angle),
		y = r * Math.sin(angle);
	let depth: number;
	if (patch === "frontCornea") depth = biconicSag(x, y, eye.cornea[0]);
	else if (patch === "backCornea")
		depth = eye.cct + biconicSag(x, y, eye.cornea[1]);
	else if (patch === "retina") depth = eye.axial + biconicSag(x, y, eye.retina);
	else {
		const front = patch === "frontLens";
		depth =
			eye.cct +
			eye.acd +
			(front ? 0 : eye.lt) +
			biconicSag(x, y, eye.lens[front ? 0 : 1]);
	}
	return [x, y, -depth]; // Three.js anterior faces +z; published optical axis goes posterior.
}
export function createPatch() {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(
			new Float32Array((RADIAL + 1) * (ANGULAR + 1) * 3),
			3,
		),
	);
	const indices: number[] = [];
	for (let j = 0; j < RADIAL; j++)
		for (let i = 0; i < ANGULAR; i++) {
			const a = j * (ANGULAR + 1) + i,
				b = a + ANGULAR + 1;
			indices.push(a, b, a + 1, b, b + 1, a + 1);
		}
	geometry.setIndex(indices);
	return geometry;
}
export function updatePatch(
	geometry: THREE.BufferGeometry,
	eye: EyePrescription,
	patch: Patch,
) {
	const position = geometry.getAttribute("position") as THREE.BufferAttribute;
	const aperture = patch === "retina" ? 9 : patch.includes("Cornea") ? 5 : 4.2;
	for (let j = 0; j <= RADIAL; j++)
		for (let i = 0; i <= ANGULAR; i++) {
			const p = patchPoint(
				eye,
				patch,
				(aperture * j) / RADIAL,
				(2 * Math.PI * i) / ANGULAR,
			);
			position.setXYZ(j * (ANGULAR + 1) + i, ...p);
		}
	position.needsUpdate = true;
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
}
