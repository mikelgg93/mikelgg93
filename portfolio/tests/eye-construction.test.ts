import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import type { createLensScene } from "../src/components/eye/lens/lensScene";
import { createConstructionScene } from "../src/components/eye/presentation/constructionScene";
import { createRetinaConstruction } from "../src/components/eye/presentation/retinaConstruction";
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
			model.update(steps[step]!.stage, progress, steps[step]!.detail);
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

test("the foveal slide omits collapsed faces and restores flat bands without replacing indices", () => {
	const scene = new THREE.Scene();
	const model = createRetinaConstruction(scene);
	const layers = scene.children.find(
		(object) => object instanceof THREE.Group,
	)!;
	const bands = layers.children as THREE.Mesh<THREE.BoxGeometry>[];
	const indices = bands.map((band) => band.geometry.index);
	model.update(18, 1);
	for (let i = 0; i < bands.length; i++) {
		const geometry = bands[i]!.geometry;
		expect(geometry.index).toBe(indices[i]!);
		if (i < 4) expect(geometry.drawRange.count).toBeLessThan(indices[i]!.count);
		else expect(geometry.drawRange.count).toBe(indices[i]!.count);
		expect(geometry.drawRange.count % 3).toBe(0);
	}
	model.update(17, 0);
	for (let i = 0; i < bands.length; i++) {
		expect(bands[i]!.geometry.index).toBe(indices[i]!);
		expect(bands[i]!.geometry.drawRange.count).toBe(indices[i]!.count);
	}
	disposeThree(scene);
});
