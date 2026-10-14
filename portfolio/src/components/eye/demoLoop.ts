import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { observeVisibility } from "./visibility";

type Options = {
	reset?: () => void;
	controls?: OrbitControls;
	draw: (dt: number, elapsed: number, reducedMotion: boolean) => boolean;
	inspect: () => object;
	continuous?: (reducedMotion: boolean) => boolean;
};

// One owner for frames and Debug. Hidden previews suspend GPU work and clocks;
// opening Debug takes a snapshot without rendering an invisible canvas.
export function createDemoLoop(mount: HTMLElement, options: Options) {
	const viewer = mount.closest(".interactive-viewer");
	const events = viewer ?? mount;
	const debug = viewer?.querySelector(".debug-output");
	const motion = matchMedia("(prefers-reduced-motion: reduce)");
	const orbitDamping = options.controls?.enableDamping ?? false;
	if (options.controls && motion.matches)
		options.controls.enableDamping = false;
	let visible = false;
	let disposed = false;
	let drawing = false;
	let frame = 0;
	let lastTime = 0;
	let elapsed = 0;
	let lastDebug = -Infinity;
	function inspect() {
		if (debug && !disposed)
			debug.textContent = JSON.stringify(options.inspect(), null, 2);
	}
	function invalidate() {
		if (!disposed && visible && !document.hidden && !frame && !drawing)
			frame = requestAnimationFrame(animate);
	}
	function animate(now: number) {
		frame = 0;
		if (disposed || !visible || document.hidden) return;
		drawing = true;
		const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
		lastTime = now;
		elapsed += dt;
		const cameraMoving = options.controls?.update() ?? false;
		const animating = options.draw(dt, elapsed, motion.matches);
		if (now - lastDebug >= 150 || (!animating && !cameraMoving)) {
			inspect();
			lastDebug = now;
		}
		drawing = false;
		if (animating || cameraMoving || options.continuous?.(motion.matches))
			invalidate();
	}
	function suspend() {
		cancelAnimationFrame(frame);
		frame = 0;
		lastTime = 0;
	}
	const stopVisibility = observeVisibility(
		mount.closest(".pupil-demo") ?? mount,
		(active) => {
			visible = active;
			if (active) invalidate();
			else suspend();
		},
	);
	options.controls?.saveState();
	function reset() {
		suspend();
		elapsed = 0;
		options.reset?.();
		if (options.controls) {
			const damping = options.controls.enableDamping;
			options.controls.enableDamping = false;
			options.controls.update();
			options.controls.reset();
			options.controls.enableDamping = damping;
		}
		invalidate();
		inspect();
	}
	viewer?.addEventListener("eye:reset", reset);
	viewer?.addEventListener("eye:reset-camera", reset);
	const resize = new ResizeObserver(invalidate);
	resize.observe(mount);
	options.controls?.addEventListener("change", invalidate);
	for (const event of ["input", "change", "click"])
		events.addEventListener(event, invalidate);
	viewer?.addEventListener("eye:inspect", inspect);
	function motionChanged() {
		if (options.controls)
			options.controls.enableDamping = !motion.matches && orbitDamping;
		invalidate();
	}
	motion.addEventListener("change", motionChanged);
	inspect();
	return {
		invalidate,
		inspect,
		dispose() {
			disposed = true;
			suspend();
			stopVisibility();
			viewer?.removeEventListener("eye:reset", reset);
			viewer?.removeEventListener("eye:reset-camera", reset);
			resize.disconnect();
			options.controls?.removeEventListener("change", invalidate);
			for (const event of ["input", "change", "click"])
				events.removeEventListener(event, invalidate);
			viewer?.removeEventListener("eye:inspect", inspect);
			motion.removeEventListener("change", motionChanged);
		},
	};
}
