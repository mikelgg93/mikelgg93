import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import {
	createExtraocularMuscles,
	createMotilityEye,
	insertion,
	MUSCLE_SECTORS,
	MUSCLE_SEGMENTS,
	TROCHLEA,
} from "../src/components/eye/motility/motilityGeometry";
import {
	animatedGaze,
	gazePose,
	muscles,
} from "../src/components/eye/motility/motilityModel";
import { CUP_CENTRE_Z } from "../src/components/eye/retina/retinaModel";

test("gaze poses align the forward axis and use unit rotations in the primary plane", () => {
	for (const h of [-20, -15, 0, 15, 20])
		for (const v of [-20, -15, 0, 15, 20]) {
			const q = gazePose(h, v),
				hr = THREE.MathUtils.degToRad(h),
				vr = THREE.MathUtils.degToRad(v);
			expect(q.length()).toBeCloseTo(1, 12);
			expect(q.z).toBeCloseTo(0, 12);
			const actual = new THREE.Vector3(0, 0, 1).applyQuaternion(q),
				target = new THREE.Vector3(
					Math.sin(hr) * Math.cos(vr),
					Math.sin(vr),
					Math.cos(hr) * Math.cos(vr),
				);
			expect(actual.distanceTo(target)).toBeLessThan(1e-12);
			const a = new THREE.Vector3(3, 4, -5),
				b = new THREE.Vector3(-4, 2, 1);
			expect(
				a.clone().applyQuaternion(q).distanceTo(b.clone().applyQuaternion(q)),
			).toBeCloseTo(a.distanceTo(b), 12);
		}
	for (const value of [NaN, Infinity, -999, 999])
		expect(gazePose(value, value).toArray().every(Number.isFinite)).toBe(true);
});
test("the prescribed sequence remains continuous around cycle boundaries", () => {
	for (let i = 1; i <= 18; i++) {
		const a = animatedGaze(i * 3 - 1e-6),
			b = animatedGaze(i * 3 + 1e-6);
		expect(Math.hypot(a.h - b.h, a.v - b.v)).toBeLessThan(1e-4);
	}
	expect(animatedGaze(NaN).h).toBe(0);
});
test("six distinct muscles retain finite buffers and their insertions follow the globe", () => {
	expect(insertion("MR").z).toBeGreaterThan(insertion("IR").z);
	expect(insertion("IR").z).toBeGreaterThan(insertion("LR").z);
	expect(insertion("LR").z).toBeGreaterThan(insertion("SR").z);
	const apparatus = createExtraocularMuscles(),
		geometries = new Set<THREE.BufferGeometry>();
	let disposals = 0;
	apparatus.group.traverse((o) => {
		if (o instanceof THREE.Mesh) {
			geometries.add(o.geometry);
			o.geometry.addEventListener("dispose", () => disposals++);
		}
	});
	const bodies = apparatus.group.children.filter(
		(o) => o instanceof THREE.Mesh && o.geometry.getAttribute("color"),
	) as THREE.Mesh[];
	const ringCentre = (mesh: THREE.Mesh, ring: number) => {
		const positions = mesh.geometry.getAttribute("position"),
			result = new THREE.Vector3();
		for (let j = 0; j < MUSCLE_SECTORS; j++)
			result.add(
				new THREE.Vector3().fromBufferAttribute(
					positions,
					ring * (MUSCLE_SECTORS + 1) + j,
				),
			);
		return result.divideScalar(MUSCLE_SECTORS);
	};
	const origins = bodies.map((mesh) => ringCentre(mesh, 0));
	expect(bodies.length).toBe(6);
	expect(new Set(muscles.map((m) => m.id)).size).toBe(6);
	const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
	for (const [h, v] of [
		[0, 0],
		[15, 15],
		[-15, 15],
		[15, -15],
		[-15, -15],
	]) {
		const q = gazePose(h!, v!);
		apparatus.update(q, "SO");
		bodies.forEach((mesh, index) => {
			expect(geometries.has(mesh.geometry)).toBe(true);
			expect(ringCentre(mesh, 0).distanceTo(origins[index]!)).toBeLessThan(
				2e-6,
			);
			if (muscles[index]!.id === "SO")
				expect(
					ringCentre(mesh, MUSCLE_SEGMENTS / 2).distanceTo(TROCHLEA),
				).toBeLessThan(2e-6);
			const p = mesh.geometry.getAttribute("position"),
				average = new THREE.Vector3();
			for (const number of p.array) expect(Number.isFinite(number)).toBe(true);
			average.fromBufferAttribute(p, p.count - 1);
			const expected = insertion(muscles[index]!.id)
				.sub(centre)
				.applyQuaternion(q)
				.add(centre);
			expect(average.distanceTo(expected)).toBeLessThan(2e-6);
		});
	}
	for (const m of muscles)
		expect(insertion(m.id).z > CUP_CENTRE_Z).toBe(
			["MR", "LR", "SR", "IR"].includes(m.id),
		);
	disposeThree(apparatus.group);
	expect(disposals).toBe(geometries.size);
});

test("the rigid motility globe omits the orbital nerve segment while retaining its coats", () => {
	const eye = createMotilityEye();
	for (const name of ["retina", "choroid", "sclera"])
		expect(eye.getObjectByName(name)!.visible).toBe(true);
	for (const name of ["optic-nerve", "nerve-sheath"])
		expect(eye.getObjectByName(name)!.visible).toBe(false);
	expect(eye.position.z).toBe(-CUP_CENTRE_Z);
	disposeThree(eye);
});
