import { expect, test } from "bun:test";
import {
	createPupilMessageReader,
	parsePupilRtp,
} from "../src/components/eye/pupil/neonPupil";
import {
	SCE_RHO_E,
	SCE_RHO10,
	sceEffectiveArea,
} from "../src/components/eye/pupil/pupilOptics";
import { SampleRing } from "../src/components/eye/pupil/sampleRing";

function packet(left = 4, right = 5) {
	const bytes = new Uint8Array(81);
	bytes.set([36, 0, 0, 77, 128, 96]);
	const v = new DataView(bytes.buffer);
	v.setFloat32(25, left, false);
	v.setFloat32(53, right, false);
	return bytes;
}
test("SCE conventions and numerical area integration agree", () => {
	for (const d of [0, 1, 2, 4, 8, 10]) {
		const r = d / 2;
		expect(Math.exp(-SCE_RHO_E * r * r)).toBeCloseTo(
			10 ** (-SCE_RHO10 * r * r),
			12,
		);
		expect(sceEffectiveArea(d)).toBeGreaterThanOrEqual(0);
		expect(sceEffectiveArea(d)).toBeLessThanOrEqual(Math.PI * r * r);
		let sum = 0;
		const n = 10000,
			dr = r / n;
		for (let i = 0; i < n; i++) {
			const x = (i + 0.5) * dr;
			sum += 2 * Math.PI * x * 10 ** (-SCE_RHO10 * x * x) * dr;
		}
		expect(sceEffectiveArea(d)).toBeCloseTo(sum, 6);
	}
});
test("sample ring handles empty/single history, latency boundary, wrap and reset", () => {
	const q = new SampleRing(4);
	expect(q.atOrBefore(1, 6)).toBe(6);
	q.push(0, 4, 7);
	expect(q.atOrBefore(-0.001, 6)).toBe(6);
	expect(q.atOrBefore(0.22 - 0.22, 6)).toBe(4);
	for (let i = 1; i < 10; i++) q.push(i, i + 4, i + 7);
	expect(q.length).toBe(4);
	expect(Array.from({ length: 4 }, (_, i) => q.time(i))).toEqual([6, 7, 8, 9]);
	expect(q.value(3, 1)).toBe(16);
	expect(q.atOrBefore(7.5, 0)).toBe(11);
	q.clear();
	expect(q.length).toBe(0);
	expect(q.atOrBefore(99, 6)).toBe(6);
});
test("Neon synchronous buffers, split frames and invalid eye handling", () => {
	const samples: unknown[] = [];
	let errors = 0;
	const reader = createPupilMessageReader(
		(s) => samples.push(s),
		() => errors++,
	);
	const p = packet(4, Infinity);
	reader.push(p.slice(0, 20).buffer);
	expect(samples).toEqual([]);
	reader.push(p.slice(20).buffer);
	expect(samples).toEqual([{ left: 4, right: null }]);
	expect(parsePupilRtp(packet(NaN, Infinity).subarray(4))).toBeNull();
	reader.push("RTSP/1.0 200 OK");
	expect(errors).toBe(0);
	reader.dispose();
	reader.push(packet().buffer);
	expect(samples.length).toBe(1);
});
test("Blob order and disposal during conversion", async () => {
	const samples: { left: number | null }[] = [];
	let release!: (v: ArrayBuffer) => void;
	const blob = new Blob([packet(3).buffer]);
	blob.arrayBuffer = () =>
		new Promise((resolve) => {
			release = resolve;
		});
	const reader = createPupilMessageReader(
		(s) => samples.push(s),
		() => {
			throw new Error("unexpected");
		},
	);
	reader.push(blob);
	reader.push(packet(7).buffer);
	expect(samples.length).toBe(0);
	release(packet(3).buffer);
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(samples.map((s) => s.left)).toEqual([3, 7]);
	reader.push(blob);
	reader.dispose();
	release(packet(3).buffer);
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(samples.length).toBe(2);
});
test("stalled Blob decoding is bounded and reports one failure", async () => {
	let release!: (v: ArrayBuffer) => void;
	let errors = 0,
		samples = 0;
	const blob = new Blob([packet().buffer]);
	blob.arrayBuffer = () =>
		new Promise((resolve) => {
			release = resolve;
		});
	const reader = createPupilMessageReader(
		() => samples++,
		() => errors++,
	);
	reader.push(blob);
	for (let i = 0; i < 1000; i++) reader.push(packet().buffer);
	expect(errors).toBe(1);
	release(packet().buffer);
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(samples).toBe(0);
});
