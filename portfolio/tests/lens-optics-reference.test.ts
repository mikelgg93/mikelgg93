import { expect, test } from "bun:test";
import { reducedEye } from "../src/components/eye/lens/lensModel";
import { traceGrinRay } from "../src/components/eye/lens/lensOptics";

// Independent reference: x is the independent variable and q = n sin(theta).
// RK4 solves dy/dx=q/px, dq/dx=n(dn/dy)/px. Production uses midpoint steps
// in arc length, integrating position and unit direction instead of momentum.
function referenceRay(height: number, delta: number, h = 0.001) {
	const boundary = (x: number, y: number) => (x * x) / 4 + (y * y) / 20.25;
	let x = -2 * Math.sqrt(1 - (height * height) / 20.25),
		y = height;
	const normal = Math.atan2(-y / 20.25, -x / 4);
	let q =
		1.37 * Math.sin(normal + Math.asin((1.336 / 1.37) * Math.sin(-normal)));
	function derivative(x: number, y: number, q: number) {
		const n = 1.37 + delta * (1 - boundary(x, y)),
			px = Math.sqrt(n * n - q * q);
		return [q / px, (n * ((-2 * delta * y) / 20.25)) / px] as const;
	}
	function step(x: number, y: number, q: number, dx: number) {
		const a = derivative(x, y, q),
			b = derivative(x + dx / 2, y + (dx * a[0]) / 2, q + (dx * a[1]) / 2);
		const c = derivative(x + dx / 2, y + (dx * b[0]) / 2, q + (dx * b[1]) / 2),
			d = derivative(x + dx, y + dx * c[0], q + dx * c[1]);
		return [
			y + (dx * (a[0] + 2 * b[0] + 2 * c[0] + d[0])) / 6,
			q + (dx * (a[1] + 2 * b[1] + 2 * c[1] + d[1])) / 6,
		] as const;
	}
	for (let i = 0; i < 100000; i++) {
		const next = step(x, y, q, h);
		if (x > 0 && boundary(x + h, next[0]) >= 1) {
			let low = 0,
				high = h;
			for (let j = 0; j < 45; j++) {
				const d = (low + high) / 2,
					p = step(x, y, q, d);
				if (boundary(x + d, p[0]) < 1) low = d;
				else high = d;
			}
			const d = (low + high) / 2,
				end = step(x, y, q, d);
			x += d;
			y = end[0];
			q = end[1];
			const normal = Math.atan2(y / 20.25, x / 4),
				inside = Math.asin(q / 1.37);
			const angle =
				normal + Math.asin((1.37 / 1.336) * Math.sin(inside - normal));
			return { x, y, angle, focus: x - y / Math.tan(angle) };
		}
		[y, q] = next;
		x += h;
	}
	throw new Error("Reference failed to exit");
}
function measured(height: number, delta: number, step = 0.02) {
	const ray = traceGrinRay(height, delta, step);
	expect(ray.complete).toBe(true);
	const end = ray.points.at(-2)!,
		angle = Math.atan2(ray.exit!.y, ray.exit!.x);
	return { ...end, angle, focus: end.x - end.y / Math.tan(angle) };
}

test("GRIN agrees with independent momentum/RK4 exit angles and focal intercepts", () => {
	let maxAngle = 0,
		maxFocus = 0;
	for (const height of [0.3, 1, 2.1, 3.2])
		for (const delta of [0, 0.02, 0.05, 0.06]) {
			const ref = referenceRay(height, delta),
				fine = referenceRay(height, delta, 0.0005),
				actual = measured(height, delta);
			expect(Math.abs(ref.angle - fine.angle)).toBeLessThan(1e-10);
			expect(Math.abs(ref.focus - fine.focus)).toBeLessThan(1e-7);
			const angle = Math.abs(ref.angle - actual.angle),
				focus = Math.abs(ref.focus - actual.focus);
			maxAngle = Math.max(maxAngle, angle);
			maxFocus = Math.max(maxFocus, focus);
			expect(angle).toBeLessThan(1e-7); // radians
			expect(focus).toBeLessThan(0.0001); // mm: numerical, not biological accuracy
		}
	console.info(
		`GRIN benchmark maxima: ${maxAngle} rad; ${maxFocus} mm axial intercept`,
	);
});
test("step halving reduces error against the independent reference", () => {
	const errors = [0.04, 0.02, 0.01, 0.005].map((h) =>
		Math.max(
			...[0.3, 1, 2.1, 3.2].flatMap((height) =>
				[0.02, 0.05, 0.06].map((delta) =>
					Math.abs(
						measured(height, delta, h).angle -
							referenceRay(height, delta).angle,
					),
				),
			),
		),
	);
	console.info("Step-halving maximum angular errors:", errors);
	for (let i = 1; i < errors.length; i++)
		expect(errors[i]!).toBeLessThan(errors[i - 1]! * 0.65);
});
test("uniform paraxial focus agrees with the thick-lens transfer matrix", () => {
	// Apex radius b²/a=10.125 mm. SI units for the surface vergences.
	const surface = (1.37 - 1.336) / 0.010125,
		thickness = 0.004;
	const power = 2 * surface - (thickness / 1.37) * surface * surface;
	const backFocalMm =
		(1000 * 1.336 * (1 - (thickness / 1.37) * surface)) / power;
	expect(measured(0.0001, 0).focus - 2).toBeCloseTo(backFocalMm, 5);
});
test("uniform lens obeys Snell at both interfaces and the exact chord intersection", () => {
	for (const height of [0.3, 1, 2.1, 3.2]) {
		const ray = traceGrinRay(height, 0),
			p = ray.points[1]!,
			end = ray.points.at(-2)!;
		const theta = Math.atan2(end.y - p.y, end.x - p.x),
			inward = Math.atan2(-p.y / 20.25, -p.x / 4);
		expect(1.336 * Math.sin(-inward)).toBeCloseTo(
			1.37 * Math.sin(theta - inward),
			10,
		);
		const outward = Math.atan2(end.y / 20.25, end.x / 4),
			exit = Math.atan2(ray.exit!.y, ray.exit!.x);
		expect(1.37 * Math.sin(theta - outward)).toBeCloseTo(
			1.336 * Math.sin(exit - outward),
			10,
		);
		const dx = Math.cos(theta),
			dy = Math.sin(theta),
			a = (dx * dx) / 4 + (dy * dy) / 20.25;
		const distance = (-2 * ((p.x * dx) / 4 + (p.y * dy) / 20.25)) / a;
		expect(end.x).toBeCloseTo(p.x + distance * dx, 8);
		expect(end.y).toBeCloseTo(p.y + distance * dy, 8);
	}
});
test("reduced-eye focus matches independently tabulated vergence cases", () => {
	for (const [demand, capacity, mm] of [
		[0, 8, 22.22222222222222],
		[4, 4, 22.22222222222222],
		[4, 2, 22.988505747126435],
		[8, 0, 25.641025641025642],
	])
		expect(reducedEye(demand!, capacity!).focusDistance * 1000).toBeCloseTo(
			mm!,
			10,
		);
});
