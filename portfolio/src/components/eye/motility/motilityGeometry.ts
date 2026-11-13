import * as THREE from "three";
import {
	assemblyIrisMaterial,
	createAssemblyCornea,
	createAssemblyIris,
} from "../lens/anteriorEyeGeometry";
import { scleralWallRadius } from "../lens/anteriorSegmentProfile";
import { createCiliaryApparatus } from "../lens/ciliaryApparatus";
import { createPosteriorEye } from "../retina/posteriorEye";
import { CUP_CENTRE_Z } from "../retina/retinaModel";
import { type MuscleId, muscles } from "./motilityModel";
import { anatomy, musclePath } from "./orbitalMechanics";

const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
export function createMotilityEye() {
	const group = new THREE.Group();
	const posterior = createPosteriorEye();
	// The orbital nerve segment would need its own deforming path; it is not
	// part of the rigid globe in this motility lesson.
	// Do not illuminate retinal vessels through the pupil in this exterior view.
	posterior.update(false, { choroid: true, sclera: true, nerve: false }, false);
	group.add(posterior.group);
	// External-view lighting approximation: the enclosed fundus is unilluminated.
	// This changes neither the shared retinal geometry nor its vertex colours.
	const retina = posterior.group.getObjectByName("retina")!;
	for (const mesh of retina.children as THREE.Mesh[])
		(mesh.material as THREE.MeshStandardMaterial).color.setRGB(
			0.015,
			0.015,
			0.015,
		);
	const front = createCiliaryApparatus();
	front.update(0, false, false);
	// Retain the shared relaxed lens/support geometry, but omit it from this
	// exterior draw pass. Its transmission shader is not an enclosed-eye light solver.
	front.group.visible = false;
	group.add(front.group);
	const iris = assemblyIrisMaterial();
	const irisGeometry = createAssemblyIris();
	group.add(new THREE.Mesh(irisGeometry, iris.material));
	group.add(
		new THREE.Mesh(
			createAssemblyCornea(),
			new THREE.MeshPhysicalMaterial({
				color: 0xd8eeea,
				transparent: true,
				opacity: 0.045,
				roughness: 0.08,
				clearcoat: 1,
				depthWrite: false,
				side: THREE.DoubleSide,
			}),
		),
	);
	// Rotate the shared anatomical eye about the chosen globe centre, not the lens.
	group.position.z = -CUP_CENTRE_Z;
	return group;
}
export const MUSCLE_SEGMENTS = 48;
export const MUSCLE_SECTORS = 32;
const rows = MUSCLE_SEGMENTS + 1,
	columns = MUSCLE_SECTORS + 1;
const capStart = rows * columns;
export const TROCHLEA = anatomy.SO.guide.clone().add(centre);
const inferiorOrigin = anatomy.IO.origin.clone().add(centre);
// Appearance dimensions in mm. These distinct profiles are not patient measurements.
const profiles: Record<
	MuscleId,
	{ width: number; thickness: number; tendon: number; fan: number }
