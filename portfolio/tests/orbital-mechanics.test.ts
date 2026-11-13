import { expect, test } from "bun:test";
import * as T from "three";
import {
	gazePose,
	gazeTargets,
	muscles,
} from "../src/components/eye/motility/motilityModel";
import {
	advance,
	anatomy,
	equilibrium,
	evaluate,
	lengthFactors,
	mechanicalState,
	musclePath,
	orientation,
	recruitment,
	velocityFactor,
} from "../src/components/eye/motility/orbitalMechanics";

const identity = new T.Quaternion();
test("reference orbital apex is nasal and posterior; oblique origin and trochlea differ", () => {
	for (const id of ["MR", "LR", "SR", "IR"] as const) {
		expect(anatomy[id].origin.x).toBeGreaterThan(10);
		expect(anatomy[id].origin.z).toBeLessThan(-25);
		expect(anatomy[id].insertion.z).toBeGreaterThan(0);
	}
	expect(anatomy.SO.origin.z).toBeLessThan(-25);
	expect(anatomy.SO.guide.z).toBeGreaterThan(0);
	expect(anatomy.SO.insertion.z).toBeLessThan(0);
	expect(anatomy.IO.origin.z).toBeGreaterThan(0);
	expect(anatomy.IO.insertion.z).toBeLessThan(0);
});
test("muscle moments agree with virtual work through all gaze directions", () => {
	const axes = [
			new T.Vector3(1, 0, 0),
			new T.Vector3(0, 1, 0),
			new T.Vector3(0, 0, 1),
		],
		h = 1e-5;
	for (const g of gazeTargets)
		for (const m of muscles) {
			const q = gazePose(g.h, g.v),
				p = musclePath(m.id, q);
			for (const axis of axes) {
				const plus = new T.Quaternion().setFromAxisAngle(axis, h).multiply(q),
					minus = new T.Quaternion().setFromAxisAngle(axis, -h).multiply(q);
				const gradient =
					((musclePath(m.id, plus).length - musclePath(m.id, minus).length) /
						(2 * h)) *
					0.001;
				expect(Math.abs(gradient + p.moment.dot(axis))).toBeLessThan(1e-7);
			}
		}
});
test("primary muscle action signs include torsion and oblique vertical effects", () => {
	const moment = (id: (typeof muscles)[number]["id"]) =>
		musclePath(id, identity).moment;
	expect(moment("MR").y).toBeGreaterThan(0);
	expect(moment("LR").y).toBeLessThan(0);
	expect(moment("SR").x).toBeLessThan(0);
	expect(moment("SR").z).toBeLessThan(0);
	expect(moment("IR").x).toBeGreaterThan(0);
	expect(moment("IR").z).toBeGreaterThan(0);
	expect(moment("SO").x).toBeGreaterThan(0);
	expect(moment("SO").z).toBeLessThan(0);
	expect(moment("SO").y).toBeLessThan(0);
	expect(moment("IO").x).toBeLessThan(0);
	expect(moment("IO").z).toBeGreaterThan(0);
	expect(moment("IO").y).toBeLessThan(0);
});
test("OpenSim curve samples preserve the reference normalised force values", () => {
	expect(lengthFactors(1).active).toBeCloseTo(1, 8);
	expect(lengthFactors(1).passive).toBeCloseTo(0.05332028328559634, 8);
	expect(lengthFactors(0.82).passive).toBeCloseTo(0, 8);
	expect(lengthFactors(1.4).passive).toBeCloseTo(1, 8);
});
test("all nine gaze positions and perturbations converge with bounded tensile forces", () => {
	for (const g of gazeTargets) {
		const q = gazePose(g.h, g.v),
			command = recruitment(q);
		expect(command.residual).toBeLessThan(1e-7);
		for (const c of [
			"baseline",
			"lr-weakness",
			"so-weakness",
			"ir-restriction",
		] as const) {
			const result = equilibrium(command.activation, c, q);
			expect(result.converged).toBe(true);
			expect(result.torque.length()).toBeLessThan(1e-7);
			for (const f of Object.values(result.forces)) {
				expect(f.total).toBeGreaterThanOrEqual(0);
				expect(f.normalizedLength).toBeGreaterThan(0.5);
				expect(f.normalizedLength).toBeLessThan(1.8);
			}
			if (c === "baseline") expect(result.q.angleTo(q)).toBeLessThan(1e-4);
			// Test stability: small angular perturbations should do negative restoring work.
			for (const axis of [
				new T.Vector3(1, 0, 0),
				new T.Vector3(0, 1, 0),
				new T.Vector3(0, 0, 1),
			]) {
				const perturbed = new T.Quaternion()
					.setFromAxisAngle(axis, 1e-4)
					.multiply(result.q);
				expect(
					evaluate(perturbed, command.activation, c).torque.dot(axis),
				).toBeLessThan(0);
			}
		}
	}
});
test("weakness and restriction change the solution rather than the prescribed target", () => {
	const a = recruitment(identity).activation;
	const lr = orientation(equilibrium(a, "lr-weakness").q),
		so = orientation(equilibrium(a, "so-weakness").q),
		ir = orientation(equilibrium(a, "ir-restriction").q);
	expect(lr.horizontal).toBeGreaterThan(0);
	expect(so.vertical).toBeGreaterThan(0);
	expect(so.torsion).toBeGreaterThan(0);
	expect(ir.vertical).toBeLessThan(0);
});

