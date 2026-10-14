import ParameterControl, { useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import "../lens/lens.css";
import "./retina.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createLensScene } from "../lens/lensScene";
import { receptorMosaic } from "./retinaModel";

export default function RetinaMosaic({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null),
		viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [central, setCentral] = useState(true),
		[top, setTop] = useState(false),
		[error, setError] = useState(false);
	const params = useRef({ central, top });
	useEffect(() => {
		params.current = { central, top };
		viewRef.current?.invalidate();
	}, [central, top]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 22, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		const cones = new THREE.InstancedMesh(
			new THREE.CylinderGeometry(0.1, 0.18, 1, 12),
			new THREE.MeshPhongMaterial({ color: 0xe5b773, shininess: 30 }),
			441,
		);
		const rods = new THREE.InstancedMesh(
			new THREE.CylinderGeometry(0.085, 0.085, 1, 10),
			new THREE.MeshPhongMaterial({ color: 0x91bbb9, shininess: 20 }),
			441,
		);
		view.scene.add(cones, rods);
		const backing = new THREE.Mesh(
			new THREE.CircleGeometry(4.95, 64),
			new THREE.MeshPhongMaterial({ color: 0x493631, side: THREE.DoubleSide }),
		);
		backing.position.z = 1.6;
		view.scene.add(backing);
		const transform = new THREE.Object3D();
		let lastCentral: boolean | undefined, lastTop: boolean | undefined;
		view.start(() => {
			const p = params.current;
			if (p.central !== lastCentral) {
				const mosaic = receptorMosaic(p.central);
				for (const [mesh, points, cone] of [
					[cones, mosaic.cones, true],
					[rods, mosaic.rods, false],
				] as const) {
					mesh.count = points.length;
					points.forEach((point, i) => {
						transform.position.set(point.x, point.y, cone ? 0.7 : 0.65);
						transform.rotation.set(Math.PI / 2, 0, 0);
						transform.scale.set(
							cone && p.central ? 0.8 : 1,
							cone ? (p.central ? 1.65 : 1.05) : 1.75,
							cone && p.central ? 0.8 : 1,
						);
						transform.updateMatrix();
						mesh.setMatrixAt(i, transform.matrix);
					});
					mesh.instanceMatrix.needsUpdate = true;
					mesh.computeBoundingSphere();
				}
				lastCentral = p.central;
			}
			if (p.top !== lastTop) {
				view.controls.enableDamping = false;
				view.controls.update();
				view.camera.position.set(
					p.top ? 0 : 12,
					p.top ? 0 : 7,
					p.top ? -22 : -16,
				);
				view.controls.target.set(0, 0, 0.6);
				view.controls.update();
				view.controls.enableDamping = true;
				lastTop = p.top;
			}
			return {
				state: {
					model: "Enlarged receptor icons, qualitative packing only",
					central: p.central,
					cones: cones.count,
					rods: rods.count,
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
		{ central, top },
		(initial) => {
			setCentral(initial.central);
			setTop(initial.top);
		},
		resetAnchor,
	);
	return (
		<div ref={resetAnchor} className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "Repetir células, cambiar el mosaico"
						: "Repeat cells, change the mosaic"}
				</strong>
				<span className="lens-muted">
					{es
						? "Iconos ampliados · sin escala"
						: "Enlarged icons · not to scale"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Mosaico tridimensional de iconos de conos y bastones"
						: "Three-dimensional mosaic of cone and rod icons"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				<p className="retina-camera">
					{es
						? "Vista desde el lado interno, mirando hacia el EPR"
						: "From the inner side, looking towards the RPE"}
				</p>
			</div>
			<div className="lens-legend">
				<span className="retina-key">
					<i className="retina-dot" style={{ background: "#e5b773" }} />
					{es ? "Conos" : "Cones"}
				</span>
				<span className="retina-key">
					<i className="retina-dot" style={{ background: "#91bbb9" }} />
					{es ? "Bastones" : "Rods"}
				</span>
			</div>
			<div className="lens-controls">
				<ParameterControl
					value={central}
					initial={defaults.central}
					onReset={setCentral}
					label="retinal region"
					lang={lang}
					context={parameterContext.mosaic}
				>
					<label>
						{es ? "Región" : "Region"}
						<select
							value={central ? "central" : "peripheral"}
							onChange={(e) => setCentral(e.target.value === "central")}
						>
							<option value="central">
								{es ? "Centro foveal" : "Foveal centre"}
							</option>
							<option value="peripheral">
								{es ? "Fuera del centro" : "Away from centre"}
							</option>
						</select>
					</label>
				</ParameterControl>
				<div className="lens-buttons">
					<ParameterControl
						value={top}
						initial={defaults.top}
						onReset={setTop}
						label="mosaic view"
						lang={lang}
					>
						<button
							type="button"
							aria-pressed={top}
							onClick={() => setTop(!top)}
						>
							{es ? "Vista del mosaico" : "Mosaic view"}
						</button>
					</ParameterControl>
				</div>
				<p className="lens-note">
					{es
						? "La proporción de iconos es didáctica, no una densidad medida. Los conos centrales se dibujan más estrechos y alargados; no se representan clases S/M/L ni circuitos."
						: "Icon ratios are teaching choices, not measured densities. Central cones are drawn narrower and longer; S/M/L classes and circuitry are not represented."}
				</p>
			</div>
		</div>
	);
}
