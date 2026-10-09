import * as THREE from "three";

// These demos own their geometry and materials, sometimes shared by wireframes.
// Textures/render targets have separate owners and are disposed by those owners.
export function disposeThree(root: THREE.Object3D) {
	const geometries = new Set<THREE.BufferGeometry>();
	const materials = new Set<THREE.Material>();
	root.traverse((object) => {
		if (object instanceof THREE.InstancedMesh) object.dispose();
		if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
			geometries.add(object.geometry);
			for (const material of [object.material].flat()) materials.add(material);
		}
	});
	for (const geometry of geometries) geometry.dispose();
	for (const material of materials) material.dispose();
}
