// Fixed storage for frame-sampled targets and graph traces. Indices are chronological.
export class SampleRing {
	private times: Float64Array;
	private first: Float64Array;
	private second: Float64Array;
	private head = 0;
	length = 0;
	constructor(readonly capacity: number) {
		if (!Number.isInteger(capacity) || capacity < 1)
			throw new RangeError("Invalid ring capacity");
		this.times = new Float64Array(capacity);
		this.first = new Float64Array(capacity);
		this.second = new Float64Array(capacity);
	}
	clear() {
		this.head = 0;
		this.length = 0;
	}
	push(time: number, first: number, second = 0) {
		this.times[this.head] = time;
		this.first[this.head] = first;
		this.second[this.head] = second;
		this.head = (this.head + 1) % this.capacity;
		this.length = Math.min(this.length + 1, this.capacity);
	}
	private index(i: number) {
		return (this.head - this.length + i + this.capacity) % this.capacity;
	}
	time(i: number) {
		return this.times[this.index(i)]!;
	}
	value(i: number, channel = 0) {
		return (channel === 0 ? this.first : this.second)[this.index(i)]!;
	}
	atOrBefore(time: number, fallback: number) {
		for (let i = this.length - 1; i >= 0; i--)
			if (this.time(i) <= time) return this.value(i);
		return fallback;
	}
}
