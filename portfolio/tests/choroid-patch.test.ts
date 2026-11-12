import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import { createChoroidPatch } from "../src/components/eye/retina/choroidPatch";

test("vascular patch reuses finite geometry across detail and tessellated views", () => {
	const patch = createChoroidPatch();
	const geometries = new Set<THREE.BufferGeometry>();
	const materials = new Set<THREE.Material>();
	let disposed = 0;
	patch.group.traverse((o) => {
		if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
		geometries.add(o.geometry);
		for (const value of o.geometry.getAttribute("position").array)
			expect(Number.isFinite(value)).toBe(true);
		const material = o.material as THREE.Material;
		materials.add(material);
	});
	for (const geometry of geometries)
		geometry.addEventListener("dispose", () => disposed++);
	const count = patch.group.children.length;
	for (const mode of [false, true, false, true]) {
		patch.update(mode);
		expect(patch.group.children.length).toBe(count);
		patch.group.traverse((o) => {
			if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments)
				expect(geometries.has(o.geometry)).toBe(true);
		});
	}
	disposeThree(patch.group);
	expect(disposed).toBe(geometries.size);
	expect(materials.size).toBeLessThan(8);
});
