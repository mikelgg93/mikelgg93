import "./presentation.css";
import { useEffect, useRef, useState } from "react";
import { createLensScene } from "../lens/lensScene";
import { createConstructionScene } from "./constructionScene";
import { steps } from "./steps";

type FullscreenDocument = Document & {
	webkitFullscreenElement?: Element;
	webkitExitFullscreen?: () => void;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };

export default function EyeConstruction({
	standalone = false,
}: {
	standalone?: boolean;
}) {
	const article = (slug: string) =>
		standalone
			? `https://github.com/mikelgg93/mikelgg93/blob/webgl-eye-04-retina/portfolio/src/content/blog/${slug}.mdx`
			: `/blog/${slug}/`;
	const [slide, setSlide] = useState(0),
		[playing, setPlaying] = useState(true),
		[error, setError] = useState(false),
		[fullscreen, setFullscreen] = useState(false),
		[fullscreenNotice, setFullscreenNotice] = useState("");
	const mount = useRef<HTMLDivElement>(null),
		root = useRef<HTMLDivElement>(null),
		badge = useRef<HTMLOutputElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const clock = useRef({ step: 0, progress: 0, playing: true });
	useEffect(() => {
		const doc = document as FullscreenDocument;
		const changed = () =>
			setFullscreen(
				Boolean(doc.fullscreenElement || doc.webkitFullscreenElement),
			);
		document.addEventListener("fullscreenchange", changed);
		document.addEventListener("webkitfullscreenchange", changed);
		return () => {
			document.removeEventListener("fullscreenchange", changed);
			document.removeEventListener("webkitfullscreenchange", changed);
		};
	}, []);
	async function toggleFullscreen() {
		const doc = document as FullscreenDocument;
		const element = root.current as FullscreenElement | null;
		setFullscreenNotice("");
		try {
			if (doc.fullscreenElement || doc.webkitFullscreenElement) {
				if (doc.exitFullscreen) await doc.exitFullscreen();
				else doc.webkitExitFullscreen?.();
			} else if (element?.requestFullscreen) await element.requestFullscreen();
			else if (element?.webkitRequestFullscreen)
				element.webkitRequestFullscreen();
			else
				setFullscreenNotice(
					"This browser does not offer page fullscreen. On iPhone, use Safari’s Share → Add to Home Screen, then open the saved slides.",
				);
		} catch {
			setFullscreenNotice(
				"Fullscreen was not available. On iPhone, try Safari’s Share → Add to Home Screen, then open the saved slides.",
			);
		}
	}
	function go(index: number) {
		const next = Math.min(steps.length - 1, Math.max(0, index));
		clock.current = { step: next, progress: 0, playing: true };
		setSlide(next);
		setPlaying(true);
		viewRef.current?.invalidate();
		history.replaceState(null, "", `#step-${next + 1}`);
	}
	const firstSlide = useRef(true);
	useEffect(() => {
		if (firstSlide.current) {
			firstSlide.current = false;
			return;
		}
		if (!window.matchMedia("(max-width: 760px)").matches) return;
		const frame = requestAnimationFrame(() => {
			const heading = root.current?.querySelector<HTMLElement>("h1");
			const chapter = root.current?.querySelector(".deck-chapter");
			heading?.focus({ preventScroll: true });
			chapter?.scrollIntoView({ block: "start", behavior: "instant" });
		});
		return () => cancelAnimationFrame(frame);
	}, [slide]);
	function playPause() {
		const state = clock.current;
		if (state.progress >= 1) state.progress = 0;
		state.playing = !state.playing;
		setPlaying(state.playing);
		viewRef.current?.invalidate();
	}
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 32);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		const model = createConstructionScene(view);
		let previousStep = -1,
			previousProgress = -1;
		view.start((dt, reducedMotion) => {
			const state = clock.current;
			if (state.playing) {
				state.progress = reducedMotion
					? 1
					: Math.min(1, state.progress + dt / 2.6);
				if (state.progress === 1) {
					state.playing = false;
					setPlaying(false);
				}
			}
			view.controls.enableRotate = !state.playing;
			if (state.step !== previousStep || state.progress !== previousProgress) {
				const lesson = steps[state.step]!;
				const label = model.update(lesson.stage, state.progress, lesson.detail);
				if (badge.current)
					badge.current.textContent = label ?? steps[state.step]!.value;
				if (root.current) {
					root.current.dataset.step = String(state.step);
					root.current.dataset.progress = state.progress.toFixed(3);
				}
				previousStep = state.step;
				previousProgress = state.progress;
			}
			return {
				state: { slide: state.step + 1, progress: state.progress },
				animating: state.playing,
			};
		});
		function keys(event: KeyboardEvent) {
			if (
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				(event.target instanceof Element &&
					event.target.closest("input,select,textarea,[contenteditable]"))
			)
				return;
			if (event.key === "ArrowRight" || event.key === "PageDown") {
				event.preventDefault();
				go(clock.current.step + 1);
			} else if (event.key === "ArrowLeft" || event.key === "PageUp") {
				event.preventDefault();
				go(clock.current.step - 1);
			} else if (event.key === "Home") {
				event.preventDefault();
				go(0);
			} else if (event.key === "End") {
				event.preventDefault();
				go(steps.length - 1);
			} else if (event.key.toLowerCase() === "r") {
				event.preventDefault();
				go(clock.current.step);
			} else if (
				event.code === "Space" &&
				!(event.target instanceof Element && event.target.closest("button,a"))
			) {
				event.preventDefault();
				playPause();
			}
		}
		document.addEventListener("keydown", keys);
		const hash = /^#step-(\d+)$/.exec(location.hash);
		if (hash) go(Number(hash[1]) - 1);
		return () => {
			document.removeEventListener("keydown", keys);
			viewRef.current = null;
			view.dispose();
		};
	}, []);
	const current = steps[slide]!;
	return (
		<main className="construction" ref={root} data-step="0" data-progress="0">
			<header className="deck-header">
				<a href={article("webgl-eye-03-lens")} className="deck-brand">
					MGG <span>/ WebGL eye</span>
				</a>
				<div className="deck-header-actions">
					<span className="deck-label">Build it in Three.js</span>
					<button
						type="button"
						aria-pressed={fullscreen}
						onClick={() => void toggleFullscreen()}
					>
						{fullscreen ? "Exit fullscreen" : "Fullscreen"}
					</button>
				</div>
			</header>
			{fullscreenNotice && (
				<p className="deck-fullscreen-notice" role="status">
					{fullscreenNotice}
				</p>
			)}
			<section className="deck-body">
				<div className="deck-copy" key={slide}>
					<p className="deck-chapter">
						<span>{String(slide + 1).padStart(2, "0")}</span> {current.chapter}
					</p>
					<h1 aria-live="polite" tabIndex={-1}>
						{current.title}
					</h1>
					<p className="deck-description">{current.text}</p>
					<pre className="deck-code">
						<code>{current.code}</code>
					</pre>
					<p className="deck-note">{current.note}</p>
				</div>
				<div className="deck-visual">
					<div
						ref={mount}
						className="deck-stage"
						role="img"
						aria-label={`Animated construction: ${current.title}`}
					>
						{error && (
							<p className="deck-error" role="status">
								WebGL is unavailable here. The step-by-step text and code remain
								readable.
							</p>
						)}
					</div>
					<div className="deck-stage-meta">
						<output ref={badge}>{current.value}</output>
						<button
							type="button"
							onClick={playPause}
							aria-label={
								playing ? "Pause animation" : "Play or replay animation"
							}
						>
							{playing
								? "Pause"
								: clock.current.progress < 1
									? "Resume"
									: "Replay"}
						</button>
					</div>
				</div>
			</section>
			<footer className="deck-footer">
				<span className="deck-location" aria-live="polite">
					{String(slide + 1).padStart(2, "0")} / {steps.length}
				</span>
				<p className="deck-keys">← → steps · space to pause · drag to orbit</p>
				<nav aria-label="Presentation navigation">
					<button
						type="button"
						disabled={slide === 0}
						onClick={() => go(slide - 1)}
					>
						← Previous
					</button>
					<button
						type="button"
						disabled={slide === steps.length - 1}
						onClick={() => go(slide + 1)}
					>
						Next →
					</button>
				</nav>
			</footer>
			<details className="deck-sources">
				<summary>Code & references</summary>
				<p>
					The slides show construction excerpts, using Three.js to draw with
					WebGL. Read the complete{" "}
					<a href="https://github.com/mikelgg93/mikelgg93/tree/webgl-eye-04-retina/portfolio/src/components/eye/presentation">
						presentation source
					</a>{" "}
					and its linked model helpers for the loops, shaders and resource
					cleanup. Press R to replay; Home / End jump to the first / last step.
				</p>
				<p>
					This is an original construction lesson using the models in{" "}
					<a href={article("webgl-eye-01-cornea")}>Cornea</a>,{" "}
					<a href={article("webgl-eye-02-pupil")}>Pupil</a>,{" "}
					<a href={article("webgl-eye-03-lens")}>Lens</a> and{" "}
					<a href={article("webgl-eye-04-retina")}>Retina</a>. Their references
					support the science; mesh dimensions, lighting and animation timing
					are teaching choices.{" "}
					<a href="https://www.moorfields.nhs.uk/mediaLocal/ojzfucri/cataract-service_1.pdf">
						Moorfields, p. 4
					</a>
					, describes the retained capsule supporting an IOL. No external image
					assets are used in these scenes.
				</p>
			</details>
		</main>
	);
}
