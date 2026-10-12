import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Options = {
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
	function visibility() {
		if (document.hidden) suspend();
		else invalidate();
	}
	const observer = new IntersectionObserver(([entry]) => {
		visible = entry?.isIntersecting ?? false;
		if (visible) invalidate();
		else suspend();
	});
	observer.observe(mount);
	const resize = new ResizeObserver(invalidate);
	resize.observe(mount);
	options.controls?.addEventListener("change", invalidate);
	for (const event of ["input", "change", "click"])
		events.addEventListener(event, invalidate);
	viewer?.addEventListener("eye:inspect", inspect);
	document.addEventListener("visibilitychange", visibility);
	motion.addEventListener("change", invalidate);
	inspect();
	return {
		invalidate,
		inspect,
		dispose() {
			disposed = true;
			suspend();
			observer.disconnect();
			resize.disconnect();
			options.controls?.removeEventListener("change", invalidate);
			for (const event of ["input", "change", "click"])
				events.removeEventListener(event, invalidate);
			viewer?.removeEventListener("eye:inspect", inspect);
			document.removeEventListener("visibilitychange", visibility);
			motion.removeEventListener("change", invalidate);
		},
	};
}
