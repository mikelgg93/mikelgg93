import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

interface Section {
	id: string;
	label: string;
}

export default function MobileArticleToc({
	visible,
	remainingTime,
}: {
	visible: boolean;
	remainingTime: number;
}) {
	const id = useId();
	const trigger = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const [sections, setSections] = useState<Section[]>([]);
	const [active, setActive] = useState("");
	const [open, setOpen] = useState(false);
	const [isEs, setIsEs] = useState(false);
	const [hasContents, setHasContents] = useState(false);

	useEffect(() => {
		setIsEs(document.documentElement.lang === "es");
		setHasContents(Boolean(document.querySelector("article h2")));
	}, []);

	useEffect(() => {
		if (!visible) panel.current?.hidePopover();
	}, [visible]);

	useEffect(() => {
		if (!open) return;
		const viewport = window.visualViewport;
		const desktop = window.matchMedia("(min-width: 1280px)");
		let frame: number | null = null;
		const position = () => {
			frame = null;
			if (desktop.matches) {
				panel.current?.hidePopover();
				return;
			}
			if (!trigger.current || !panel.current) return;
			const pill = trigger.current.getBoundingClientRect();
			const headerBottom =
				document.getElementById("main-header")?.getBoundingClientRect()
					.bottom ?? 0;
			Object.assign(panel.current.style, {
				right: `${document.documentElement.clientWidth - pill.right}px`,
				bottom: `${window.innerHeight - pill.top + 12}px`,
				width: `${Math.min(352, (viewport?.width ?? window.innerWidth) - 48)}px`,
				maxHeight: `${Math.max(0, Math.min((viewport?.height ?? window.innerHeight) * 0.65, pill.top - Math.max(headerBottom, viewport?.offsetTop ?? 0) - 24))}px`,
			});
		};
		// BlogFeatures moves the pill on the next frame when browser toolbars
		// resize the visual viewport. Measure after that update, not before it.
		const schedulePosition = () => {
			if (frame === null) frame = requestAnimationFrame(position);
		};
		position();
		const current = panel.current?.querySelector<HTMLAnchorElement>(
			'[aria-current="location"]',
		);
		current?.focus({ preventScroll: true });
		current?.scrollIntoView({ block: "nearest" });
		window.addEventListener("resize", schedulePosition);
		viewport?.addEventListener("resize", schedulePosition);
		viewport?.addEventListener("scroll", schedulePosition);
		desktop.addEventListener("change", schedulePosition);
		return () => {
			window.removeEventListener("resize", schedulePosition);
			viewport?.removeEventListener("resize", schedulePosition);
			viewport?.removeEventListener("scroll", schedulePosition);
			desktop.removeEventListener("change", schedulePosition);
			if (frame !== null) cancelAnimationFrame(frame);
		};
	}, [open]);

	if (!hasContents) return null;

	return (
		<>
			<button
				ref={trigger}
				type="button"
				popoverTarget={id}
				aria-label={
					isEs
						? `${remainingTime} min. Abrir índice`
						: `${remainingTime} min remaining. Open table of contents`
				}
				aria-expanded={open}
				aria-controls={id}
				tabIndex={visible ? 0 : -1}
				disabled={!visible}
				className="absolute inset-0 rounded-xl pointer-events-auto cursor-pointer xl:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tertiary before:absolute before:inset-x-0 before:-inset-y-2"
				onClick={(event) => {
					if (open) return;
					// Reuse the desktop TOC's labels and anchors without changing it.
					const items = Array.from(
						document.querySelectorAll<HTMLAnchorElement>("#blog-toc-list a"),
					).map((link) => ({
						id: decodeURIComponent(link.hash.slice(1)),
						label: link.textContent ?? "",
					}));
					if (!items.length) {
						event.preventDefault();
						return;
					}
					const headerBottom =
						document.getElementById("main-header")?.getBoundingClientRect()
							.bottom ?? 0;
					const current = items
						.filter(
							(item) =>
								(document.getElementById(item.id)?.getBoundingClientRect()
									.top ?? Infinity) <=
								headerBottom + 32,
						)
						.at(-1);
					setSections(items);
					setActive(current?.id ?? items[0]?.id ?? "");
				}}
			/>
			<div
				ref={panel}
				id={id}
				popover="auto"
				onToggle={(event) => setOpen(event.newState === "open")}
				className="fixed top-auto left-auto m-0 p-0 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl pointer-events-auto overflow-y-auto overscroll-contain xl:hidden"
			>
				<div className="sticky top-0 bg-popover flex items-center justify-between pl-4 pr-1 py-1 border-b border-border">
					<p id={`${id}-title`} className="text-xs font-semibold tracking-wide">
						{isEs ? "En esta página" : "On this page"}
					</p>
					<button
						type="button"
						aria-label={isEs ? "Cerrar índice" : "Close table of contents"}
						className="p-3 rounded-xl hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
						onClick={() => {
							panel.current?.hidePopover();
							trigger.current?.focus({ preventScroll: true });
						}}
					>
						<X className="w-4 h-4" aria-hidden="true" />
					</button>
				</div>
				<nav aria-labelledby={`${id}-title`} className="p-2 text-sm">
					{sections.map((section) => (
						<a
							key={section.id}
							href={`#${section.id}`}
							aria-current={section.id === active ? "location" : undefined}
							className={`block rounded-lg px-3 py-3 leading-snug hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary ${section.id === active ? "bg-muted font-semibold" : "text-muted-foreground"}`}
							onClick={(event) => {
								const heading = document.getElementById(section.id);
								if (!heading) return;
								event.preventDefault();
								panel.current?.hidePopover();
								const offset =
									(document
										.getElementById("main-header")
										?.getBoundingClientRect().height ?? 0) + 16;
								const top =
									window.scrollY + heading.getBoundingClientRect().top - offset;
								if (!heading.hasAttribute("tabindex")) {
									heading.tabIndex = -1;
									heading.addEventListener(
										"blur",
										() => heading.removeAttribute("tabindex"),
										{ once: true },
									);
								}
								heading.focus({ preventScroll: true });
								window.scrollTo({
									top,
									behavior: window.matchMedia(
										"(prefers-reduced-motion: reduce)",
									).matches
										? "instant"
										: "smooth",
								});
								history.replaceState(null, "", `#${section.id}`);
							}}
						>
							{section.label}
						</a>
					))}
				</nav>
			</div>
		</>
	);
}
