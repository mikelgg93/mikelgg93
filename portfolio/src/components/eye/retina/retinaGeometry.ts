import * as THREE from "three";
import { cupPoint } from "./retinaModel";

export function createRetinalCup() {
	const geometry = new THREE.PlaneGeometry(1, 1, 96, 32);
	updateRetinalCup(geometry, 1);
	return geometry;
}
export function updateRetinalCup(
	geometry: THREE.BufferGeometry,
	curvature: number,
) {
	const p = geometry.getAttribute("position");
	let i = 0;
	for (let ring = 0; ring <= 32; ring++)
		for (let sector = 0; sector <= 96; sector++) {
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