test("browser interpolation matches independent off-grid OpenSim 4.6 evaluations", () => {
	// Evaluated directly with UPAT v4 Millard2012EquilibriumMuscle curves in OpenSim,
	// at points deliberately absent from the exported 0.005-spaced lookup table.
	for (const [x, active, passive] of [
		[0.823, 0.6951999996881552, 0.000002369269048972267],
		[0.973, 0.998982954743793, 0.03771073273590483],
		[1.123, 0.9273179721065661, 0.20516100487577485],
		[1.373, 0.5742811944117017, 0.9069661088788953],
	]) {
		const f = lengthFactors(x!);
		expect(Math.abs(f.active - active!)).toBeLessThan(2e-4);
		expect(Math.abs(f.passive - passive!)).toBeLessThan(2e-4);
	}
});

test("dynamic force integration reaches the static solution independently of rendering rate", () => {
	const start = recruitment(identity).activation,
		target = gazePose(-15, 15),
		command = recruitment(target).activation;
	for (const condition of [
		"baseline",
		"lr-weakness",
		"so-weakness",
		"ir-restriction",
	] as const) {
		const expected = equilibrium(command, condition, target);
		for (const hz of [30, 60, 120]) {
			const state = mechanicalState(identity, start);
			for (let i = 0; i < hz * 3; i++)
				advance(state, command, condition, 1 / hz);
			expect(state.q.angleTo(expected.q)).toBeLessThan(1e-4);
			expect(state.omega.length()).toBeLessThan(1e-4);
			expect(state.q.length()).toBeCloseTo(1, 10);
		}
	}
});
test("force-velocity curve distinguishes shortening and lengthening", () => {
	expect(velocityFactor(-1).value).toBe(0);
	expect(velocityFactor(0).value).toBe(1);
	expect(velocityFactor(1).value).toBe(1.4);
	expect(velocityFactor(-0.5).value).toBeCloseTo(0.15808560444169842, 8);
	expect(velocityFactor(0.5).value).toBeCloseTo(1.3311315693144758, 8);
});

test("both eyes align to the same distant target under the mirrored coordinate convention", () => {
	for (const g of gazeTargets) {
		const right = new T.Vector3(0, 0, 1).applyQuaternion(gazePose(g.h, g.v)),
			left = new T.Vector3(0, 0, 1).applyQuaternion(gazePose(-g.h, g.v));
		left.x *= -1;
		expect(left.distanceTo(right)).toBeLessThan(1e-12);
	}
});
test("dynamic transitions across the full gaze grid reach stable equilibria for every scenario", () => {
	for (const c of [
		"baseline",
		"lr-weakness",
		"so-weakness",
		"ir-restriction",
	] as const) {
		const state = mechanicalState(identity, recruitment(identity).activation);
		for (const g of gazeTargets) {
			const target = gazePose(g.h, g.v),
				command = recruitment(target).activation,
				expected = equilibrium(command, c, target);
			for (let i = 0; i < 360; i++) advance(state, command, c, 1 / 60);
			expect(state.q.angleTo(expected.q)).toBeLessThan(1e-4);
			expect(state.omega.length()).toBeLessThan(1e-4);
		}
	}
});
