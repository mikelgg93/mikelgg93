import * as THREE from "three";

// Clear, nonmetallic tissue in fluid: use a relative index at this boundary.
// Roughness, thickness and tint are rendering choices, not a spectral GRIN model.
export function clearLensMaterial(implant = false) {
	return new THREE.MeshPhysicalMaterial({
		color: implant ? 0xffffff : 0xfffdf1,
		metalness: 0,
		roughness: 0.055,
		transmission: 0.96,
		ior: (implant ? 1.46 : 1.4) / 1.336,
		thickness: implant ? 0.65 : 2.5,
		attenuationColor: new THREE.Color(implant ? 0xffffff : 0xfff4d6),
		attenuationDistance: 55,
		transparent: true,
		opacity: 1,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
}
