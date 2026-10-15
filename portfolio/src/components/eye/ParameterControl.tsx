import { Info, RotateCcw } from "lucide-react";
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import "./parameter-control.css";

export type ParameterContext = {
	basis: "Measured" | "Literature-derived" | "Illustrative";
	text: string;
	source?: { label: string; href: string };
};

export function ParameterInfo({
	label,
	context,
}: {
	label: string;
	context: ParameterContext;
}) {
	const id = useId();
	const trigger = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const [open, setOpen] = useState(false);
	const pinned = useRef(false);
	const show = () => {
		clearTimeout(closeTimer.current);
		panel.current?.showPopover();
	};
	const hide = () => {
		clearTimeout(closeTimer.current);
		closeTimer.current = setTimeout(() => {
			if (
				!pinned.current &&
				!panel.current?.contains(document.activeElement) &&
				document.activeElement !== trigger.current
			)
				panel.current?.hidePopover();
		}, 150);
	};
	useEffect(() => () => clearTimeout(closeTimer.current), []);
	useEffect(() => {
		if (!open) return;
		const position = () => {
			if (!trigger.current || !panel.current) return;
			const rect = trigger.current.getBoundingClientRect();
			const width = Math.min(300, window.innerWidth - 24);
			panel.current.style.width = `${width}px`;
			panel.current.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
			const height = panel.current.getBoundingClientRect().height;
			panel.current.style.top = `${Math.max(12, rect.bottom + height + 12 < window.innerHeight ? rect.bottom + 6 : rect.top - height - 6)}px`;
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				pinned.current = false;
				panel.current?.hidePopover();
			}
		};
		position();
		window.addEventListener("scroll", position, true);
		window.addEventListener("resize", position);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			window.removeEventListener("scroll", position, true);
			window.removeEventListener("resize", position);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [open]);
	return (
		<>
			<button
				ref={trigger}
				type="button"
				className="parameter-icon"
				aria-label={`About ${label}`}
				aria-expanded={open}
				aria-controls={id}
				onPointerEnter={(event) => {
					if (event.pointerType !== "touch") show();
				}}
				onPointerLeave={hide}
				onFocus={show}
				onBlur={hide}
				onClick={(event) => {
					event.stopPropagation();
					pinned.current = !pinned.current;
					if (pinned.current) show();
					else panel.current?.hidePopover();
				}}
			>
				<Info size={14} aria-hidden="true" />
			</button>
			<div
				id={id}
				ref={panel}
				popover="auto"
				className="parameter-info not-prose"
				onToggle={(event) => {
					setOpen(event.newState === "open");
					if (event.newState === "closed") pinned.current = false;
				}}
				onPointerEnter={() => clearTimeout(closeTimer.current)}
				onPointerLeave={hide}
				onFocus={show}
				onBlur={hide}
			>
				<strong>{context.basis}</strong>
				<p>{context.text}</p>
				{context.source && (
					<a href={context.source.href} target="_blank" rel="noreferrer">
						{context.source.label}
					</a>
				)}
			</div>
		</>
	);
}

// Capture the actual first rendered configuration, including prop-dependent
// defaults. No persisted/URL settings are applied to these demos; normal renders
// never overwrite a user's choices. Reset restores this mount's starting state.
export function useInitialParameters<T>(
	values: T,
	onReset: (initial: T) => void,
	anchor: RefObject<HTMLElement | null>,
) {
	const initial = useRef(values);
	const action = useRef(onReset);
	action.current = onReset;
	useEffect(() => {
		const viewer = anchor.current?.closest(".interactive-viewer");
		const reset = () => action.current(initial.current);
		viewer?.addEventListener("eye:reset", reset);
		return () => viewer?.removeEventListener("eye:reset", reset);
	}, [anchor]);
	return initial.current;
}

export default function ParameterControl<T>({
	value,
	initial,
	onReset,
	label,
	context,
	children,
	lang = "en",
	className = "",
	hideReset = false,
}: {
	value: T;
	initial: T;
	onReset: (initial: T) => void;
	label: string;
	context?: ParameterContext;
	children: ReactNode;
	lang?: "en" | "es";
	className?: string;
	hideReset?: boolean;
}) {
	return (
		<div className={`parameter-control ${className}`}>
			<div className="parameter-field">{children}</div>
			<div className="parameter-tools">
				{context && <ParameterInfo label={label} context={context} />}
				{!hideReset && (
					<button
						type="button"
						className="parameter-icon"
						aria-label={`${lang === "es" ? "Restablecer" : "Reset"} ${label}`}
						title={lang === "es" ? "Valor inicial" : "Original value"}
						disabled={Object.is(value, initial)}
						onClick={() => onReset(initial)}
					>
						<RotateCcw size={14} aria-hidden="true" />
					</button>
				)}
			</div>
		</div>
	);
}
