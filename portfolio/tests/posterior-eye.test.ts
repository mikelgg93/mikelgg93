import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import { createAssemblyCornea } from "../src/components/eye/lens/anteriorEyeGeometry";
import { lensShape } from "../src/components/eye/lens/lensModel";
import { createLensGeometry } from "../src/components/eye/lens/lensScene";
import {
	createPosteriorEye,
	eyeCoats,
} from "../src/components/eye/retina/posteriorEye";
import {
	biometry,
	CANAL_ANGLE,
	DISC_ANGLE,
	PIT_DEPTH,
	RetinalVesselCurve,
	retinalPoint,
	vesselPaths,
} from "../src/components/eye/retina/retinaAnatomy";
import { CUP_CENTRE_Z } from "../src/components/eye/retina/retinaModel";

test("posterior coats enclose the retina in order while leaving a real scleral canal", () => {
	const eye = createPosteriorEye();
	eye.update(false);
	eye.group.updateMatrixWorld(true);
	const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
	const whole = (name: string) =>
		eye.group.getObjectByName(name)!.children[0] as THREE.Mesh;
	const axis = new THREE.Vector3(
		Math.sin(DISC_ANGLE),
		0,
		-Math.cos(DISC_ANGLE),
	);
	const canal = new THREE.Raycaster(centre, axis);
	for (const coat of eyeCoats)
		expect(canal.intersectObject(whole(coat.key))).toHaveLength(0);
	expect(canal.intersectObject(whole("optic-nerve")).length).toBeGreaterThan(0);
	const pole = new THREE.Raycaster(centre, new THREE.Vector3(0, 0, -1));
	let previous = 0;
	for (const coat of eyeCoats) {
		const mesh = whole(coat.key);
		(mesh.material as THREE.MeshPhongMaterial).side = THREE.DoubleSide;
		const hits = pole.intersectObject(mesh);
		expect(hits.length).toBeGreaterThanOrEqual(2);
		expect(hits[0]!.distance).toBeCloseTo(
			coat.inner + (coat.key === "retina" ? PIT_DEPTH : 0),
			1,
		);
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
		for (const node of eye.group.children.filter(
			(node) => node.name !== "retinal-vessels",
		)) {
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

test("inner and outer walls have opposite outward normals and the cut faces face the removed half", () => {
	const eye = createPosteriorEye();
	const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
	for (const coat of eyeCoats) {
		const node = eye.group.getObjectByName(coat.key)!;
		for (const [half, mesh] of (node.children as THREE.Mesh[]).entries()) {
			const p = mesh.geometry.getAttribute("position"),
				n = mesh.geometry.getAttribute("normal");
			const rows = coat.key === "retina" ? 96 : 64,
				sectors = half ? 64 : 128;
			const count = (rows + 1) * (sectors + 1);
			for (let side = 0; side < 2; side++) {
				let total = 0,
					countNormals = 0;
				for (let i = side * count; i < (side + 1) * count; i++) {
					const radial = new THREE.Vector3()
						.fromBufferAttribute(p, i)
						.sub(centre);
					if (radial.z > -0.1) continue; // exclude the anteriorly deformed join
					total += radial
						.normalize()
						.dot(new THREE.Vector3().fromBufferAttribute(n, i));
					countNormals++;
				}
				expect((total / countNormals) * (side ? 1 : -1)).toBeGreaterThan(0.99);
			}
			if (half)
				for (let i = p.count - 4 * (rows + 1); i < p.count; i++)
					expect(n.getY(i)).toBeGreaterThan(0.99);
		}
	}
	disposeThree(eye.group);
});

test("the optic nerve fits the shared canal, including the scleral exit ring", () => {
	const eye = createPosteriorEye();
	const axis = new THREE.Vector3(
		Math.sin(DISC_ANGLE),
		0,
		-Math.cos(DISC_ANGLE),
	);
	const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
	const exit = eyeCoats[2].outer * Math.cos(CANAL_ANGLE);
	let canalVertices = 0,
		exitVertices = 0;
	for (const child of eye.group.getObjectByName("optic-nerve")!
		.children as THREE.Mesh[]) {
		const p = child.geometry.getAttribute("position");
		for (let i = 0; i < p.count; i++) {
			const v = new THREE.Vector3().fromBufferAttribute(p, i).sub(centre),
				distance = v.dot(axis);
			if (distance > exit + 2e-6) continue;
			const radius = Math.sqrt(Math.max(0, v.lengthSq() - distance * distance));
			expect(radius - distance * Math.tan(CANAL_ANGLE)).toBeLessThan(2e-6);
			canalVertices++;
			if (Math.abs(distance - exit) < 2e-6) exitVertices++;
		}
	}
	expect(canalVertices).toBeGreaterThan(1000);
	expect(exitVertices).toBeGreaterThan(100);
	disposeThree(eye.group);
});

test("displayed biometry matches mesh endpoints, and the real pit leaves a positive retinal wall", () => {
	const cornea = createAssemblyCornea(),
		lens = createLensGeometry();
	lens.scale(1, 1, lensShape(0).thickness / 2);
	const p = cornea.getAttribute("position"),
		poles: number[] = [];
	for (let i = 0; i < p.count; i++)
		if (Math.hypot(p.getX(i), p.getY(i)) < 1e-5) poles.push(p.getZ(i));
	lens.computeBoundingBox();
	const front = Math.max(...poles),
		back = Math.min(...poles),
		box = lens.boundingBox!;
	expect(front - back).toBeCloseTo(biometry.cct, 5);
	expect(back - box.max.z).toBeCloseTo(biometry.acd, 5);
	expect(box.max.z - box.min.z).toBeCloseTo(biometry.lt, 5);
	const eye = createPosteriorEye();
	eye.update(false);
	eye.group.updateMatrixWorld(true);
	const retina = eye.group.getObjectByName("retina")!.children[0] as THREE.Mesh;
	(retina.material as THREE.MeshPhongMaterial).side = THREE.DoubleSide;
	const hits = new THREE.Raycaster(
		new THREE.Vector3(0, 0, CUP_CENTRE_Z),
		new THREE.Vector3(0, 0, -1),
	).intersectObject(retina);
	expect(front - hits.at(-1)!.point.z).toBeCloseTo(biometry.axl, 2);
	expect(Math.abs(hits[0]!.point.z - retinalPoint(0, 0).z)).toBeLessThan(0.015);
	expect(hits.at(-1)!.distance - hits[0]!.distance).toBeGreaterThan(0.19);
	cornea.dispose();
	lens.dispose();
	disposeThree(eye.group);
});

test("major vessel curves follow the pit-bearing surface and avoid the central avascular region", () => {
	for (const path of vesselPaths()) {
		const curve = new RetinalVesselCurve(path.points, path.radius + 0.008);
		for (let i = 0; i <= 100; i++) {
			const p = curve.getPoint(i / 100),
				surface = retinalPoint(p.x, p.y);
			expect(p.toArray().every(Number.isFinite)).toBe(true);
			expect(p.z - surface.z).toBeCloseTo(path.radius + 0.008, 10);
			expect(Math.hypot(p.x, p.y) - path.radius).toBeGreaterThan(0.65);
		}
	}
});