> = {
	MR: { width: 3.8, thickness: 1.45, tendon: 0.85, fan: 4.2 },
	LR: { width: 4.1, thickness: 1.35, tendon: 0.74, fan: 4.5 },
	SR: { width: 3.8, thickness: 1.25, tendon: 0.78, fan: 4.1 },
	IR: { width: 3.9, thickness: 1.4, tendon: 0.8, fan: 4.3 },
	SO: { width: 2.1, thickness: 1.0, tendon: 0.34, fan: 3.8 },
	IO: { width: 2.8, thickness: 1.05, tendon: 0.88, fan: 2.9 },
};
const smooth = (x: number) => {
	const t = THREE.MathUtils.clamp(x, 0, 1);
	return t * t * (3 - 2 * t);
};
function muscleProfile(id: MuscleId, t: number, length: number) {
	const p = { ...profiles[id], tendon: 1 - anatomy[id].tendonLength / length },
		f = smooth((t - p.tendon) / Math.max(0.01, 1 - p.tendon));
	const belly =
		Math.sin(Math.PI * THREE.MathUtils.clamp(t / (p.tendon + 0.12), 0, 1)) **
		0.7;
	let width = 0.65 + (p.width - 0.65) * belly;
	let thickness = 0.3 + (p.thickness - 0.3) * belly;
	if (id === "SO") {
		const taper = smooth((t - p.tendon + 0.1) / 0.1);
		width = THREE.MathUtils.lerp(width, 0.7, taper);
		thickness = THREE.MathUtils.lerp(thickness, 0.11, taper);
		const reflection = anatomy.SO.origin.distanceTo(anatomy.SO.guide) / length;
		if (t >= reflection)
			width = 0.7 + (p.fan - 0.7) * smooth((t - reflection) / (1 - reflection));
	} else if (t >= p.tendon) {
		const startBelly =
			Math.sin((Math.PI * p.tendon) / (p.tendon + 0.12)) ** 0.7;
		width = THREE.MathUtils.lerp(
			0.65 + (p.width - 0.65) * startBelly,
			p.fan,
			f,
		);
		thickness = THREE.MathUtils.lerp(
			0.3 + (p.thickness - 0.3) * startBelly,
			0.1,
			f,
		);
	}
	return { width, thickness, tendon: smooth((t - p.tendon + 0.025) / 0.075) };
}
export function insertion(id: MuscleId) {
	return anatomy[id].insertion.clone().add(centre);
}
function geometry() {
	const g = new THREE.BufferGeometry();
	g.setAttribute(
		"position",
		new THREE.BufferAttribute(new Float32Array((capStart + 2) * 3), 3),
	);
	g.setAttribute(
		"color",
		new THREE.BufferAttribute(new Float32Array((capStart + 2) * 3), 3),
	);
	const uv = new Float32Array((capStart + 2) * 2);
	for (let i = 0; i < rows; i++)
		for (let j = 0; j < columns; j++) {
			const k = (i * columns + j) * 2;
			uv[k] = j / MUSCLE_SECTORS;
			uv[k + 1] = i / MUSCLE_SEGMENTS;
		}
	uv[capStart * 2] = 0.5;
	uv[capStart * 2 + 1] = 0;
	uv[(capStart + 1) * 2] = 0.5;
	uv[(capStart + 1) * 2 + 1] = 1;
	g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
	const index: number[] = [];
	for (let i = 0; i < MUSCLE_SEGMENTS; i++)
		for (let j = 0; j < MUSCLE_SECTORS; j++) {
			const a = i * columns + j,
				b = a + columns;
			index.push(a, a + 1, b, b, a + 1, b + 1);
		}
	for (let j = 0; j < MUSCLE_SECTORS; j++) {
		index.push(capStart, j + 1, j);
		const a = MUSCLE_SEGMENTS * columns + j;
		index.push(capStart + 1, a, a + 1);
	}
	g.setIndex(index);
	return g;
}
function tissueMaterial() {
	const m = new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness: 0.72,
		metalness: 0,
		envMapIntensity: 0.35,
	});
	m.onBeforeCompile = (shader) => {
		shader.vertexShader =
			`varying vec2 muscleUv;\n${shader.vertexShader}`.replace(
				"#include <begin_vertex>",
				"muscleUv=uv;\n#include <begin_vertex>",
			);
		shader.fragmentShader =
			`varying vec2 muscleUv;\n${shader.fragmentShader}`.replace(
				"#include <color_fragment>",
				`#include <color_fragment>
		float fibre=sin(muscleUv.x*377.0+0.4*sin(muscleUv.y*13.0));
		diffuseColor.rgb*=0.975+0.025*fibre;`,
			);
	};
	m.customProgramCacheKey = () => "extraocular-tissue-v2";
	return m;
}
export function createExtraocularMuscles() {
	const group = new THREE.Group();
	const originRing = new THREE.Mesh(
		new THREE.TorusGeometry(2.5, 0.25, 10, 36),
		new THREE.MeshStandardMaterial({ color: 0xc9bea9, roughness: 0.95 }),
	);
	originRing.position.set(15.5, 0.6, -31.7).add(centre);
	originRing.quaternion.setFromUnitVectors(
		new THREE.Vector3(0, 0, 1),
		new THREE.Vector3(-15.5, -0.6, 31.7).normalize(),
	);
	group.add(originRing);
	const floor = new THREE.Mesh(
		new THREE.CircleGeometry(1.5, 24),
		new THREE.MeshStandardMaterial({
			color: 0xc9bea9,
			roughness: 0.95,
			side: THREE.DoubleSide,
		}),
	);
	floor.rotation.x = -Math.PI / 2;
	floor.position.copy(inferiorOrigin).y -= 0.35;
	group.add(floor);
	const trochlea = new THREE.Mesh(
		new THREE.TorusGeometry(0.85, 0.22, 10, 28, Math.PI * 1.6),
		new THREE.MeshStandardMaterial({ color: 0xd9cbb6, roughness: 0.8 }),
	);
	trochlea.position.copy(TROCHLEA);
	trochlea.rotation.set(Math.PI / 4, 0, -Math.PI / 4);
	group.add(trochlea);
	const parts = muscles.map((m) => {
		const mesh = new THREE.Mesh(geometry(), tissueMaterial());
		mesh.name = `muscle-${m.id}`;
		mesh.frustumCulled = false;
		group.add(mesh);
		return { id: m.id, mesh };
	});
	const inverse = new THREE.Quaternion(),
		local = new THREE.Vector3(),
		out = new THREE.Vector3(),
		widthAxis = new THREE.Vector3(),
		tangent = new THREE.Vector3(),
		previousWidth = new THREE.Vector3(),
		vertex = new THREE.Vector3();
	const points = Array.from({ length: rows }, () => new THREE.Vector3());
	const belly = new THREE.Color("#984c47"),
		tendonColour = new THREE.Color("#d8cdb7"),
		highlightColour = new THREE.Color("#b86a59"),
		colour = new THREE.Color();
	function wallRadius(z: number) {
		return z < CUP_CENTRE_Z
			? Math.sqrt(Math.max(0, 12.2 ** 2 - (z - CUP_CENTRE_Z) ** 2))
			: scleralWallRadius(z, true);
	}
	function clear(point: THREE.Vector3, q: THREE.Quaternion, margin: number) {
		local.copy(point).sub(centre).applyQuaternion(inverse).add(centre);
		if (local.z > -19.8 && local.z < 2) {
			const r = Math.hypot(local.x, local.y),
				wall = wallRadius(local.z);
			if (r > 1e-6 && r < wall + margin) {
				local.x *= (wall + margin) / r;
				local.y *= (wall + margin) / r;
				point.copy(local).sub(centre).applyQuaternion(q).add(centre);
			}
		}
	}
	function update(q: THREE.Quaternion, selected: MuscleId | "all") {
		inverse.copy(q).invert();
		for (const part of parts) {
			const id = part.id,
				end = insertion(id).sub(centre).applyQuaternion(q).add(centre);
			const mechanical = musclePath(id, q);
			const path = mechanical.points.map((p) => p.clone().add(centre));
			const route = new THREE.CurvePath<THREE.Vector3>();
			for (let k = 1; k < path.length; k++)
				if (path[k]!.distanceToSquared(path[k - 1]!) > 1e-12)
					route.add(new THREE.LineCurve3(path[k - 1]!, path[k]!));
			for (let i = 0; i < rows; i++) {
				const t = i / MUSCLE_SEGMENTS;
				points[i]!.copy(route.getPoint(t));
				if (i > 0 && i < MUSCLE_SEGMENTS)
					clear(
						points[i]!,
						q,
						muscleProfile(id, t, mechanical.length).thickness + 0.08,
					);
			}
			const p = part.mesh.geometry.getAttribute("position"),
				c = part.mesh.geometry.getAttribute("color");
			for (let i = 0; i < rows; i++) {
				const t = i / MUSCLE_SEGMENTS,
					shape = muscleProfile(id, t, mechanical.length),
					point = points[i]!;
				tangent
					.copy(points[Math.min(i + 1, MUSCLE_SEGMENTS)]!)
					.sub(points[Math.max(i - 1, 0)]!)
					.normalize();
				out.copy(point).sub(centre).addScaledVector(tangent, -out.dot(tangent));
				if (out.lengthSq() < 1e-8) {
					out.set(1, 0, 0).addScaledVector(tangent, -out.dot(tangent));
				}
				out.normalize();
				widthAxis.crossVectors(out, tangent).normalize();
				if (i > 0 && widthAxis.dot(previousWidth) < 0) {
					widthAxis.negate();
					out.negate();
				}
				previousWidth.copy(widthAxis);
				colour
					.copy(selected === id ? highlightColour : belly)
					.lerp(tendonColour, shape.tendon);
				const outward = out.dot(vertex.copy(point).sub(centre)) >= 0 ? 1 : -1;
				for (let j = 0; j < columns; j++) {
					const a = (j / MUSCLE_SECTORS) * Math.PI * 2;
					vertex
						.copy(point)
						.addScaledVector(widthAxis, Math.cos(a) * shape.width)
						.addScaledVector(out, Math.sin(a) * shape.thickness);
					// Conform the broad insertion to the scleral curvature, rather than
					// leaving a flat strap hovering above the globe. This is geometric.
					if (t > 0.9) {
						local.copy(vertex).sub(centre).applyQuaternion(inverse).add(centre);
						if (local.z > -19.8 && local.z < 2) {
							const r = Math.hypot(local.x, local.y),
								wall = wallRadius(local.z);
							if (r > 1e-6) {
								const target = wall + outward * Math.sin(a) * shape.thickness;
								local.x *= target / r;
								local.y *= target / r;
								vertex.copy(local).sub(centre).applyQuaternion(q).add(centre);
							}
						}
					}
					const k = i * columns + j;
					p.setXYZ(k, vertex.x, vertex.y, vertex.z);
					c.setXYZ(k, colour.r, colour.g, colour.b);
				}
			}
			p.setXYZ(capStart, points[0]!.x, points[0]!.y, points[0]!.z);
			p.setXYZ(capStart + 1, end.x, end.y, end.z);
			c.setXYZ(capStart, belly.r, belly.g, belly.b);
			c.setXYZ(capStart + 1, tendonColour.r, tendonColour.g, tendonColour.b);
			p.needsUpdate = true;
			c.needsUpdate = true;
			part.mesh.geometry.computeVertexNormals();
			const normals = part.mesh.geometry.getAttribute("normal");
			for (let i = 0; i < rows; i++) {
				const a = i * columns,
					b = a + MUSCLE_SECTORS;
				local.fromBufferAttribute(normals, a);
				vertex.fromBufferAttribute(normals, b);
				local.add(vertex).normalize();
				normals.setXYZ(a, local.x, local.y, local.z);
				normals.setXYZ(b, local.x, local.y, local.z);
			}
			normals.needsUpdate = true;
			const faded = selected !== "all" && selected !== id,
				material = part.mesh.material;
			if (material.transparent !== faded) {
				material.transparent = faded;
				material.needsUpdate = true;
			}
			material.depthWrite = !faded;
			material.opacity = faded ? 0.12 : 1;
		}
	}
	update(new THREE.Quaternion(), "all");
	return { group, update };
}
