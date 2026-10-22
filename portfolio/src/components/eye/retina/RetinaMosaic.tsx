import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createLensScene } from "../lens/lensScene";
import { receptorMosaic } from "./retinaModel";
import "../lens/lens.css";
import "./retina.css";

export default function RetinaMosaic({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null),
		labels = useRef<(HTMLSpanElement | null)[]>([]),
		viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [shape, setShape] = useState(false),
		[error, setError] = useState(false);
	useEffect(() => {
		const view = viewRef.current;
		if (view) view.setPose(shape ? [21, 12, -35] : [0, 0, -40], [0, 0, 0.6]);
	}, [shape]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 40, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(0, 0, -40);
		view.controls.target.set(0, 0, 0.6);
		const coneGeometry = new THREE.CylinderGeometry(0.1, 0.18, 1, 10),
			rodGeometry = new THREE.CylinderGeometry(0.085, 0.085, 1, 8);
		const coneMaterial = new THREE.MeshStandardMaterial({
				color: 0xd5b77d,
				roughness: 0.85,
			}),
			rodMaterial = new THREE.MeshStandardMaterial({
				color: 0x89b6ad,
				roughness: 0.85,
			});
		const transform = new THREE.Object3D();
		const counts: { central: boolean; cones: number; rods: number }[] = [];
		for (const central of [true, false]) {
			const group = new THREE.Group();
			group.position.x = central ? 5.2 : -5.2;
			view.scene.add(group);
			const mosaic = receptorMosaic(central);
			counts.push({
				central,
				cones: mosaic.cones.length,
				rods: mosaic.rods.length,
			});
			for (const [points, cone] of [
				[mosaic.cones, true],
				[mosaic.rods, false],
			] as const) {
				const mesh = new THREE.InstancedMesh(
					cone ? coneGeometry : rodGeometry,
					cone ? coneMaterial : rodMaterial,
					Math.max(1, points.length),
				);
				mesh.count = points.length;
				points.forEach((p, i) => {
					const length = cone ? (central ? 1.65 : 1.05) : 1.75;
					transform.position.set(p.x, p.y, 1.6 - length / 2);
					transform.rotation.set(Math.PI / 2, 0, 0);
					transform.scale.set(
						cone && central ? 0.8 : 1,
						length,
						cone && central ? 0.8 : 1,
					);
					transform.updateMatrix();
					mesh.setMatrixAt(i, transform.matrix);
				});
				mesh.instanceMatrix.needsUpdate = true;
				mesh.computeBoundingSphere();
				group.add(mesh);
			}
			const backing = new THREE.Mesh(
				new THREE.CircleGeometry(4.95, 64),
				new THREE.MeshStandardMaterial({
					color: 0x263c37,
					side: THREE.DoubleSide,
					roughness: 1,
				}),
			);
			backing.position.z = 1.6;
			group.add(backing);
		}
		view.onReset(() => setShape(false));
		view.start(() => ({
			afterRender() {
				[5.2, -5.2].forEach((x, i) => {
					const label = labels.current[i];
					if (!label) return;
					const p = new THREE.Vector3(x, 6, 0).project(view.camera);
					label.hidden =
						Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || Math.abs(p.z) > 1;
					label.style.left = `${(p.x + 1) * 50}%`;
					label.style.top = `${(1 - p.y) * 50}%`;
				});
			},
			state: {
				model:
					"Paired equal-area schematic receptor patches; no measured density calibration",
				patches: counts,
			},
		}));
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	return (
		<div className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "Dos regiones, distintas distribuciones"
						: "Two regions, different packing"}
				</strong>
				<span className="lens-muted">
					{es
						? "Parches ampliados · sin escala"
						: "Magnified patches · not to scale"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Comparación de mosaicos central y periférico"
						: "Central and peripheral receptor mosaics compared"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				<div className="retina-patch-labels">
					{[
						es ? "Centro foveal" : "Foveal centre",
						es ? "Fuera del centro" : "Away from centre",
					].map((label, i) => (
						<span
							key={label}
							ref={(node) => {
								labels.current[i] = node;
							}}
						>
							{label}
						</span>
					))}
				</div>
				<p className="retina-camera">
					{es
						? "Misma área dibujada · distribuciones ilustrativas"
						: "Equal drawn areas · illustrative distributions"}
				</p>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={shape}
						onClick={() => setShape(!shape)}
					>
						{es ? "Ver formas celulares" : "Show cell shapes"}
					</button>
					<span className="retina-key">
						<i className="retina-dot" style={{ background: "#d5b77d" }} />
						{es ? "Conos" : "Cones"}
					</span>
					<span className="retina-key">
						<i className="retina-dot" style={{ background: "#89b6ad" }} />
						{es ? "Bastones" : "Rods"}
					</span>
				</div>
				<p className="lens-note">
					{es
						? "El centro reúne más conos, estrechos y largos. El otro parche mezcla conos con bastones. Las separaciones elegidas muestran la idea de muestreo; no son densidades medidas."
						: "The centre packs more, narrower, longer cones. The other patch mixes cones with rods. Chosen spacings illustrate sampling; they are not measured densities."}
				</p>
			</div>
		</div>
	);
}
