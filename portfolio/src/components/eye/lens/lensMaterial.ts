import * as THREE from "three";

// Clear tissue immersed in ocular fluid: the surface uses a relative index.
// Tint, roughness and the local chord below are appearance approximations;
// the educational GRIN ray tracer remains separate from this surface shader.
export function clearLensMaterial(implant = false) {
	const material = new THREE.MeshPhysicalMaterial({
		color: 0xffffff,
		metalness: 0,
		roughness: implant ? 0.025 : 0.045,
		envMapIntensity: 0.9,
		specularIntensity: 1,
		transmission: 1,
		ior: (implant ? 1.46 : 1.4) / 1.336,
		// Geometry is a unit-radius lens, scaled by each model in millimetres.
		// Three.js applies that object scale to its transmission ray.
		thickness: 2,
		attenuationColor: new THREE.Color(implant ? 0xffffff : 0xfff3d5),
		attenuationDistance: implant ? Infinity : 35,
		transparent: true,
		opacity: 1,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
	material.onBeforeCompile = (shader) => {
		shader.vertexShader =
			`varying vec2 lensRadius;\n${shader.vertexShader}`.replace(
				"#include <begin_vertex>",
				"#include <begin_vertex>\nlensRadius = position.xy;",
			);
		shader.fragmentShader =
			`varying vec2 lensRadius;\n${shader.fragmentShader}`.replace(
				"#include <transmission_fragment>",
				THREE.ShaderChunk.transmission_fragment.replace(
					"material.thickness = thickness;",
					// Smoothly shorten the optical path toward the equator. This is
					// an axial chord approximation, not a second-surface intersection.
					`material.thickness = thickness * sqrt(max(0.0, 1.0 - dot(lensRadius, lensRadius)));`,
				),
			);
	};
	material.customProgramCacheKey = () => "lens-chord-v1";
	return material;
}
