import * as THREE from "three";
import { conicSag } from "../cornea/conic";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";

// Drawing dimensions in mm, not fitted anatomy or measured tissue thicknesses.
// +x is nasal in this schematic; the disc is offset from the posterior pole.
const DISC_ANGLE = 0.3;
const CANAL_ANGLE = Math.asin(1.05 / CUP_RADIUS);
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
		inner: 12,
		outer: 12.18,
		color: "#aa655c",
	},
	{
		key: "choroid",
		en: "Choroid",
		es: "Coroides",
		inner: 12.18,
		outer: 12.58,
		color: "#733b38",
	},
	{
		key: "sclera",
		en: "Sclera",
		es: "Esclerótica",
		inner: 12.58,
		outer: 13.28,
		color: "#dfd8c6",
	},
] as const;
type Coat = (typeof eyeCoats)[number];
type Surface = (side: number, u: number, phi: number) => THREE.Vector3;

// A closed wall: two surfaces, two end rims and, for a cutaway, two cut faces.
// Separate patches give the cut edges crisp normals. Both views are built once.
function wallGeometry(surface: Surface, half: boolean, rows = 64) {
	const positions: number[] = [],
		indices: number[] = [];
	const start = half ? Math.PI : 0,
		span = half ? Math.PI : 2 * Math.PI;
	function patch(
		point: (u: number, v: number) => THREE.Vector3,
		nu: number,
		nv: number,
	) {
		const offset = positions.length / 3;
		for (let i = 0; i <= nu; i++)
			for (let j = 0; j <= nv; j++)
				positions.push(...point(i / nu, j / nv).toArray());
		for (let i = 0; i < nu; i++)
			for (let j = 0; j < nv; j++) {
				const a = offset + i * (nv + 1) + j,
					b = a + nv + 1;
				indices.push(a, b, a + 1, b, b + 1, a + 1);
			}
	}
	const sectors = half ? 64 : 128;
	for (const side of [0, 1])
		patch((u, v) => surface(side, u, start + span * v), rows, sectors);
	for (const end of [0, 1])
		patch((s, v) => surface(s, end, start + span * v), 1, sectors);
	if (half)
		for (const phi of [Math.PI, 2 * Math.PI])
			patch((s, u) => surface(s, u, phi), 1, rows);
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
		const radial = tangent.clone().multiplyScalar(Math.cos(phi));
		radial.y = Math.sin(phi);
		// Find the oblique meridian's intersection with a constant-z rim.
		let low = CANAL_ANGLE,
			high = Math.PI;
		for (let i = 0; i < 32; i++) {
			const angle = (low + high) / 2;
			if (axis.z * Math.cos(angle) + radial.z * Math.sin(angle) < maxZ)
				low = angle;
			else high = angle;
		}
		const angle = THREE.MathUtils.lerp(CANAL_ANGLE, (low + high) / 2, u);
		const direction = axis
			.clone()
			.multiplyScalar(Math.cos(angle))
			.addScaledVector(radial, Math.sin(angle));
		const p = direction.multiplyScalar(radius);
		if (!isRetina && p.z > 0) {
			const frontZ = isSclera
				? THREE.MathUtils.lerp(
						5.05 - conicSag(5.8, 0, 6.5, 6.5, -0.4),
						5.6 - conicSag(5.8, 0, 7.8, 7.8, -0.26),
						side,
					)
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
			side: THREE.DoubleSide,
			shininess: key === "sclera" ? 28 : 12,
		});
		const whole = new THREE.Mesh(wallGeometry(surface, false, rows), material);
		const cut = new THREE.Mesh(wallGeometry(surface, true, rows), material);
		const node = new THREE.Group();
		node.name = key;
		node.add(whole, cut);
		group.add(node);
		parts.set(key, { group: node, whole, cut });
	}
	for (const coat of eyeCoats) part(coat.key, coatSurface(coat), coat.color);
	const discDistance = CUP_RADIUS * Math.cos(CANAL_ANGLE);
	const exitDistance = eyeCoats[2].outer * Math.cos(CANAL_ANGLE);
	const nervePath = new THREE.CatmullRomCurve3([
		centre.clone().addScaledVector(axis, discDistance - 0.01),
		centre.clone().addScaledVector(axis, exitDistance),
		centre
			.clone()
			.addScaledVector(axis, 17)
			.add(new THREE.Vector3(0.35, 0, 0)),
		centre
			.clone()
			.addScaledVector(axis, 21)
			.add(new THREE.Vector3(0.8, 0, 0)),
	]);
	function nerveSurface(sheath: boolean): Surface {
		return (side, u, phi) => {
			// The sheath begins outside the scleral canal. Its separate cut wall
			// surrounds the nerve; this is not a resolved meningeal/axon model.
			const t = sheath ? THREE.MathUtils.lerp(1 / 3, 1, u) : u;
			const point = nervePath.getPoint(t),
				direction = nervePath.getTangent(t);
			const across = new THREE.Vector3(
				-direction.z,
				0,
				direction.x,
			).normalize();
			const exitRadius = eyeCoats[2].outer * Math.sin(CANAL_ANGLE);
			const coreRadius =
				t <= 1 / 3
					? THREE.MathUtils.lerp(1.05, exitRadius, t * 3)
					: THREE.MathUtils.lerp(exitRadius, 1.3, Math.min(1, (t - 1 / 3) * 3));
			const r = sheath
				? coreRadius + side * 0.4 * Math.min(1, u * 5)
				: side * coreRadius;
			return point
				.addScaledVector(across, r * Math.cos(phi))
				.add(new THREE.Vector3(0, r * Math.sin(phi), 0));
		};
	}
	part("optic-nerve", nerveSurface(false), "#e4bc79", 40);
	part("nerve-sheath", nerveSurface(true), "#c9bea6", 40);
	return {
		group,
		update(
			section: boolean,
			visible = { choroid: true, sclera: true, nerve: true },
		) {
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
