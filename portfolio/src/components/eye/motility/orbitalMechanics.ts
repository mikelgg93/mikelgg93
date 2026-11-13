import * as THREE from "three";
import { scleralWallRadius } from "../lens/anteriorSegmentProfile";
import { CUP_CENTRE_Z } from "../retina/retinaModel";
import curves from "./forceCurves.json";
import { type MuscleId, muscles } from "./motilityModel";

// UPAT v4 model coordinates, mm, globe-centred. The model file corrects the SO
// origin/pulley ordering and insertion sign in Table 1 of Filip et al. (2018).
// https://github.com/mitkof6/upat_eye_model/blob/master/model/UPAT_Eye_Model_Passive_Pulleys_v4.osim
// Source axes: anterior, superior, temporal. Here: nasal, superior, anterior.
const raw = {
	MR: [[-30, 0.6, -17], [-5.3, 0.14, -14.6], [8.8, 0, -9.6], 1.574, 40.84, 3.8],
	LR: [[-34, 0.6, -13], [-10.2, 0.3, 12], [6.5, 0, 10.1], 1.471, 48.98, 8.4],
	SR: [[-31.7, 3.6, -16], [-9.2, 12, -2], [7.6, 10.4, 0], 1.1768, 44.87, 5.4],
	IR: [
		[-31.7, -2.4, -16],
		[-4.2, -12.8, -4.2],
		[8.05, -10.2, 0],
		1.4269,
		45.49,
		4.8,
	],
	SO: [
		[-30.8342, 1.14521, -16.4402],
		[8.2, 12.2, -15.2],
		[-4.4, 11, 2.9],
		0.6031,
		39.56,
		26.5,
	],
	IO: [[11.3, -15.4, -11.1], [-7.18, -13.5, 0], [-8, 0, 9], 0.559, 41.1, 1.5],
} satisfies Record<
	MuscleId,
	[number[], number[], number[], number, number, number]
>;
const convert = (p: number[]) => new THREE.Vector3(-p[2]!, p[1]!, p[0]!);
export const WRAP_RADIUS = 12.2;
// Preserve reference insertion directions, project onto the existing series globe.
// This adaptation is explicit: the resulting geometry is not an unchanged UPAT eye.
function onGlobe(p: THREE.Vector3) {
	const d = p.clone().normalize();
	let lo = 0,
		hi = 20;
	for (let i = 0; i < 48; i++) {
		const r = (lo + hi) / 2,
			z = d.z * r;
		const wall =
			z <= 0
				? Math.sqrt(Math.max(0, WRAP_RADIUS ** 2 - z * z))
				: scleralWallRadius(z + CUP_CENTRE_Z, true);
		if (Math.hypot(d.x, d.y) * r > wall) hi = r;
		else lo = r;
	}
	return d.multiplyScalar((lo + hi) / 2);
}
export const anatomy = Object.fromEntries(
	muscles.map(({ id }) => {
		const d = raw[id];
		return [
			id,
			{
				origin: convert(d[0]),
				guide: convert(d[1]),
				insertion: onGlobe(convert(d[2])),
				maxForce: d[3],
				optimalLength: d[4],
				tendonLength: d[5],
			},
		];
	}),
) as Record<
	MuscleId,
	{
		origin: THREE.Vector3;
		guide: THREE.Vector3;
		insertion: THREE.Vector3;
		maxForce: number;
		optimalLength: number;
		tendonLength: number;
	}
