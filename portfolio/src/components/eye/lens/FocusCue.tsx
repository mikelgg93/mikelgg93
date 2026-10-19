import type { RefObject } from "react";

export function updateFocusCue(
	node: HTMLDivElement | null,
	demand: number,
	accommodation: number,
) {
	if (!node) return;
	const near = Math.min(1, accommodation / 6);
	node.style.setProperty("--near-blur", `${(1 - near) * 2.5}px`);
	node.style.setProperty("--far-blur", `${near * 2.5}px`);
	const value = node.querySelector("[data-focus-value]");
	if (value) value.textContent = `${accommodation.toFixed(1)} D`;
	const distance = node.querySelector("[data-focus-distance]");
	if (distance)
		distance.textContent =
			demand < 0.05 ? "∞" : `${Math.round(100 / demand)} cm`;
}

export default function FocusCue({
	cueRef,
	lang,
	paused,
	onPause,
	near,
	onNear,
}: {
	cueRef: RefObject<HTMLDivElement | null>;
	lang: "en" | "es";
	paused: boolean;
	onPause: () => void;
	near: boolean;
	onNear: () => void;
}) {
	const es = lang === "es";
	return (
		<div ref={cueRef} className="lens-focus-cue">
			<div className="lens-focus-picture">
				<svg
					viewBox="0 0 120 72"
					role="img"
					aria-label={
						es
							? "Paisaje lejano y libro cercano: ilustración del cambio de enfoque"
							: "Distant landscape and nearby book: illustrative focus change"
					}
				>
					<g
						className="focus-far"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.4"
					>
						<path d="M4 48 29 16 48 38 68 10 111 48Z" />
						<circle cx="101" cy="13" r="5" />
					</g>
					<g
						className="focus-near"
						stroke="currentColor"
						strokeWidth="1.4"
						fill="#092a2a"
					>
						<path d="M32 43Q46 38 60 45Q74 38 88 43V67Q74 62 60 69Q46 62 32 67Z" />
						<path
							d="M60 45V69M38 48l16 3m-16 3 16 3m12-6 16-3m-16 9 16-3"
							fill="none"
						/>
					</g>
				</svg>
				<span>
					{es ? "Objeto" : "Object"}: <span data-focus-distance>∞</span>
				</span>
			</div>
			<div className="lens-focus-readout">
				<span>{es ? "Respuesta modelada" : "Modelled response"}</span>
				<output data-focus-value>0.0 D</output>
				<button
					type="button"
					className="lens-static-focus"
					aria-pressed={near}
					onClick={onNear}
				>
					{near
						? es
							? "Ver lejos"
							: "Show distance"
						: es
							? "Ver cerca"
							: "Show near"}
				</button>
				<button
					className="lens-motion-pause"
					type="button"
					aria-pressed={paused}
					onClick={onPause}
				>
					{paused ? (es ? "Continuar" : "Resume") : es ? "Pausar" : "Pause"}
				</button>
			</div>
		</div>
	);
}
