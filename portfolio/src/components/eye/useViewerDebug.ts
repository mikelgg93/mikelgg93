import { useEffect, useRef } from "react";

// SVG demos publish model state just as the shared Three.js scene publishes camera state.
export function useViewerDebug(state: object) {
	const root = useRef<HTMLDivElement>(null);
	const snapshot = JSON.stringify(state, null, 2);
	useEffect(() => {
		const output = root.current
			?.closest(".interactive-viewer")
			?.querySelector(".debug-output");
		if (output) output.textContent = snapshot;
	}, [snapshot]);
	return root;
}
