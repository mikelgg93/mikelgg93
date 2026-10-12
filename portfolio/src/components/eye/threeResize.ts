import type * as THREE from "three";

// Every WebGL demo in this series mounts inside InteractiveViewer.astro's
// "preview" slot, whose size can change independently of the browser window
// (switching to the Code/Debug tab and back, responsive breakpoints, sidebar
// toggles). A `window.resize` listener misses all of that — only a
// ResizeObserver on the component's own mount element sees it. Every demo
// should use this instead of hand-rolling its own resize wiring.
export function observeThreeResize(
	container: HTMLElement,
	renderer: THREE.WebGLRenderer,
	camera: THREE.PerspectiveCamera,
	onResize?: () => void,
): ResizeObserver {
	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const { width, height } = entry.contentRect;
			if (width === 0 || height === 0) continue;
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			onResize?.();
		}
	});
	resizeObserver.observe(container);
	return resizeObserver;
}
