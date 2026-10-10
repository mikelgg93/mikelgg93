import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import {
	createPosteriorEye,
	eyeCoats,
} from "../src/components/eye/retina/posteriorEye";
import { CUP_CENTRE_Z } from "../src/components/eye/retina/retinaModel";

test("posterior coats enclose the retina in order while leaving a real scleral canal", () => {
	const eye = createPosteriorEye();
	eye.update(false);
	eye.group.updateMatrixWorld(true);
	const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
	const whole = (name: string) =>
		eye.group.getObjectByName(name)!.children[0] as THREE.Mesh;
	const axis = new THREE.Vector3(Math.sin(0.3), 0, -Math.cos(0.3));
	const canal = new THREE.Raycaster(centre, axis);
	for (const coat of eyeCoats)
		expect(canal.intersectObject(whole(coat.key))).toHaveLength(0);
	expect(canal.intersectObject(whole("optic-nerve")).length).toBeGreaterThan(0);
	const pole = new THREE.Raycaster(centre, new THREE.Vector3(0, 0, -1));
	let previous = 0;
	for (const coat of eyeCoats) {
		const hits = pole.intersectObject(whole(coat.key));
		expect(hits.length).toBeGreaterThanOrEqual(2);
		expect(hits[0]!.distance).toBeCloseTo(coat.inner, 1);
		expect(hits.at(-1)!.distance).toBeCloseTo(coat.outer, 1);
		expect(hits[0]!.distance).toBeGreaterThanOrEqual(previous - 0.02);
		previous = hits.at(-1)!.distance;
	}
	disposeThree(eye.group);
});

test("closed and sectioned anatomy reuse finite geometry and dispose hidden views", () => {
	const eye = createPosteriorEye();
	const geometries = new Set<THREE.BufferGeometry>();
	let disposals = 0;
	eye.group.traverse((o) => {
		if (!(o instanceof THREE.Mesh)) return;
		geometries.add(o.geometry);
		o.geometry.addEventListener("dispose", () => disposals++);
		for (const name of ["position", "normal"])
			expect(
				[...o.geometry.getAttribute(name).array].every(Number.isFinite),
			).toBe(true);
		const p = o.geometry.getAttribute("position");
		expect(
			[...o.geometry.index!.array].every((i) => i >= 0 && i < p.count),
		).toBe(true);
	});
	for (const section of [true, false, true]) {
		eye.update(section, { choroid: false, sclera: false, nerve: false });
		expect(eye.group.getObjectByName("retina")!.visible).toBe(true);
		for (const name of ["choroid", "sclera", "optic-nerve", "nerve-sheath"])
			expect(eye.group.getObjectByName(name)!.visible).toBe(false);
		eye.update(section);
		for (const node of eye.group.children) {
			expect(node.visible).toBe(true);
			expect(node.children[0]!.visible).toBe(!section);
			expect(node.children[1]!.visible).toBe(section);
			for (const mesh of node.children as THREE.Mesh[])
				expect(geometries.has(mesh.geometry)).toBe(true);
			const p = (node.children[1] as THREE.Mesh).geometry.getAttribute(
				"position",
			);
			for (let i = 0; i < p.count; i++)
				expect(p.getY(i)).toBeLessThanOrEqual(1e-6);
		}
	}
	disposeThree(eye.group);
	expect(disposals).toBe(geometries.size);
});
