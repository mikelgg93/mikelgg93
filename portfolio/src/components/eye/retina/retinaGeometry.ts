import * as THREE from "three";
import { cupPoint } from "./retinaModel";

export function createRetinalCup() {
	// One shared pole and a wrapped angular seam avoid collapsed triangles
	// and duplicate seam normals as the disc bends into a cup.
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(new Float32Array((1 + 32 * 96) * 3), 3),
	);
	const indices: number[] = [];
	for (let sector = 0; sector < 96; sector++) {
		indices.push(0, 1 + sector, 1 + ((sector + 1) % 96));
		for (let ring = 1; ring < 32; ring++) {
			const a = 1 + (ring - 1) * 96 + sector;
			const b = 1 + (ring - 1) * 96 + ((sector + 1) % 96);
			indices.push(a, a + 96, b, a + 96, b + 96, b);
		}
	}
	geometry.setIndex(indices);
	updateRetinalCup(geometry, 1);
	return geometry;
}
export function updateRetinalCup(
	geometry: THREE.BufferGeometry,
	curvature: number,
) {
	const p = geometry.getAttribute("position");
	p.setXYZ(0, ...cupPoint(0, 0, curvature));
	let i = 1;
	for (let ring = 1; ring <= 32; ring++)
		for (let sector = 0; sector < 96; sector++) {
			p.setXYZ(i++, ...cupPoint(ring / 32, (sector * Math.PI) / 48, curvature));
		}
	p.needsUpdate = true;
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
}
export function retinalMaterial() {
	return new THREE.MeshPhongMaterial({
		color: 0xaa655c,
		side: THREE.DoubleSide,
		shininess: 16,
		specular: 0x614946,
	});
}
