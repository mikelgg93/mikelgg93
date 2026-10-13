import { useEffect } from "react";

// Leave scene rotation, sliders, code/table scrolling and browser edge gestures
// to their existing owners. Only a deliberate left swipe over page prose opens
// the menu; passive listeners never prevent ordinary vertical scrolling.
export function useMobileMenuSwipe(
	open: boolean,
	setOpen: (open: boolean) => void,
) {
	useEffect(() => {
		const mobile = window.matchMedia("(max-width: 767px)");
		let start: { id: number; x: number; y: number; time: number } | null = null;
		const excluded = (target: EventTarget | null) => {
			if (!(target instanceof Element)) return true;
			if (
				target.closest(
					".interactive-viewer, canvas, iframe, video, audio, pre, .table-scroll, .katex-display, a, button, input, textarea, select, label, [contenteditable]:not([contenteditable='false']), [role='slider'], [role='dialog'], [popover], [data-no-menu-swipe]",
				)
			)
				return true;
			for (
				let element: Element | null = target;
				element && element !== document.body;
				element = element.parentElement
			) {
				if (
					element.scrollWidth > element.clientWidth + 1 &&
					/auto|scroll/.test(getComputedStyle(element).overflowX)
				)
					return true;
			}
			return false;
		};
		const reset = () => {
			start = null;
		};
		const onStart = (event: TouchEvent) => {
			reset();
			if (
				open ||
				!mobile.matches ||
				event.touches.length !== 1 ||
				excluded(event.target) ||
				(window.visualViewport && window.visualViewport.scale !== 1)
			)
				return;
			if (window.getSelection()?.isCollapsed === false) return;
			const touch = event.touches[0];
			if (!touch) return;
			if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
			start = {
				id: touch.identifier,
				x: touch.clientX,
				y: touch.clientY,
				time: event.timeStamp,
			};
		};
		const onMove = (event: TouchEvent) => {
			if (!start) return;
			const touch = event.touches[0];
			if (
				event.touches.length !== 1 ||
				!touch ||
				touch.identifier !== start.id ||
				Math.abs(touch.clientY - start.y) > 48
			)
				reset();
		};
		const onEnd = (event: TouchEvent) => {
			const origin = start;
			reset();
			if (!origin || event.touches.length || event.defaultPrevented) return;
			const touch = Array.from(event.changedTouches).find(
				(item) => item.identifier === origin.id,
			);
			if (!touch || window.getSelection()?.isCollapsed === false) return;
			const dx = touch.clientX - origin.x;
			const dy = Math.abs(touch.clientY - origin.y);
			if (
				dx < -80 &&
				dy < 48 &&
				dy < -dx * 0.4 &&
				event.timeStamp - origin.time < 650
			) {
				document
					.querySelectorAll<HTMLElement>("[popover]:popover-open")
					.forEach((popover) => {
						popover.hidePopover();
					});
				setOpen(true);
			}
		};
		const onResize = () => {
			reset();
			if (!mobile.matches) setOpen(false);
		};
		document.addEventListener("touchstart", onStart, { passive: true });
		document.addEventListener("touchmove", onMove, { passive: true });
		document.addEventListener("touchend", onEnd, { passive: true });
		document.addEventListener("touchcancel", reset, { passive: true });
		mobile.addEventListener("change", onResize);
		return () => {
			document.removeEventListener("touchstart", onStart);
			document.removeEventListener("touchmove", onMove);
			document.removeEventListener("touchend", onEnd);
			document.removeEventListener("touchcancel", reset);
			mobile.removeEventListener("change", onResize);
		};
	}, [open, setOpen]);
}
