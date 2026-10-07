export type PupilSample = { left: number | null; right: number | null };

// Broad acceptance bounds for this demo, not a diagnostic reference interval.
export function validPupil(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= 1 &&
		value <= 10
	);
}

export function parsePupilRtp(packet: Uint8Array): PupilSample | null {
	if (packet.length < 12 || packet[0]! >>> 6 !== 2) return null;
	// RTCP packet types must not be mistaken for gaze RTP.
	if (packet[1]! >= 192 && packet[1]! <= 223) return null;
	const view = new DataView(
		packet.buffer,
		packet.byteOffset,
		packet.byteLength,
	);
	let offset = 12 + 4 * (packet[0]! & 0x0f);
	if (offset > packet.length) return null;
	if (packet[0]! & 0x10) {
		if (offset + 4 > packet.length) return null;
		offset += 4 + 4 * view.getUint16(offset + 2, false);
		if (offset > packet.length) return null;
	}
	let end = packet.length;
	if (packet[0]! & 0x20) {
		const padding = packet[end - 1]!;
		if (padding === 0 || padding > end - offset) return null;
		end -= padding;
	}
	// Official eye-state layouts: base gaze (9 bytes), then 7 floats per eye.
	// Eyelid/dual-monocular fields in the 89/105-byte layouts follow eye state.
	// https://pupil-labs.github.io/pl-realtime-api/dev/guides/under-the-hood/
	if (![65, 89, 105].includes(end - offset)) return null;
	const rawLeft = view.getFloat32(offset + 9, false);
	const rawRight = view.getFloat32(offset + 37, false);
	const left = validPupil(rawLeft) ? rawLeft : null;
	const right = validPupil(rawRight) ? rawRight : null;
	return left === null && right === null ? null : { left, right };
}

// Companion Monitor's RTSP-over-WebSocket interleaving: '$', channel, length.
// Accept split or coalesced binary messages; skip RTCP (odd channels).
export function createPupilReceiver(onSample: (sample: PupilSample) => void) {
	let pending = new Uint8Array(0);
	return (chunk: Uint8Array) => {
		const bytes = new Uint8Array(pending.length + chunk.length);
		bytes.set(pending);
		bytes.set(chunk, pending.length);
		let offset = 0;
		while (offset < bytes.length) {
			if (bytes[offset] !== 0x24) {
				pending = new Uint8Array(0);
				return;
			}
			if (bytes.length - offset < 4) break;
			const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
			if (bytes.length - offset < length + 4) break;
			if (bytes[offset + 1]! % 2 === 0) {
				const sample = parsePupilRtp(
					bytes.subarray(offset + 4, offset + 4 + length),
				);
				if (sample) onSample(sample);
			}
			offset += 4 + length;
		}
		pending = bytes.slice(offset);
	};
}

export function drawPupilGraph(
	ctx: CanvasRenderingContext2D,
	history: PupilSample[],
	w: number,
	h: number,
) {
	ctx.clearRect(0, 0, w, h);
	ctx.lineWidth = 2;
	for (const [eye, color] of [
		["right", "#3b82f6"],
		["left", "#10b981"],
	] as const) {
		ctx.beginPath();
		ctx.strokeStyle = color;
		let drawing = false;
		for (let i = 0; i < history.length; i++) {
			const value = history[i]![eye];
			if (!validPupil(value)) {
				drawing = false;
				continue;
			}
			const x = history.length > 1 ? (i / (history.length - 1)) * w : 0;
			const y = Math.min(h, Math.max(0, h - ((value - 1) / 9) * h));
			if (drawing) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
			drawing = true;
		}
		ctx.stroke();
	}
}
