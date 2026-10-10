import * as THREE from "three";
import { conicSag } from "../cornea/conic";
import { CORNEAL_APEX_Z, POSTERIOR_CORNEAL_APEX_Z } from "../eyeDimensions";
import {
	CANAL_ANGLE,
	CHOROID_WALL,
	createRetinalVessels,
	DISC_ANGLE,
	innerRetinalRadius,
	MACULA_RADIUS,
	RETINAL_WALL,
	SCLERAL_WALL,
} from "./retinaAnatomy";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";

// Drawing dimensions in mm, not fitted anatomy or measured tissue thicknesses.
// +x is nasal in this schematic; the disc is offset from the posterior pole.
const centre = new THREE.Vector3(0, 0, CUP_CENTRE_Z);
const axis = new THREE.Vector3(Math.sin(DISC_ANGLE), 0, -Math.cos(DISC_ANGLE));
const tangent = new THREE.Vector3(
	Math.cos(DISC_ANGLE),
	0,
	Math.sin(DISC_ANGLE),
);
export const eyeCoats = [
	{
		key: "retina",
		en: "Retina",
		es: "Retina",
		inner: CUP_RADIUS,
		outer: CUP_RADIUS + RETINAL_WALL,
		color: "#aa655c",
	},
	{
		key: "choroid",
		en: "Choroid",
		es: "Coroides",
		inner: CUP_RADIUS + RETINAL_WALL,
		outer: CUP_RADIUS + RETINAL_WALL + CHOROID_WALL,
		color: "#733b38",
	},
	{
		key: "sclera",
		en: "Sclera",
		es: "Esclerótica",
		inner: CUP_RADIUS + RETINAL_WALL + CHOROID_WALL,
		outer: CUP_RADIUS + RETINAL_WALL + CHOROID_WALL + SCLERAL_WALL,
		color: "#dfd8c6",
	},
] as const;
type Coat = (typeof eyeCoats)[number];
type Surface = (side: number, u: number, phi: number) => THREE.Vector3;

// A closed wall: two surfaces, two end rims and, for a cutaway, two cut faces.
// Separate patches give the cut edges crisp normals. Both views are built once.
function wallGeometry(
	surface: Surface,
	half: boolean,
	rows = 64,
	reverse = false,
) {
	const positions: number[] = [],
		indices: number[] = [];
	const start = half ? Math.PI : 0,
		span = half ? Math.PI : 2 * Math.PI;
	function patch(
		point: (u: number, v: number) => THREE.Vector3,
		nu: number,
		nv: number,
		flip: boolean,
	) {
		const offset = positions.length / 3;
		for (let i = 0; i <= nu; i++)
			for (let j = 0; j <= nv; j++)
				positions.push(...point(i / nu, j / nv).toArray());
		for (let i = 0; i < nu; i++)
			for (let j = 0; j < nv; j++) {
				const a = offset + i * (nv + 1) + j,
					b = a + nv + 1;
				if (flip !== reverse) indices.push(a, a + 1, b, b, a + 1, b + 1);
				else indices.push(a, b, a + 1, b, b + 1, a + 1);
			}
	}
	const sectors = half ? 64 : 128;
	for (const side of [0, 1])
		patch(
			(u, v) => surface(side, u, start + span * v),
			rows,
			sectors,
			side === 1,
		);
	for (const end of [0, 1])
		patch((s, v) => surface(s, end, start + span * v), 1, sectors, end === 0);
	if (half)
		for (const phi of [Math.PI, 2 * Math.PI])
			patch((s, u) => surface(s, u, phi), 1, rows, phi === 2 * Math.PI);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(positions, 3),
	);
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
	return geometry;
}

function coatSurface(coat: Coat): Surface {
	const cache = new Map<string, { radial: THREE.Vector3; end: number }>();
	const front = [
		POSTERIOR_CORNEAL_APEX_Z - conicSag(5.8, 0, 6.5, 6.5, -0.4),
		CORNEAL_APEX_Z - conicSag(5.8, 0, 7.8, 7.8, -0.26),
	];
	return (side, u, phi) => {
		const radius = THREE.MathUtils.lerp(coat.inner, coat.outer, side);
		const isRetina = coat.key === "retina",
			isSclera = coat.key === "sclera";
		// Retain the lesson's posterior retina. Extend the other coats forwards;
		// the sclera ends at Part I's corneal rim, the choroid near the ciliary body.
		const rim = isSclera ? 5.8 : 7;
		const maxZ = isRetina
			? -Math.cos(Math.PI * 0.49)
			: Math.sqrt(1 - (rim / radius) ** 2);
		const key = `${side}:${phi}`;
		let meridian = cache.get(key);
		if (!meridian) {
			const radial = tangent.clone().multiplyScalar(Math.cos(phi));
			radial.y = Math.sin(phi);
			let low = CANAL_ANGLE,
				high = Math.PI;
			for (let i = 0; i < 32; i++) {
				const angle = (low + high) / 2;
				if (axis.z * Math.cos(angle) + radial.z * Math.sin(angle) < maxZ)
					low = angle;
				else high = angle;
			}
			meridian = { radial, end: (low + high) / 2 };
			cache.set(key, meridian);
		}
		const { radial, end } = meridian;
		const angle = THREE.MathUtils.lerp(CANAL_ANGLE, end, u);
		const direction = axis
			.clone()
			.multiplyScalar(Math.cos(angle))
			.addScaledVector(radial, Math.sin(angle));
		const r = isRetina
			? THREE.MathUtils.lerp(innerRetinalRadius(direction), coat.outer, side)
			: radius;
		const p = direction.multiplyScalar(r);
		if (!isRetina && p.z > 0) {
			const frontZ = isSclera
				? THREE.MathUtils.lerp(front[0]!, front[1]!, side)
				: -1 + 0.3 * side;
			const scale = (frontZ - CUP_CENTRE_Z) / (radius * maxZ);
			p.z *= 1 + ((scale - 1) * p.z) / (radius * maxZ);
		}
		return p.add(centre);
	};
}

