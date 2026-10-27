import ParameterControl, { useInitialParameters } from "../ParameterControl";
import "../lens/lens.css";
import "./retina.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createLensScene } from "../lens/lensScene";
import {
	createRetinalCup,
	retinalMaterial,
	updateRetinalCup,
} from "./retinaGeometry";
import { CUP_CENTRE_Z, CUP_RADIUS, cupPoint } from "./retinaModel";

export default function RetinaCup({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [wire, setWire] = useState(true),
		[error, setError] = useState(false);
	const params = useRef({ wire });
	useEffect(() => {
		params.current = { wire };
		viewRef.current?.invalidate();
	}, [wire]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 52, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(24, 16, 35);
		view.controls.target.set(0, 0, 6);
		const geometry = createRetinalCup();
		const cup = new THREE.Mesh(geometry, retinalMaterial());
		cup.position.z = 18.4;
		const lines: THREE.Vector3[] = [];
		const add = (u: number, a: number, v: number, b: number) => {
			lines.push(
				new THREE.Vector3(...cupPoint(u, a)),
				new THREE.Vector3(...cupPoint(v, b)),
			);
		};
		for (let ring = 1; ring <= 8; ring++)
			for (let sector = 0; sector < 20; sector++) {
				const a = (sector * Math.PI) / 10,
					b = ((sector + 1) * Math.PI) / 10;
				add(ring / 8, a, ring / 8, b);
				add((ring - 1) / 8, a, ring / 8, a);
				if (ring === 5 && sector === 4) add((ring - 1) / 8, a, ring / 8, b);
			}
		const wireframe = new THREE.LineSegments(
			new THREE.BufferGeometry().setFromPoints(lines),
			new THREE.LineBasicMaterial({
				color: 0xf1c6aa,
				transparent: true,
				opacity: 0.55,
			}),
		);
		const radius = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, CUP_CENTRE_Z),
				new THREE.Vector3(0, 0, CUP_CENTRE_Z - CUP_RADIUS),
			]),
			new THREE.LineDashedMaterial({
				color: 0xa5cac2,
				dashSize: 0.3,
				gapSize: 0.2,
			}),
		);
		radius.computeLineDistances();
		cup.add(radius);

		cup.add(wireframe);
		view.scene.add(cup);
		updateRetinalCup(geometry, 1);
		view.start(() => {
			const p = params.current;
			wireframe.visible = p.wire;
			return {
				state: {
					model: "Posterior spherical cup, R=10.8 mm drawing choice",
					curvature: 1,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const resetAnchor = useRef<HTMLDivElement>(null);
	const defaults = useInitialParameters(
		{ wire },
		(initial) => {
			setWire(initial.wire);
		},
		resetAnchor,
	);
	return (
		<div ref={resetAnchor} className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>{es ? "Una cúpula posterior" : "A posterior dome"}</strong>
				<span className="lens-muted">
					{es ? "Malla de construcción sencilla" : "Sparse construction grid"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Malla de la superficie retiniana posterior"
						: "Mesh of the posterior retinal surface"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				<p className="retina-camera">
					{es
						? "Arrastra para girar · colores ilustrativos"
						: "Drag to orbit · illustrative colours"}
				</p>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					<ParameterControl
						hideReset
						value={wire}
						initial={defaults.wire}
						onReset={setWire}
						label="wireframe"
						lang={lang}
					>
						<button
							type="button"
							aria-pressed={wire}
							onClick={() => setWire(!wire)}
						>
							{es ? "Guía de malla" : "Mesh guide"}
						</button>
					</ParameterControl>
				</div>
				<p className="lens-note">
					{es
						? "Radio elegido: 10.8 mm. La cúpula ya está formada; la guía de malla muestra su construcción."
						: "Chosen radius: 10.8 mm. The dome is already formed; the sparse mesh guide shows its construction."}
				</p>
			</div>
		</div>
	);
}
