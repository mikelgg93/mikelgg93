import { expect, test } from "bun:test";
import * as THREE from "three";
import { conicAperture, conicSag } from "../src/components/eye/cornea/conic";
import { disposeThree } from "../src/components/eye/disposeThree";
import {
	createPupilReceiver,
	drawPupilGraph,
	type PupilSample,
	parsePupilRtp,
} from "../src/components/eye/pupil/neonPupil";

test("every Q/radius slider step has a valid surface, including the rim", () => {
	for (let ix = 60; ix <= 90; ix++)
		for (let iy = 60; iy <= 90; iy++) {
			for (let iq = -100; iq <= 100; iq++) {
				const rx = ix / 10,
					ry = iy / 10,
					q = iq / 100;
				const r = conicAperture(5, rx, ry, q);
				for (let angle = 0; angle < 16; angle++) {
					const theta = (angle * Math.PI) / 8;
					const z = conicSag(
						r * Math.cos(theta),
						r * Math.sin(theta),
						rx,
						ry,
						q,
					);
					if (!Number.isFinite(z) || z < 0)
						throw new Error(`${rx}, ${ry}, ${q}: ${z}`);
				}
			}
		}
	expect(conicAperture(5, 6, 9, 1)).toBeCloseTo(4.2384, 4);
	expect(conicAperture(5, 6, 9, -1)).toBe(5);
	expect(conicSag(0, 0, 6, 9, 1)).toBe(0);
	expect(() => conicSag(5, 0, 6, 9, 1)).toThrow(RangeError);
});

function rtp(
	left = 3,
	right = 4,
	cc = 0,
	extensionWords = -1,
	padding = 0,
	payloadSize = 65,
) {
	const offset =
		12 + 4 * cc + (extensionWords >= 0 ? 4 + 4 * extensionWords : 0);
	const packet = new Uint8Array(offset + payloadSize + padding);
	const view = new DataView(packet.buffer);
	packet[0] =
		0x80 | cc | (extensionWords >= 0 ? 0x10 : 0) | (padding ? 0x20 : 0);
	packet[1] = 96;
	if (extensionWords >= 0) view.setUint16(12 + 4 * cc + 2, extensionWords);
	view.setFloat32(offset + 9, left);
	view.setFloat32(offset + 37, right);
	if (padding) packet[packet.length - 1] = padding;
	return packet;
}

test("documented Neon pupil offsets survive CSRC, extensions, padding and views", () => {
	for (const size of [65, 89, 105])
		for (const cc of [0, 1, 15]) {
			for (const extension of [-1, 0, 3])
				for (const padding of [0, 4]) {
					const packet = rtp(3.25, 4.5, cc, extension, padding, size);
					const padded = new Uint8Array(packet.length + 7);
					padded.set(packet, 7);
					expect(parsePupilRtp(padded.subarray(7))).toEqual({
						left: 3.25,
						right: 4.5,
					});
				}
		}
});

test("reject malformed RTP, unknown layouts and impossible pupils independently", () => {
	for (const invalid of [NaN, Infinity, -Infinity, -1, 0, 0.5, 10.1, 99]) {
		expect(parsePupilRtp(rtp(invalid, 4))).toEqual({ left: null, right: 4 });
		expect(parsePupilRtp(rtp(3, invalid))).toEqual({ left: 3, right: null });
		expect(parsePupilRtp(rtp(invalid, invalid))).toBeNull();
	}
	const packet = rtp(3, 4, 15, 3);
	for (let size = 0; size < packet.length; size++)
		expect(parsePupilRtp(packet.slice(0, size))).toBeNull();
	for (const byte of [0, 0x40, 0xc0]) {
		const bad = rtp();
		bad[0] = byte;
		expect(parsePupilRtp(bad)).toBeNull();
	}
	const rtcp = rtp();
	rtcp[1] = 200;
	expect(parsePupilRtp(rtcp)).toBeNull();
	for (const count of [0, 255]) {
		const bad = rtp(3, 4, 0, -1, 4);
		bad[bad.length - 1] = count;
		expect(parsePupilRtp(bad)).toBeNull();
	}
	const extension = rtp(3, 4, 0, 0);
	new DataView(extension.buffer).setUint16(14, 65535);
	expect(parsePupilRtp(extension)).toBeNull();
	expect(parsePupilRtp(rtp(3, 4, 0, -1, 0, 66))).toBeNull();
});

function frame(packet: Uint8Array, channel = 0) {
	const bytes = new Uint8Array(packet.length + 4);
	bytes.set([0x24, channel, packet.length >> 8, packet.length & 255]);
	bytes.set(packet, 4);
	return bytes;
}

test("interleaved frames may be split at any byte or coalesced; RTCP is ignored", () => {
	const bytes = frame(rtp());
	for (let split = 0; split <= bytes.length; split++) {
		const samples: PupilSample[] = [];
		const receive = createPupilReceiver((sample) => samples.push(sample));
		receive(bytes.subarray(0, split));
		receive(bytes.subarray(split));
		expect(samples).toEqual([{ left: 3, right: 4 }]);
	}
	const samples: PupilSample[] = [];
	const receive = createPupilReceiver((sample) => samples.push(sample));
	receive(new Uint8Array([1, 2, 3])); // rejected without poisoning the next frame
	receive(new Uint8Array([...bytes, ...frame(rtp(), 1), ...bytes]));
	expect(samples.length).toBe(2);
});

test("graph handles zero, one, many and malformed samples with finite coordinates and gaps", () => {
	let points: number[][] = [];
	let moves = 0;
	const ctx = {
		clearRect() {},
		beginPath() {},
		stroke() {},
		moveTo(x: number, y: number) {
			moves++;
			points.push([x, y]);
		},
		lineTo(x: number, y: number) {
			points.push([x, y]);
		},
	} as unknown as CanvasRenderingContext2D;
	for (const count of [0, 1, 1000]) {
		points = [];
		drawPupilGraph(
			ctx,
			Array.from({ length: count }, () => ({ left: 1, right: 10 })),
			1000,
			112,
		);
		expect(points.length).toBe(2 * count);
		expect(points.flat().every(Number.isFinite)).toBe(true);
	}
	points = [];
	moves = 0;
	drawPupilGraph(
		ctx,
		[
			{ left: 3, right: 4 },
			{ left: NaN, right: Infinity },
			{ left: 3, right: null },
		],
		1000,
		112,
	);
	expect(points.length).toBe(3);
	expect(moves).toBe(3);
	expect(points.flat().every(Number.isFinite)).toBe(true);
});

test("shared geometry/materials are disposed once, including nested wireframes", () => {
	const group = new THREE.Group();
	const geo = new THREE.SphereGeometry();
	const material = new THREE.MeshBasicMaterial();
	const mesh = new THREE.Mesh(geo, material);
	mesh.add(new THREE.Mesh(geo, material));
	group.add(mesh);
	let geometries = 0,
		materials = 0;
	geo.addEventListener("dispose", () => geometries++);
	material.addEventListener("dispose", () => materials++);
	disposeThree(group);
	expect(geometries).toBe(1);
	expect(materials).toBe(1);
});
