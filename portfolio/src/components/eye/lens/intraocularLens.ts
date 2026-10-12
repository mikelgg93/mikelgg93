import * as THREE from "three";
import { clearLensMaterial } from "./lensMaterial";
import { createLensGeometry } from "./lensScene";

// Generic posterior-chamber IOL in a retained bag. Dimensions and haptic curves
// illustrate placement, not a manufacturer's design or a surgical prescription.
export function createIntraocularLens() {
	const group = new THREE.Group();
	const optic = new THREE.Mesh(createLensGeometry(), clearLensMaterial(true));
	optic.scale.set(3, 3, 0.48);
	group.add(optic);
	const plastic = new THREE.MeshPhysicalMaterial({
		color: 0xf4f1df,
		roughness: 0.18,
		transparent: true,
		opacity: 0.75,
	});
	for (const side of [-1, 1]) {
		const path = new THREE.CatmullRomCurve3(
			[
				[2.85, -0.2, 0],
				[3.7, -1, 0],
				[4.2, -0.2, 0],
				[3.8, 2.1, 0],
				[2.3, 3.8, 0],
				[1, 4.33, 0],
			].map(([x, y, z]) => new THREE.Vector3(x! * side, y! * side, z!)),
		);
		group.add(
			new THREE.Mesh(
				new THREE.TubeGeometry(path, 48, 0.065, 8, false),
				plastic,
			),
		);
	}
	// Leave an anterior opening in the retained capsule; no natural lens remains.
	const opening = Math.asin(2.6 / 4.6);
	const bagGeometry = new THREE.SphereGeometry(
		1,
		64,
		32,
		0,
		Math.PI * 2,
		opening,
		Math.PI - opening,
	);
	bagGeometry.rotateX(Math.PI / 2);
	const positions = bagGeometry.getAttribute("position");
	for (let i = 0; i < positions.count; i++)
		positions.setZ(
			i,
			positions.getZ(i) * (positions.getZ(i) > 0 ? 0.85 : 1.15),
		);
	bagGeometry.computeVertexNormals();
	const bagMaterial = new THREE.MeshPhongMaterial({
		color: 0xe8dcaf,
		transparent: true,
		opacity: 0.11,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
	const bag = new THREE.Mesh(bagGeometry, bagMaterial);
	bag.scale.set(4.6, 4.6, 1.8);
	group.add(bag);
	const edge = new THREE.LineLoop(
		new THREE.BufferGeometry().setFromPoints(
			Array.from(
				{ length: 128 },
				(_, i) =>
					new THREE.Vector3(
						2.6 * Math.cos((i * Math.PI) / 64),
						2.6 * Math.sin((i * Math.PI) / 64),
						1.8 * 0.85 * Math.cos(opening),
					),
			),
		),
		new THREE.LineBasicMaterial({
			color: 0xd8c699,
			transparent: true,
			opacity: 0.55,
		}),
	);
	group.add(edge);
	const materials = [optic.material, plastic, bagMaterial, edge.material];
	const plane = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
	let previous: boolean | undefined;
	return {
		group,
		setSection(section: boolean) {
			if (section === previous) return;
			for (const m of materials) {
				m.clippingPlanes = section ? plane : [];
				m.needsUpdate = true;
			}
			previous = section;
		},
	};
}