export function createPosteriorEye() {
	const group = new THREE.Group();
	group.name = "posterior-eye";
	const parts = new Map<
		string,
		{ group: THREE.Group; whole: THREE.Mesh; cut: THREE.Mesh }
	>();
	function part(key: string, surface: Surface, color: string, rows = 64) {
		const material = new THREE.MeshPhongMaterial({
			color,
			side: THREE.FrontSide,
			shininess: key === "sclera" ? 28 : 12,
		});
		const whole = new THREE.Mesh(
			wallGeometry(surface, false, rows, key.includes("nerve")),
			material,
		);
		const cut = new THREE.Mesh(
			wallGeometry(surface, true, rows, key.includes("nerve")),
			material,
		);
		if (key === "retina") {
			material.vertexColors = true;
			for (const mesh of [whole, cut]) {
				const p = mesh.geometry.getAttribute("position");
				const colors: number[] = [];
				for (let i = 0; i < p.count; i++) {
					const rho = Math.hypot(p.getX(i), p.getY(i));
					const tint = 1 - THREE.MathUtils.smoothstep(rho, 0.7, MACULA_RADIUS);
					// Muted pigment cue, not a spectral or fundus-colour simulation.
					colors.push(1, 1 - 0.16 * tint, 1 - 0.42 * tint);
				}
				mesh.geometry.setAttribute(
					"color",
					new THREE.Float32BufferAttribute(colors, 3),
				);
			}
		}
		const node = new THREE.Group();
		node.name = key;
		node.add(whole, cut);
		group.add(node);
		parts.set(key, { group: node, whole, cut });
	}
	for (const coat of eyeCoats)
		part(
			coat.key,
			coatSurface(coat),
			coat.color,
			coat.key === "retina" ? 96 : 64,
		);
	const discDistance = CUP_RADIUS * Math.cos(CANAL_ANGLE);
	const exitDistance = eyeCoats[2].outer * Math.cos(CANAL_ANGLE);
	function nerveSurface(sheath: boolean): Surface {
		return (side, u, phi) => {
			// Exact cone inside the canal. The external bend begins only after
			// the scleral exit, with zero initial slope so the seam is continuous.
			const distance = sheath
				? THREE.MathUtils.lerp(exitDistance, 21, u)
				: u <= 1 / 3
					? THREE.MathUtils.lerp(discDistance, exitDistance, u * 3)
					: THREE.MathUtils.lerp(exitDistance, 21, (u - 1 / 3) * 1.5);
			const t = Math.max(0, (distance - exitDistance) / (21 - exitDistance));
			const point = centre
				.clone()
				.addScaledVector(axis, distance)
				.addScaledVector(tangent, 0.8 * t * t);
			const direction = axis
				.clone()
				.addScaledVector(tangent, (1.6 * t) / (21 - exitDistance))
				.normalize();
			const across = new THREE.Vector3(-direction.z, 0, direction.x);
			const coreRadius =
				distance <= exitDistance
					? distance * Math.tan(CANAL_ANGLE)
					: THREE.MathUtils.lerp(exitDistance * Math.tan(CANAL_ANGLE), 1.3, t);
			const r = sheath
				? coreRadius + side * 0.4 * Math.min(1, t * 5)
				: side * coreRadius;
			return point
				.addScaledVector(across, r * Math.cos(phi))
				.add(new THREE.Vector3(0, r * Math.sin(phi), 0));
		};
	}
	part("optic-nerve", nerveSurface(false), "#e4bc79", 48);
	part("nerve-sheath", nerveSurface(true), "#c9bea6", 48);
	const vessels = createRetinalVessels();
	group.add(vessels);
	const cutPlane = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
	let previousSection: boolean | undefined;
	return {
		group,
		update(
			section: boolean,
			visible = { choroid: true, sclera: true, nerve: true },
			landmarks = true,
		) {
			vessels.visible = landmarks;
			if (section !== previousSection) {
				vessels.traverse((object) => {
					if (object instanceof THREE.Mesh) {
						object.material.clippingPlanes = section ? cutPlane : [];
						object.material.needsUpdate = true;
					}
				});
				previousSection = section;
			}
			for (const [key, item] of parts) {
				item.whole.visible = !section;
				item.cut.visible = section;
				item.group.visible =
					key === "choroid"
						? visible.choroid
						: key === "sclera"
							? visible.sclera
							: key.includes("nerve")
								? visible.nerve
								: true;
			}
		},
	};
}
