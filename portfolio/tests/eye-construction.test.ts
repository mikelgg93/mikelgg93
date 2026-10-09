import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import type { createLensScene } from "../src/components/eye/lens/lensScene";
import { createConstructionScene } from "../src/components/eye/presentation/constructionScene";
import { steps } from "../src/components/eye/presentation/steps";

test("every construction stage reuses finite geometry at timeline endpoints and midpoint", () => {
	const scene = new THREE.Scene(),
		camera = new THREE.PerspectiveCamera(35, 1.2, 0.1, 100);
	const controls = {
		target: new THREE.Vector3(),
		minDistance: 0,
		maxDistance: 100,
		update() {
			camera.lookAt(this.target);
		},
	};
	const model = createConstructionScene({
		scene,
		camera,
		controls,
	} as unknown as ReturnType<typeof createLensScene>);
	const geometries = new Set<THREE.BufferGeometry>();
	scene.traverse((object) => {
		if (object instanceof THREE.Mesh || object instanceof THREE.Line)
			geometries.add(object.geometry);
	});
	for (let step = 0; step < steps.length; step++)
		for (const progress of [0, 0.5, 1]) {
			model.update(step, progress);
			expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
			scene.traverse((object) => {
				if (!(object instanceof THREE.Mesh || object instanceof THREE.Line))
					return;
				expect(geometries.has(object.geometry)).toBe(true);
				for (const name of ["position", "normal"]) {
					const attribute = object.geometry.getAttribute(name);
					if (attribute)
						expect([...attribute.array].every(Number.isFinite)).toBe(true);
				}
			});
		}
	disposeThree(scene);
});
