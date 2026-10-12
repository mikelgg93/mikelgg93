import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import {
	createAssemblyCornea,
	createAssemblyIris,
	updateAssemblyIris,
} from "../src/components/eye/lens/anteriorEyeGeometry";
import { createCiliaryApparatus } from "../src/components/eye/lens/ciliaryApparatus";
import { createIntraocularLens } from "../src/components/eye/lens/intraocularLens";
import { lensShape } from "../src/components/eye/lens/lensModel";

test("assembly iris leaves the requested opening throughout the pupil range", () => {
	const geometry = createAssemblyIris();
	for (const diameter of [2, 4, 8]) {
		updateAssemblyIris(geometry, diameter);
		const p = geometry.getAttribute("position");
		const radii = Array.from({ length: p.count }, (_, i) =>
			Math.hypot(p.getX(i), p.getY(i)),
		);
		expect(Math.min(...radii)).toBeCloseTo(diameter / 2, 5);
		expect(Math.max(...radii)).toBeCloseTo(5.6, 5);
		expect(
			[...geometry.getAttribute("normal").array].every(Number.isFinite),
		).toBe(true);
	}
	geometry.dispose();
	const cornea = createAssemblyCornea();
	expect(
		[...cornea.getAttribute("position").array].every(Number.isFinite),
	).toBe(true);
	cornea.dispose();
});

test("tissue controls reuse geometry and dispose instanced process buffers", () => {
	const apparatus = createCiliaryApparatus();
	const geometries = new Set<THREE.BufferGeometry>();
	let instanceDisposals = 0;
	apparatus.group.traverse((object) => {
		if (object instanceof THREE.Mesh || object instanceof THREE.Line)
			geometries.add(object.geometry);
		if (object instanceof THREE.InstancedMesh)
			object.addEventListener("dispose", () => instanceDisposals++);
	});
	for (const value of [0, 8, 0])
		for (const cutaway of [false, true])
			for (const map of [false, true]) {
				apparatus.update(value, cutaway, map);
				apparatus.group.traverse((object) => {
					if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
						expect(geometries.has(object.geometry)).toBe(true);
						expect(
							[...object.geometry.getAttribute("position").array].every(
								Number.isFinite,
							),
						).toBe(true);
					}
				});
			}
	disposeThree(apparatus.group);
	expect(instanceDisposals).toBe(1);
});

test("rendered muscle and process surfaces stay outside the lens at accommodation endpoints", () => {
	const apparatus = createCiliaryApparatus();
	const matrix = new THREE.Matrix4(),
		point = new THREE.Vector3();
	// Test the generated tissue and all 56 process meshes, not a nominal ring radius.
	for (const value of [0, 2, 4, 6, 8]) {
		apparatus.update(value, false, false);
		const lensRadius = lensShape(value).lensRadius;
		for (const object of apparatus.support.children) {
			if (!(object instanceof THREE.Mesh)) continue;
			const p = object.geometry.getAttribute("position");
			let minimumRadius = Infinity;
			const count = object instanceof THREE.InstancedMesh ? object.count : 1;
			for (let instance = 0; instance < count; instance++) {
				if (object instanceof THREE.InstancedMesh)
					object.getMatrixAt(instance, matrix);
				else matrix.identity();
				for (let i = 0; i < p.count; i++) {
					point.fromBufferAttribute(p, i).applyMatrix4(matrix);
					minimumRadius = Math.min(minimumRadius, Math.hypot(point.x, point.y));
				}
			}
			expect(minimumRadius).toBeGreaterThan(lensRadius);
		}
	}
	disposeThree(apparatus.group);
});

test("generic IOL optic and haptics fit within the illustrative retained bag", () => {
	const { group, setSection } = createIntraocularLens();
	group.updateMatrixWorld(true);
	const point = new THREE.Vector3();
	group.traverse((object) => {
		if (!(object instanceof THREE.Mesh)) return;
		const p = object.geometry.getAttribute("position");
		for (let i = 0; i < p.count; i++) {
			point.fromBufferAttribute(p, i).applyMatrix4(object.matrixWorld);
			expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true);
			const zRadius = 1.8 * (point.z > 0 ? 0.85 : 1.15);
			expect(
				(point.x ** 2 + point.y ** 2) / 4.6 ** 2 + point.z ** 2 / zRadius ** 2,
			).toBeLessThanOrEqual(1.00001);
		}
	});
	for (const cut of [true, false]) {
		setSection(cut);
		group.traverse((object) => {
			if (object instanceof THREE.Mesh || object instanceof THREE.Line)
				expect((object.material as THREE.Material).clippingPlanes?.length).toBe(
					cut ? 1 : 0,
				);
		});
	}
	disposeThree(group);
});
