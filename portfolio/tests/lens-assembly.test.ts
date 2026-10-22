import { expect, test } from "bun:test";
import * as THREE from "three";
import { disposeThree } from "../src/components/eye/disposeThree";
import {
	createAssemblyCornea,
	createAssemblyIris,
	createAssemblySclera,
	updateAssemblyIris,
} from "../src/components/eye/lens/anteriorEyeGeometry";
import { ciliaryInnerRadius } from "../src/components/eye/lens/anteriorSegmentProfile";
import { createCiliaryApparatus } from "../src/components/eye/lens/ciliaryApparatus";
import { ciliaryPoint } from "../src/components/eye/lens/ciliaryGeometry";
import { createIntraocularLens } from "../src/components/eye/lens/intraocularLens";
import {
	createRoundedLensGeometry,
	lensSurfaceZ,
} from "../src/components/eye/lens/lensConstruction";
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
		expect(Math.max(...radii)).toBeCloseTo(6, 5);
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

test("cornea and sclera share both limbal boundaries", () => {
	const cornea = createAssemblyCornea(),
		sclera = createAssemblySclera();
	const edge = cornea.parameters.points.filter(
		(p) => Math.abs(p.x - 5.8) < 1e-6,
	);
	expect(edge.length).toBe(2);
	for (const p of edge)
		expect(sclera.parameters.points.some((q) => q.distanceTo(p) < 1e-6)).toBe(
			true,
		);
	cornea.dispose();
	sclera.dispose();
});

test("iris root stays attached and iris clears the lens across pupil and accommodation ranges", () => {
	const iris = createAssemblyIris();
	for (const accommodation of [0, 4, 8])
		for (const pupil of [2, 4, 8]) {
			updateAssemblyIris(iris, pupil, accommodation);
			const shape = lensShape(accommodation),
				p = iris.getAttribute("position");
			for (let i = 0; i < p.count; i++) {
				const r = Math.hypot(p.getX(i), p.getY(i));
				if (Math.abs(r - 6) < 1e-5) expect(p.getZ(i)).toBeCloseTo(1.3, 5);
				if (r <= shape.lensRadius) {
					const surface =
						(shape.thickness / 2) * lensSurfaceZ(r / shape.lensRadius);
					expect(p.getZ(i)).toBeGreaterThan(surface);
				}
			}
		}
	iris.dispose();
});

test("iris insertion in the ciliary body remains fixed during accommodation", () => {
	const apparatus = createCiliaryApparatus();
	const tissue = apparatus.support.children[0] as THREE.Mesh;
	for (const value of [0, 4, 8]) {
		apparatus.update(value, false, false);
		const p = tissue.geometry.getAttribute("position");
		expect(
			Array.from(
				{ length: p.count },
				(_, i) =>
					Math.abs(Math.hypot(p.getX(i), p.getY(i)) - 6) < 1e-5 &&
					Math.abs(p.getZ(i) - 1.3) < 1e-5,
			).some(Boolean),
		).toBe(true);
	}
	disposeThree(apparatus.group);
});

test("anatomy uses the construction mesh and zonules terminate on its scaled capsule", () => {
	const apparatus = createCiliaryApparatus(),
		reference = createRoundedLensGeometry();
	const shell = apparatus.lens.children[0] as THREE.Mesh;
	expect(Array.from(shell.geometry.getAttribute("position").array)).toEqual(
		Array.from(reference.getAttribute("position").array),
	);
	const fibers = apparatus.support.children.find(
		(o) => o instanceof THREE.LineSegments,
	) as THREE.LineSegments;
	for (const response of [0, 2, 4, 6, 8]) {
		const shape = apparatus.update(response, true, false);
		expect(apparatus.lens.scale.x).toBe(shape.lensRadius);
		expect(apparatus.lens.scale.z * 2).toBe(shape.thickness);
		const points = fibers.geometry.getAttribute("position");
		for (let i = 3; i < points.count; i += 4) {
			const r = Math.hypot(points.getX(i), points.getY(i)),
				z = points.getZ(i);
			expect(r).toBeLessThanOrEqual(shape.lensRadius + 1e-6);
			expect(z).toBeCloseTo(
				(shape.thickness / 2) * lensSurfaceZ(r / shape.lensRadius, z > 0),
				4,
			);
		}
	}
	reference.dispose();
	disposeThree(apparatus.group);
});

test("process ridges have outward normals and remain attached along the inner body", () => {
	const apparatus = createCiliaryApparatus();
	const folds = apparatus.support.children.find(
		(o) => o instanceof THREE.InstancedMesh,
	) as THREE.InstancedMesh;
	// At the positive tangential edge, the outward normal points towards +y.
	const normal = folds.geometry.getAttribute("normal");
	expect(normal.getY(16 * 17)).toBeGreaterThan(0);
	for (const response of [0, 4, 8]) {
		apparatus.update(response, false, false);
		const p = folds.geometry.getAttribute("position");
		// The contact rail (angle 3π/2) follows the undeformed inner body and
		// shares its deformation, rather than floating as an isolated ellipsoid.
		for (let row = 1; row < 32; row++) {
			const z = -1.4 + (1.95 * row) / 32;
			const bodyR = ciliaryInnerRadius(z);
			const expected = ciliaryPoint(bodyR, 0, z, response / 8),
				i = row * 17 + 12;
			expect(p.getX(i)).toBeCloseTo(expected.x, 5);
			expect(p.getY(i)).toBeCloseTo(0, 5);
			expect(p.getZ(i)).toBeCloseTo(expected.z, 5);
		}
	}
	disposeThree(apparatus.group);
});
