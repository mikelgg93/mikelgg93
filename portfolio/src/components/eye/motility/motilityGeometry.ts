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

const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
export function createMotilityEye() {
	const group = new THREE.Group();
	const posterior = createPosteriorEye();
	// The orbital nerve segment would need its own deforming path; it is not
	// part of the rigid globe in this motility lesson.
	posterior.update(false, { choroid: true, sclera: true, nerve: false });
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
const sectors = 12,
	segments = 32;
function ribbonGeometry() {
	const geo = new THREE.BufferGeometry();
	geo.setAttribute(
		"position",
		new THREE.BufferAttribute(
			new Float32Array((segments + 1) * (sectors + 1) * 3),
			3,
		),
	);
	geo.setAttribute(
		"color",
		new THREE.BufferAttribute(
			new Float32Array((segments + 1) * (sectors + 1) * 3),
			3,
		),
	);
	const indices: number[] = [];
	for (let i = 0; i < segments; i++)
		for (let j = 0; j < sectors; j++) {
			const a = i * (sectors + 1) + j,
				b = a + sectors + 1;
			indices.push(a, b, a + 1, b, b + 1, a + 1);
		}
	geo.setIndex(indices);
	return geo;
}
// Fixed orbital guides and insertion landmarks are drawing choices, not MRI fits.
const recti: Partial<Record<MuscleId, { x: number; y: number; z: number }>> = {
	MR: { x: 1, y: 0, z: -0.8 },
	LR: { x: -1, y: 0, z: -2.2 },
	SR: { x: 0, y: 1, z: -2.8 },
	IR: { x: 0, y: -1, z: -1.8 },
};
export function insertion(id: MuscleId) {
	const s = recti[id];
	if (s) {
		const r = scleralWallRadius(s.z, true);
		return new THREE.Vector3(s.x * r, s.y * r, s.z);
	}
	const z = -11.2,
		r = Math.sqrt(12.2 ** 2 - (z - CUP_CENTRE_Z) ** 2) / Math.sqrt(2);
	return new THREE.Vector3(-r, id === "SO" ? r : -r, z);
}
export function createExtraocularMuscles() {
	const group = new THREE.Group();
	const ring = new THREE.Mesh(
		new THREE.TorusGeometry(1.8, 0.2, 8, 36),
		new THREE.MeshStandardMaterial({ color: 0xc9bea9, roughness: 0.9 }),
	);
	ring.position.set(0, 0, -36);
	group.add(ring);
	const floor = new THREE.Mesh(
		new THREE.BoxGeometry(3, 0.3, 3),
		new THREE.MeshStandardMaterial({ color: 0xc9bea9, roughness: 0.95 }),
	);
	floor.position.set(14, -14.4, 2);
	group.add(floor);
	const trochlea = new THREE.Mesh(
		new THREE.TorusGeometry(0.8, 0.18, 8, 24),
		new THREE.MeshStandardMaterial({ color: 0xddd4bf, roughness: 0.8 }),
	);
	trochlea.position.set(14, 14, 3);
	trochlea.rotation.x = Math.PI / 4;
	group.add(trochlea);
	const parts = muscles.map((m) => {
		const mesh = new THREE.Mesh(
			ribbonGeometry(),
			new THREE.MeshStandardMaterial({
				vertexColors: true,
				roughness: 0.8,
				side: THREE.DoubleSide,
			}),
		);
		mesh.frustumCulled = false;
		group.add(mesh);
		return { id: m.id, mesh };
	});
	const point = new THREE.Vector3(),
		local = new THREE.Vector3(),
		inverse = new THREE.Quaternion();
	const belly = new THREE.Color("#b56862"),
		tendon = new THREE.Color("#e1d4b8"),
		selected = new THREE.Color("#d48f77");
	function update(q: THREE.Quaternion, highlight: MuscleId | "all") {
		inverse.copy(q).invert();
		for (const part of parts) {
			const id = part.id,
				s = recti[id];
			const end = insertion(id).sub(centre).applyQuaternion(q).add(centre);
			const controls = s
				? [
						new THREE.Vector3(s.x * 1.5, s.y * 1.5, -36),
						new THREE.Vector3(s.x * 9, s.y * 9, -24),
						new THREE.Vector3(s.x * 13.4, s.y * 13.4, CUP_CENTRE_Z),
						end,
					]
				: id === "SO"
					? [
							new THREE.Vector3(3, 4, -36),
							new THREE.Vector3(11, 15, -15),
							trochlea.position.clone(),
							new THREE.Vector3(0, 15, -5),
							end,
						]
					: [
							new THREE.Vector3(14, -14, 2),
							new THREE.Vector3(3, -15, -4),
							new THREE.Vector3(-8, -14, -9),
							end,
						];
			const curve = new THREE.CatmullRomCurve3(controls),
				frames = curve.computeFrenetFrames(segments, false);
			const positions = part.mesh.geometry.getAttribute("position"),
				colours = part.mesh.geometry.getAttribute("color");
			for (let i = 0; i <= segments; i++) {
				const t = i / segments;
				curve.getPoint(t, point);
				// A geometric clearance aid, not a muscle/globe contact-force solver.
				if (i < segments) {
					local.copy(point).sub(centre).applyQuaternion(inverse).add(centre);
					const z = local.z,
						r = Math.hypot(local.x, local.y);
					if (z > -19.8 && z < 2) {
						const wall =
							z < CUP_CENTRE_Z
								? Math.sqrt(Math.max(0, 12.2 ** 2 - (z - CUP_CENTRE_Z) ** 2))
								: scleralWallRadius(z, true);
						if (r > 1e-6 && r < wall + 0.5) {
							local.x *= (wall + 0.5) / r;
							local.y *= (wall + 0.5) / r;
							point.copy(local).sub(centre).applyQuaternion(q).add(centre);
						}
					}
				}
				const isTendon = id === "SO" ? t > 0.5 : t > 0.85;
				const width = isTendon
					? id === "SO"
						? 0.32
						: 0.6
					: 0.48 + 0.7 * Math.sin(Math.PI * t);
				const colour = isTendon ? tendon : highlight === id ? selected : belly;
				for (let j = 0; j <= sectors; j++) {
					const a = (j / sectors) * Math.PI * 2,
						grain = 1 + 0.035 * Math.cos(a * 9 + t * 3);
					local
						.copy(point)
						.addScaledVector(frames.normals[i]!, Math.cos(a) * width * grain)
						.addScaledVector(
							frames.binormals[i]!,
							Math.sin(a) * (isTendon ? 0.08 : 0.3) * grain,
						);
					const k = i * (sectors + 1) + j;
					positions.setXYZ(k, local.x, local.y, local.z);
					colours.setXYZ(k, colour.r, colour.g, colour.b);
				}
			}
			positions.needsUpdate = true;
			colours.needsUpdate = true;
			part.mesh.geometry.computeVertexNormals();
			(part.mesh.material as THREE.MeshStandardMaterial).transparent =
				highlight !== "all" && highlight !== id;
			(part.mesh.material as THREE.MeshStandardMaterial).opacity =
				highlight !== "all" && highlight !== id ? 0.16 : 1;
		}
	}
	update(new THREE.Quaternion(), "all");
	return { group, update };
}