>;
export function musclePath(id: MuscleId, q: THREE.Quaternion) {
	const a = anatomy[id],
		start = a.guide,
		end = a.insertion.clone().applyQuaternion(q);
	const u = start.clone().normalize(),
		v = end.clone().normalize(),
		r = Math.min(WRAP_RADIUS, end.length());
	const phi = Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1));
	const alpha = Math.acos(Math.min(1, r / start.length())),
		beta = Math.acos(Math.min(1, r / end.length()));
	const points = [a.origin.clone(), start.clone()];
	let length = a.origin.distanceTo(start),
		direction: THREE.Vector3;
	if (phi <= alpha + beta) {
		length += start.distanceTo(end);
		direction = start.clone().sub(end).normalize();
		points.push(end);
	} else {
		const w = v.clone().addScaledVector(u, -u.dot(v)).normalize();
		const at = (t: number) =>
			u
				.clone()
				.multiplyScalar(Math.cos(t) * r)
				.addScaledVector(w, Math.sin(t) * r);
		const first = at(alpha),
			last = at(phi - beta);
		length +=
			start.distanceTo(first) + r * (phi - alpha - beta) + last.distanceTo(end);
		points.push(first);
		for (let i = 1; i <= 20; i++)
			points.push(at(alpha + ((phi - alpha - beta) * i) / 20));
		points.push(end);
		direction =
			beta > 1e-7
				? last.clone().sub(end).normalize()
				: u.clone().addScaledVector(v, -u.dot(v)).normalize();
	}
	return {
		points,
		length,
		moment: end.clone().cross(direction).multiplyScalar(0.001),
	};
}
function table(values: number[], x: number) {
	const t = THREE.MathUtils.clamp(
			(x - curves.start) / curves.step,
			0,
			values.length - 1,
		),
		i = Math.min(values.length - 2, Math.floor(t));
	return THREE.MathUtils.lerp(values[i]!, values[i + 1]!, t - i);
}
export function lengthFactors(normalized: number) {
	return {
		active:
			normalized < 0.5 || normalized > 1.8
				? 0
				: table(curves.active, normalized),
		passive: normalized < 0.5 ? 0 : table(curves.passive, normalized),
	};
}
export type Condition =
	| "baseline"
	| "lr-weakness"
	| "so-weakness"
	| "ir-restriction";
