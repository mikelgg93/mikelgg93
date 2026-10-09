import * as THREE from "three";
import {
	createRetinalCup,
	retinalMaterial,
	updateRetinalCup,
} from "../retina/retinaGeometry";
import {
	layerBounds,
	receptorMosaic,
	retinalLayers,
} from "../retina/retinaModel";

// Magnified teaching models live in separate stages, not inside the mm-scale eye.
export function createRetinaConstruction(scene: THREE.Scene) {
	const cup = new THREE.Mesh(createRetinalCup(), retinalMaterial());
	scene.add(cup);
	const section = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
	const layers = new THREE.Group();
	scene.add(layers);
	const bands = retinalLayers.map((layer) => {
		const geometry = new THREE.BoxGeometry(10, 3, 1, 64, 1, 1);
		const original = new Float32Array(geometry.getAttribute("position").array);
		const originalIndex = geometry.index!.array.slice();
		const thickness = new Float32Array(original.length / 3);
		const mesh = new THREE.Mesh(
			geometry,
			new THREE.MeshPhongMaterial({
				color: layer.color,
				side: THREE.DoubleSide,
			}),
		);
		layers.add(mesh);
		return { geometry, original, originalIndex, thickness, mesh };
	});
	const points = receptorMosaic(true).cones;
	const cells = new THREE.InstancedMesh(
		new THREE.CylinderGeometry(0.07, 0.15, 1, 10),
		new THREE.MeshPhongMaterial({ color: 0xe5b773 }),
		points.length,
	);
	scene.add(cells);
	const transform = new THREE.Object3D();
	let previousSection = false;
	return {
		update(stage: number, t: number) {
			cup.visible = stage === 16 || stage === 20;
			if (cup.visible) updateRetinalCup(cup.geometry, stage === 16 ? t : 1);
			const cut = stage === 20;
			if (cut !== previousSection) {
				cup.material.clippingPlanes = cut ? section : [];
				cup.material.needsUpdate = true;
				previousSection = cut;
			}
			layers.visible = stage === 17 || stage === 18;
			if (layers.visible)
				for (let i = 0; i < bands.length; i++) {
					const { geometry, original, originalIndex, thickness, mesh } =
						bands[i]!;
					const p = geometry.getAttribute("position");
					for (let j = 0; j < p.count; j++) {
						const x = original[j * 3]!,
							y = original[j * 3 + 1]!,
							upper = original[j * 3 + 2]! > 0;
						const flat = layerBounds(x / 5, false, false)[i]!,
							pit = layerBounds(x / 5, true, false)[i]!;
						const depth = THREE.MathUtils.lerp(
							upper ? flat.top : flat.bottom,
							upper ? pit.top : pit.bottom,
							stage === 18 ? t : 0,
						);
						thickness[j] = THREE.MathUtils.lerp(
							flat.bottom - flat.top,
							pit.bottom - pit.top,
							stage === 18 ? t : 0,
						);
						p.setXYZ(j, x, y, (200 - depth) / 50);
					}
					// Omit collapsed inner-band faces to avoid coincident surfaces at
					// the pit. This small drawing tolerance is not a tissue boundary.
					const index = geometry.index!;
					let count = 0;
					for (let j = 0; j < originalIndex.length; j += 3) {
						const a = originalIndex[j]!,
							b = originalIndex[j + 1]!,
							c = originalIndex[j + 2]!;
						if (
							i < 4 &&
							Math.max(thickness[a]!, thickness[b]!, thickness[c]!) <= 0.4
						)
							continue;
						index.setX(count++, a);
						index.setX(count++, b);
						index.setX(count++, c);
					}
					index.array.fill(0, count);
					index.needsUpdate = true;
					geometry.setDrawRange(0, count);
					p.needsUpdate = true;
					geometry.computeVertexNormals();
					geometry.computeBoundingSphere();
					mesh.position.z = stage === 17 ? (6 - i) * 0.35 * t : 0;
				}
			cells.visible = stage === 19;
			if (cells.visible) {
				points.forEach((p, i) => {
					transform.position.set(p.x, p.y, 0);
					transform.rotation.set(Math.PI / 2, 0, 0);
					transform.scale.set(1, THREE.MathUtils.lerp(0.05, 1.8, t), 1);
					transform.updateMatrix();
					cells.setMatrixAt(i, transform.matrix);
				});
				cells.instanceMatrix.needsUpdate = true;
				cells.computeBoundingSphere();
			}
		},
	};
}
