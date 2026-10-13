import { prefetch } from "astro:prefetch";
import { navigate } from "astro:transitions/client";
import { useEffect } from "react";

// Leave scene rotation, sliders, code/table scrolling and browser edge gestures
// to their existing owners. Only a deliberate left swipe over page prose opens
// the menu; a right swipe closes the sidebar or returns an article to its blog
// directory. Passive listeners never prevent ordinary vertical scrolling.
export function useMobileMenuSwipe(
	open: boolean,
	setOpen: (open: boolean) => void,
	blogPath: string,
) {
	// Pages serves directory routes with a trailing slash; avoid a redirect on
	// the gesture's navigation and use the same URL for its prefetch.
	const directoryPath = `${blogPath.replace(/\/$/, "")}/`;

	useEffect(() => {
		// The hidden menu's Blog link rarely receives hover on a phone. Warm the
		// directory after initial rendering, respecting Astro's data-saver checks.
		const timer = window.setTimeout(() => {
			if (
				window.matchMedia("(max-width: 767px)").matches &&
				document.querySelector("article #blog-toc")
			) {
				prefetch(directoryPath);
			}
		}, 1000);
		return () => window.clearTimeout(timer);
	}, [directoryPath]);

	useEffect(() => {
		const mobile = window.matchMedia("(max-width: 767px)");
		let start: {
			id: number;
			x: number;
			y: number;
			time: number;
			inArticle: boolean;
		} | null = null;
		const excluded = (target: EventTarget | null) => {
			if (!(target instanceof Element)) return true;
			const inMenu = target.closest("[data-mobile-menu][data-state='open']");
			if (open && !inMenu) return true;
			if (!open && target.closest("a, [role='dialog']")) return true;
			if (
				target.closest(
					".interactive-viewer, canvas, iframe, video, audio, pre, .table-scroll, .katex-display, button, input, textarea, select, label, [contenteditable]:not([contenteditable='false']), [role='slider'], [popover], [data-no-menu-swipe]",
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
				// Listing previews also use <article>; only a full post has a TOC.
				inArticle:
					event.target instanceof Element &&
					Boolean(event.target.closest("article")?.querySelector("#blog-toc")),
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
			) {
				reset();
				return;
			}
			// An early swipe can precede the scheduled prefetch. Start loading once its
			// direction is clear, but commit navigation only on a completed gesture.
			const dx = touch.clientX - start.x;
			if (
				!open &&
				start.inArticle &&
				dx > 24 &&
				Math.abs(touch.clientY - start.y) < dx * 0.4
			) {
				prefetch(directoryPath);
			}
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
				Math.abs(dx) > 80 &&
				dy < 48 &&
				dy < Math.abs(dx) * 0.4 &&
				event.timeStamp - origin.time < 650
			) {
				if (open) {
					if (dx > 0) setOpen(false);
					return;
				}
				if (dx > 0) {
					if (origin.inArticle) void navigate(directoryPath);
					return;
				}
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
	}, [open, setOpen, directoryPath]);
}