export type Activation = Record<MuscleId, number>;
const ids = muscles.map((m) => m.id);
export function rotationVector(q: THREE.Quaternion) {
	const a = q.clone().normalize();
	if (a.w < 0) a.set(-a.x, -a.y, -a.z, -a.w);
	const s = Math.hypot(a.x, a.y, a.z);
	return s < 1e-12
		? new THREE.Vector3()
		: new THREE.Vector3(a.x, a.y, a.z).multiplyScalar(
				(2 * Math.atan2(s, a.w)) / s,
			);
}
export function passiveTorque(q: THREE.Quaternion) {
	// Filip et al. Eq.1 constants in N m/rad and N m/rad^3.
	// Isotropic rotation-vector generalisation, rather than Euler-coordinate springs.
	const r = rotationVector(q);
	return r.multiplyScalar(-0.002225 - 0.03453 * r.lengthSq());
}
export function evaluate(
	q: THREE.Quaternion,
	activation: Activation,
	condition: Condition = "baseline",
) {
	const torque = passiveTorque(q),
		forces = {} as Record<
			MuscleId,
			{
				active: number;
				passive: number;
				total: number;
				length: number;
				normalizedLength: number;
				moment: number[];
			}
		>;
	for (const id of ids) {
		const a = anatomy[id],
			path = musclePath(id, q);
		const normalized = (path.length - a.tendonLength) / a.optimalLength;
		const f = lengthFactors(normalized),
			weak =
				(condition === "lr-weakness" && id === "LR") ||
				(condition === "so-weakness" && id === "SO");
		const active =
			a.maxForce *
			f.active *
			THREE.MathUtils.clamp(activation[id], 0, 1) *
			(weak ? 0.25 : 1);
		// Restriction increases passive resistance, separately from neural weakness.
		const passive =
			a.maxForce *
			f.passive *
			(condition === "ir-restriction" && id === "IR" ? 4 : 1);
		torque.addScaledVector(path.moment, active + passive);
		forces[id] = {
			active,
			passive,
			total: active + passive,
			length: path.length,
			normalizedLength: normalized,
			moment: path.moment.toArray(),
		};
	}
	return { torque, forces };
}
// Inverse statics: bounded coactivation near a chosen 8% baseline. This is a
// controller assumption, not a neural measurement or an isolated-muscle command.
export function recruitment(target: THREE.Quaternion) {
	const a = Object.fromEntries(ids.map((id) => [id, 0.08])) as Activation;
	const columns = ids.map((id) => {
		const p = musclePath(id, target),
			m = anatomy[id];
		return p.moment.multiplyScalar(
			m.maxForce *
				lengthFactors((p.length - m.tendonLength) / m.optimalLength).active,
		);
	});
	const residual = evaluate(target, a).torque;
	for (let n = 0; n < 180; n++) {
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i]!,
				c = columns[i]!,
				old = a[id];
			a[id] = THREE.MathUtils.clamp(
				old - residual.dot(c) / (c.lengthSq() + 1e-15),
				0,
				1,
			);
			residual.addScaledVector(c, a[id] - old);
		}
		if (residual.length() < 1e-9) break;
	}
	return { activation: a, residual: residual.length() };
}
function increment(q: THREE.Quaternion, axis: THREE.Vector3, angle: number) {
	return new THREE.Quaternion()
		.setFromAxisAngle(axis, angle)
		.multiply(q)
		.normalize();
}
const axes = [
	new THREE.Vector3(1, 0, 0),
	new THREE.Vector3(0, 1, 0),
	new THREE.Vector3(0, 0, 1),
];
export function equilibrium(
	activation: Activation,
	condition: Condition,
	initial = new THREE.Quaternion(),
) {
	let q = initial.clone(),
		iteration = 0;
	for (; iteration < 45; iteration++) {
		const t = evaluate(q, activation, condition).torque;
		if (t.length() < 1e-8) break;
		const h = 1e-4,
			cols = axes.map((axis) =>
				evaluate(increment(q, axis, h), activation, condition)
					.torque.sub(
						evaluate(increment(q, axis, -h), activation, condition).torque,
					)
					.multiplyScalar(1 / (2 * h)),
			);
		const j = new THREE.Matrix3().set(
			cols[0]!.x,
			cols[1]!.x,
			cols[2]!.x,
			cols[0]!.y,
			cols[1]!.y,
			cols[2]!.y,
			cols[0]!.z,
			cols[1]!.z,
			cols[2]!.z,
		);
		if (Math.abs(j.determinant()) < 1e-16) break;
		const step = t.clone().negate().applyMatrix3(j.invert());
		if (step.length() > 0.12) step.setLength(0.12);
		let improved = false;
		for (let scale = 1; scale >= 1 / 128; scale /= 2) {
			const candidate = increment(
				q,
				step.clone().normalize(),
				step.length() * scale,
			);
			if (rotationVector(candidate).length() > 0.8) continue;
			if (
				evaluate(candidate, activation, condition).torque.length() < t.length()
			) {
				q = candidate;
				improved = true;
				break;
			}
		}
		if (!improved) break;
	}
	const result = evaluate(q, activation, condition);
	return {
		q,
		...result,
		iterations: iteration,
		converged:
			result.torque.length() < 1e-7 &&
			Object.values(result.forces).every(
				(f) => f.normalizedLength >= 0.5 && f.normalizedLength <= 1.8,
			),
	};
}
export function orientation(q: THREE.Quaternion) {
	const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q),
		swing = new THREE.Quaternion().setFromUnitVectors(
			new THREE.Vector3(0, 0, 1),
			f,
		);
	const twist = swing.invert().multiply(q);
	return {
		horizontal: THREE.MathUtils.radToDeg(Math.atan2(f.x, f.z)),
		vertical: THREE.MathUtils.radToDeg(
			Math.asin(THREE.MathUtils.clamp(f.y, -1, 1)),
		),
		torsion: THREE.MathUtils.radToDeg(2 * Math.atan2(twist.z, twist.w)),
	};
}

