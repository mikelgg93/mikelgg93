import * as THREE from "three";
import { createPosteriorEye } from "../retina/posteriorEye";
import { CANAL_ANGLE, DISC_ANGLE } from "../retina/retinaAnatomy";
import {
	createRetinalCup,
	retinalMaterial,
	updateRetinalCup,
} from "../retina/retinaGeometry";
import {
	CUP_CENTRE_Z,
	CUP_RADIUS,
	layerBounds,
	receptorMosaic,
	retinalLayers,
} from "../retina/retinaModel";

// Magnified teaching models live in separate stages, not inside the mm-scale eye.
export function createRetinaConstruction(scene: THREE.Scene) {
	const cup = new THREE.Mesh(createRetinalCup(), retinalMaterial());
	scene.add(cup);
	const posterior = createPosteriorEye();
	scene.add(posterior.group);
	const opening = new THREE.Mesh(
		new THREE.TorusGeometry(CUP_RADIUS * Math.sin(CANAL_ANGLE), 0.045, 6, 64),
		new THREE.MeshBasicMaterial({ color: 0xe5b773 }),
	);
	const axis = new THREE.Vector3(
		Math.sin(DISC_ANGLE),
		0,
		-Math.cos(DISC_ANGLE),
	);
	opening.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
	opening.position
		.copy(axis)
		.multiplyScalar(CUP_RADIUS * Math.cos(CANAL_ANGLE) - 0.03)
		.add(new THREE.Vector3(0, 0, CUP_CENTRE_Z));
	scene.add(opening);
	const layers = new THREE.Group();
	layers.name = "retina-construction-bands";
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
	return {
		update(stage: number, t: number, detail = "") {
			cup.visible = stage === 16;
			if (cup.visible) updateRetinalCup(cup.geometry, t);
			posterior.group.visible = stage === 20;
			const localView = detail === "landmarks" || detail === "canal";
			posterior.update(
				!localView,
				{
					choroid: !localView,
					sclera: !localView && (detail !== "coats" || t > 0.5),
					nerve: detail === "nerve" || detail === "landmarks" || !detail,
				},
				detail === "landmarks" || !detail,
			);
			opening.visible = stage === 20 && detail === "canal";
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
