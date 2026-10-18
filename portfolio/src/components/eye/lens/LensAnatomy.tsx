import "./lens.css";
import { useEffect, useRef, useState } from "react";
import { focusDemand } from "./accommodationCycle";
import { createCiliaryApparatus } from "./ciliaryApparatus";
import FocusCue, { updateFocusCue } from "./FocusCue";
import { createLensScene } from "./lensScene";

export default function LensAnatomy({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const cue = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [reveal, setReveal] = useState(0.5);
	const [paused, setPaused] = useState(false);
	const [error, setError] = useState(false);
	const params = useRef({ reveal, paused });
	useEffect(() => {
		params.current = { reveal, paused };
		viewRef.current?.invalidate();
	}, [reveal, paused]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 30, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.up.set(0, 0, 1);
		view.camera.position.set(
			14.442104491645564,
			16.45276657482724,
			20.82527526556307,
		);
		const apparatus = createCiliaryApparatus();
		view.scene.add(apparatus.group);
		let elapsed = 0,
			shown = 0;
		view.start((dt, reducedMotion) => {
			const moving = !params.current.paused && !reducedMotion;
			if (moving) elapsed += dt;
			const target = focusDemand(elapsed);
			if (moving) shown += (target - shown) * (1 - Math.exp(-dt / 0.25));
			const shape = apparatus.update(shown, true, params.current.reveal === 1);
			updateFocusCue(cue.current, target, shown);
			return {
				state: {
					model:
						"Illustrative ciliary body and zonular suspension; automatic near/far sequence",
					accommodation: shown,
					demand: target,
					...shape,
					cutaway: true,
					muscleMapReveal: params.current.reveal,
					paused: !moving,
				},
				animating: moving,
				afterRender: () => {
					if (params.current.reveal <= 0 || params.current.reveal >= 1) return;
					const width = view.renderer.domElement.clientWidth;
					const height = view.renderer.domElement.clientHeight;
					apparatus.update(shown, true, true);
					view.renderer.setScissor(
						0,
						0,
						Math.round(width * params.current.reveal),
						height,
					);
					view.renderer.setScissorTest(true);
					try {
						view.renderer.render(view.scene, view.camera);
					} finally {
						view.renderer.setScissorTest(false);
					}
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "Cuerpo ciliar y suspensión zonular"
						: "Ciliary body and zonular suspension"}
				</strong>
				<span className="lens-muted">
					{es ? "Arrastra para girar" : "Drag to orbit"}
				</span>
			</div>
			<div className="lens-animated-scene">
				{error ? (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				) : (
					<div
						ref={mount}
						className="lens-scene"
						role="img"
						aria-label={
							es
								? "Sección del cuerpo ciliar que acomoda de lejos a cerca"
								: "Ciliary-body cutaway accommodating from far to near"
						}
					/>
				)}
				<FocusCue
					cueRef={cue}
					lang={lang}
					paused={paused}
					onPause={() => setPaused(!paused)}
				/>
				<button
					type="button"
					role="slider"
					aria-label={es ? "Mostrar mapa muscular" : "Reveal muscle map"}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(reveal * 100)}
					className="lens-map-divider"
					style={{ left: `${reveal * 100}%` }}
					onKeyDown={(e) => {
						const value =
							e.key === "Home"
								? 0
								: e.key === "End"
									? 1
									: e.key === "ArrowLeft"
										? reveal - 0.05
										: e.key === "ArrowRight"
											? reveal + 0.05
											: null;
						if (value !== null) {
							e.preventDefault();
							setReveal(Math.max(0, Math.min(1, value)));
						}
					}}
					onPointerDown={(e) => {
						e.stopPropagation();
						e.currentTarget.setPointerCapture(e.pointerId);
					}}
					onPointerMove={(e) => {
						if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
						const rect = e.currentTarget.parentElement!.getBoundingClientRect();
						setReveal(
							Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
						);
					}}
					onPointerUp={(e) =>
						e.currentTarget.releasePointerCapture(e.pointerId)
					}
				>
					<span aria-hidden="true">↔</span>
				</button>
			</div>
			<div className="lens-legend">
				<span style={{ color: "#d4a1bb" }}>Longitudinal</span>
				<span style={{ color: "#e3bb85" }}>Radial</span>
				<span style={{ color: "#e8a28a" }}>Circular</span>
				<span>{es ? "Dorado: zónulas" : "Gold: zonules"}</span>
			</div>
			<p className="lens-note lens-animation-note">
				{es
					? "Arrastra el divisor: mapa muscular a la izquierda, tejido a la derecha. Enfoque y movimiento ilustrativos, no una medida de fuerza ni de potencia óptica."
					: "Drag the divider: muscle map on the left, tissue on the right. Illustrative focus and motion, not a measurement of force or optical power."}
			</p>
		</div>
	);
}