// Dynamic extension: homogeneous globe inertia, isotropic orbital damping and
// activation timing from Filip et al. Adapt inertia to this globe's 12.2 mm radius.
export const GLOBE_INERTIA = 0.4 * 0.0075 * (WRAP_RADIUS * 0.001) ** 2;
export const ORBITAL_DAMPING = 0.002;
export function velocityFactor(v: number) {
	const t = THREE.MathUtils.clamp(
			(v - curves.velocityStart) / curves.velocityStep,
			0,
			curves.velocity.length - 1,
		),
		i = Math.min(curves.velocity.length - 2, Math.floor(t));
	return {
		value: THREE.MathUtils.lerp(
			curves.velocity[i]!,
			curves.velocity[i + 1]!,
			t - i,
		),
		slope:
			v <= -1 || v >= 1
				? 0
				: (curves.velocity[i + 1]! - curves.velocity[i]!) / curves.velocityStep,
	};
}
export type MechanicalState = {
	q: THREE.Quaternion;
	omega: THREE.Vector3;
	activation: Activation;
};
export function mechanicalState(
	q: THREE.Quaternion,
	activation: Activation,
): MechanicalState {
	return {
		q: q.clone(),
		omega: new THREE.Vector3(),
		activation: { ...activation },
	};
}
export function advance(
	state: MechanicalState,
	command: Activation,
	condition: Condition,
	seconds: number,
) {
	if (!Number.isFinite(seconds) || seconds <= 0) return;
	const count = Math.ceil(Math.min(seconds, 0.1) / 0.002),
		dt = Math.min(seconds, 0.1) / count;
	for (let n = 0; n < count; n++) {
		for (const id of ids)
			state.activation[id] +=
				(command[id] - state.activation[id]) * (1 - Math.exp(-dt / 0.005));
		const e = evaluate(state.q, state.activation, condition),
			base = passiveTorque(state.q),
			terms = ids.map((id) => {
				const f = e.forces[id],
					moment = new THREE.Vector3().fromArray(f.moment);
				base.addScaledVector(moment, f.passive);
				// UPAT vmax is expressed in optimal fibre lengths / second.
				const vmax = {
					MR: 4.6155,
					LR: 3.8484,
					SR: 4.2009,
					IR: 4.1437,
					SO: 4.7648,
					IO: 4.5863,
				}[id];
				return {
					moment,
					active: f.active,
					scale: 1000 / (anatomy[id].optimalLength * vmax),
				};
			});
		// Implicit velocity solve includes force-velocity damping. Explicit Euler at
		// rendering frame intervals is unstable for the globe's very small inertia.
		const v = state.omega.clone(),
			mass = GLOBE_INERTIA / dt + ORBITAL_DAMPING;
		for (let k = 0; k < 12; k++) {
			const residual = v
				.clone()
				.multiplyScalar(mass)
				.addScaledVector(state.omega, -GLOBE_INERTIA / dt)
				.sub(base);
			const j = new THREE.Matrix3().set(mass, 0, 0, 0, mass, 0, 0, 0, mass);
			for (const t of terms) {
				const f = velocityFactor(-t.scale * t.moment.dot(v));
				residual.addScaledVector(t.moment, -t.active * f.value);
				const a = t.moment.toArray(),
					w = t.active * f.slope * t.scale;
				for (let row = 0; row < 3; row++)
					for (let col = 0; col < 3; col++)
						j.elements[col * 3 + row]! += w * a[row]! * a[col]!;
			}
			if (residual.length() < 1e-11) break;
			v.sub(residual.applyMatrix3(j.invert()));
		}
		state.omega.copy(v);
		const speed = v.length();
		if (speed > 1e-12)
			state.q
				.premultiply(
					new THREE.Quaternion().setFromAxisAngle(
						v.clone().divideScalar(speed),
						speed * dt,
					),
				)
				.normalize();
	}
}
