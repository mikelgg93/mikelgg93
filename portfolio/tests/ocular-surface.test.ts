import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import {
	anteriorCoatRadius,
	OUTER_LIMBUS_Z,
} from "../src/components/eye/retina/globeProfile";
import { createOcularSurface } from "../src/components/eye/retina/ocularSurface";
import { createPosteriorEye } from "../src/components/eye/retina/posteriorEye";

test("superficial vessels stay on the anterior outer coat, away from the corneal opening", () => {
	const overlay = createOcularSurface();
	overlay.traverse((o) => {
		if (!(o instanceof THREE.Mesh)) return;
		const p = o.geometry.getAttribute("position");
		for (let i = 0; i < p.count; i++) {
			const z = p.getZ(i),
				r = Math.hypot(p.getX(i), p.getY(i));
			expect(Number.isFinite(r + z)).toBe(true);
			expect(z).toBeLessThan(OUTER_LIMBUS_Z);
			expect(z).toBeGreaterThan(-6);
			expect(Math.abs(r - anteriorCoatRadius("sclera", 1, z))).toBeLessThan(
				0.08,
			);
		}
	});
	disposeThree(overlay);
});
test("outer vessels follow scleral visibility and section clipping without reallocating buffers", () => {
	const eye = createPosteriorEye(),
		overlay = eye.group.getObjectByName("superficial-ocular-vessels")!;
	expect(overlay.parent).toBe(eye.group);
	const buffers = new Set(),
		materials = new Set<THREE.Material>();
	overlay.traverse((o) => {
		if (o instanceof THREE.Mesh) {
			buffers.add(o.geometry);
			materials.add(o.material);
		}
	});
	for (const section of [false, true, false, true]) {
		eye.update(section, { sclera: true, choroid: true, nerve: true });
		overlay.traverse((o) => {
			if (o instanceof THREE.Mesh) {
				expect(buffers.has(o.geometry)).toBe(true);
				expect(o.material.clippingPlanes?.length ?? 0).toBe(section ? 1 : 0);
			}
		});
	}
	eye.update(true, { sclera: false, choroid: true, nerve: true });
	expect(overlay.visible).toBe(false);
	let disposed = 0;
	for (const material of materials)
		material.addEventListener("dispose", () => disposed++);
	disposeThree(eye.group);
	expect(disposed).toBe(materials.size);
});
