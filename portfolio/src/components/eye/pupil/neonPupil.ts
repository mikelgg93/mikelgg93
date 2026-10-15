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

// Keep Monitor's binaryType: its own message handlers may require Blob data.
// ArrayBuffers parse synchronously; Blob conversion has one bounded FIFO, not
// an ever-growing promise chain. Stop rather than silently lose RTP fragments.
export function createPupilMessageReader(
	onSample: (sample: PupilSample) => void,
	onError: () => void,
) {
	const receive = createPupilReceiver(onSample);
	const queue: (ArrayBuffer | Blob)[] = [];
	let queuedBytes = 0;
	let busy = false;
	let disposed = false;
	const dispose = () => {
		disposed = true;
		queue.length = 0;
		queuedBytes = 0;
	};
	const fail = () => {
		if (!disposed) {
			dispose();
			onError();
		}
	};
	const drain = () => {
		if (busy || disposed) return;
		while (queue.length) {
			const data = queue.shift()!;
			if (Object.prototype.toString.call(data) === "[object ArrayBuffer]") {
				queuedBytes -= (data as ArrayBuffer).byteLength;
				try {
					receive(new Uint8Array(data as ArrayBuffer));
				} catch {
					fail();
					return;
				}
			} else {
				busy = true;
				const blob = data as Blob;
				blob
					.arrayBuffer()
					.then((buffer) => {
						if (!disposed) receive(new Uint8Array(buffer));
					})
					.catch(fail)
					.finally(() => {
						if (disposed) return;
						queuedBytes -= blob.size;
						busy = false;
						drain();
					});
				return;
			}
		}
	};
	return {
		dispose,
		push(data: unknown) {
			if (disposed || typeof data === "string") return;
			const kind = Object.prototype.toString.call(data);
			if (kind !== "[object ArrayBuffer]" && kind !== "[object Blob]") return;
			const size =
				kind === "[object Blob]"
					? (data as Blob).size
					: (data as ArrayBuffer).byteLength;
			if (queue.length >= 64 || queuedBytes + size > 1024 * 1024) {
				fail();
				return;
			}
			queue.push(data as ArrayBuffer | Blob);
			queuedBytes += size;
			drain();
		},
	};
}
