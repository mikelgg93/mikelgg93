// Rendering visibility only. Consumers decide whether data acquisition continues.
export function observeVisibility(
	element: Element,
	onChange: (active: boolean) => void,
) {
	let intersecting = false;
	let active = false;
	const update = () => {
		const next = intersecting && !document.hidden;
		if (next === active) return;
		active = next;
		onChange(active);
	};
	const observer = new IntersectionObserver(([entry]) => {
		intersecting = entry?.isIntersecting ?? false;
		update();
	});
	observer.observe(element);
	document.addEventListener("visibilitychange", update);
	return () => {
		observer.disconnect();
		document.removeEventListener("visibilitychange", update);
	};
}
