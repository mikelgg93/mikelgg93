import * as THREE from "three";
import { conicSag } from "../cornea/conic";
import {
	assemblyIrisMaterial,
	createAssemblyCornea,
	createAssemblyIris,
	updateAssemblyIris,
} from "../lens/anteriorEyeGeometry";
import { createCiliaryApparatus } from "../lens/ciliaryApparatus";
import { createIntraocularLens } from "../lens/intraocularLens";
import { capHeight, traceGrinRay } from "../lens/lensOptics";
import type { createLensScene } from "../lens/lensScene";
import { createRetinaConstruction } from "./retinaConstruction";

const R = 7.8,
	APERTURE = 5.8;
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = THREE.MathUtils.lerp;
export function createConstructionScene(
	view: ReturnType<typeof createLensScene>,
) {
	const { scene, camera } = view;
	const retinal = createRetinaConstruction(scene);
	const lights: { light: THREE.Light; intensity: number }[] = [];
	scene.traverse((object) => {
		if (object instanceof THREE.Light)
			lights.push({ light: object, intensity: object.intensity });
	});
	const normalPoints: THREE.Vector3[] = [];
	for (const r of [2, 4, 5.5])
		for (let j = 0; j < 8; j++) {
			const a = (j * Math.PI) / 4,
				v = new THREE.Vector3(
					r * Math.cos(a),
					r * Math.sin(a),
					Math.sqrt(R * R - r * r),
				);
			normalPoints.push(
				v,
				v.clone().add(v.clone().normalize().multiplyScalar(1.4)),
			);
		}
	const normals = new THREE.LineSegments(
		new THREE.BufferGeometry().setFromPoints(normalPoints),
		new THREE.LineBasicMaterial({ color: 0xf2c178 }),
	);
	scene.add(normals);
	scene.background = new THREE.Color(0x000000);
	view.controls.minDistance = 20;
	view.controls.maxDistance = 95;
	const grid = new THREE.GridHelper(24, 24, 0x454545, 0x202020);
	grid.position.y = -8.3;
	scene.add(grid);
	const axes = new THREE.AxesHelper(9);
	scene.add(axes);
	const rigCamera = new THREE.PerspectiveCamera(35, 16 / 10, 1, 40);
	rigCamera.position.set(0, 0, 32);
	rigCamera.lookAt(0, 0, 0);
	rigCamera.updateMatrixWorld();
	const cameraHelper = new THREE.CameraHelper(rigCamera);
	scene.add(cameraHelper);
	const rig = new THREE.Mesh(
		new THREE.BoxGeometry(1.7, 1.2, 1),
		new THREE.MeshBasicMaterial({ color: 0xf2c178 }),
	);
	rig.position.copy(rigCamera.position);
	scene.add(rig);
	const clip = [new THREE.Plane(new THREE.Vector3(0, 0, 1), R)];
	const sphereGeometry = new THREE.SphereGeometry(R, 64, 32);
	const sphereMaterial = new THREE.MeshPhongMaterial({
		color: 0x8fcfc7,
		transparent: true,
		opacity: 0.36,
		side: THREE.DoubleSide,
		shininess: 60,
		clippingPlanes: clip,
	});
	const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
	scene.add(sphere);
	const sphereWire = new THREE.Mesh(
		sphereGeometry,
		new THREE.MeshBasicMaterial({
			color: 0x8ecac5,
			wireframe: true,
			transparent: true,
			opacity: 0.13,
			clippingPlanes: clip,
		}),
	);
	scene.add(sphereWire);
	const cutRing = new THREE.LineLoop(
		new THREE.BufferGeometry().setFromPoints(
			Array.from(
				{ length: 128 },
				(_, i) =>
					new THREE.Vector3(
						Math.cos((i * Math.PI) / 64),
						Math.sin((i * Math.PI) / 64),
						0,
					),
			),
		),
		new THREE.LineBasicMaterial({ color: 0xf2c178 }),
	);
	scene.add(cutRing);
	const capGeometry = new THREE.PlaneGeometry(1, 1, 64, 24);
	const cap = new THREE.Mesh(
		capGeometry,
		new THREE.MeshPhongMaterial({
			color: 0x91d1c7,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.25,
		}),
	);
	scene.add(cap);
	const capWire = new THREE.Mesh(
		capGeometry,
		new THREE.MeshBasicMaterial({
			color: 0x93d4ca,
			wireframe: true,
			transparent: true,
			opacity: 0.58,
		}),
	);
	scene.add(capWire);
	function setCap(q: number, apex: number) {
		const p = capGeometry.getAttribute("position");
		let k = 0;
		for (let ring = 0; ring <= 24; ring++)
			for (let sector = 0; sector <= 64; sector++) {
				const r = (APERTURE * ring) / 24,
					a = (sector * Math.PI) / 32,
					x = r * Math.cos(a),
					y = r * Math.sin(a);
				p.setXYZ(k++, x, y, apex - conicSag(x, y, R, R, q));
			}
		p.needsUpdate = true;
		capGeometry.computeVertexNormals();
		capGeometry.computeBoundingSphere();
	}
	const cornea = new THREE.Mesh(
		createAssemblyCornea(),
		new THREE.MeshPhongMaterial({
			color: 0xb8e9ed,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.1,
			depthWrite: false,
			shininess: 100,
		}),
	);
	scene.add(cornea);
	const irisAppearance = assemblyIrisMaterial();
	const iris = new THREE.Mesh(createAssemblyIris(), irisAppearance.material);
	scene.add(iris);
	const toy = new THREE.Group();
	scene.add(toy);
	const toyCaps = [-1, 1].map((side) => {
		const geometry = new THREE.PlaneGeometry(1, 1, 64, 24),
			p = geometry.getAttribute("position");
		let k = 0;
		for (let ring = 0; ring <= 24; ring++)
			for (let sector = 0; sector <= 64; sector++) {
				const r = (4.5 * ring) / 24,
					a = (sector * Math.PI) / 32;
				p.setXYZ(
					k++,
					r * Math.cos(a),
					r * Math.sin(a),
					side * capHeight(10, r),
				);
			}
		geometry.computeVertexNormals();
		geometry.computeBoundingSphere();
		const mesh = new THREE.Mesh(
			geometry,
			new THREE.MeshPhongMaterial({
				color: side > 0 ? 0xa3dcd1 : 0xead5a5,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.5,
			}),
		);
		toy.add(mesh);
		return { mesh, side };
	});
	const anatomy = createCiliaryApparatus();
	scene.add(anatomy.group);
	const supportMaterials = new Map<
		THREE.Material,
		{ opacity: number; transparent: boolean }
	>();
	anatomy.support.traverse((object) => {
		if (object instanceof THREE.Mesh || object instanceof THREE.Line)
			for (const material of [object.material].flat())
				supportMaterials.set(material, {
					opacity: material.opacity,
					transparent: material.transparent,
				});
	});
	const iol = createIntraocularLens();
	scene.add(iol.group);
	// This separate, symmetric envelope matches lensOptics' actual GRIN section.
	const grin = new THREE.Group();
	scene.add(grin);
	const envelope = new THREE.Mesh(
		new THREE.SphereGeometry(1, 48, 32),
		new THREE.MeshPhongMaterial({
			color: 0x9bd3c7,
			transparent: true,
			opacity: 0.12,
			side: THREE.DoubleSide,
			depthWrite: false,
		}),
	);
	envelope.scale.set(4.5, 4.5, 2);
	grin.add(envelope);
	const rayLines: THREE.Line[] = [];
	for (const h of [-3, -1.5, 0, 1.5, 3])
		for (const gradient of [0, 0.05]) {
			const trace = traceGrinRay(h, gradient);
			const geometry = new THREE.BufferGeometry().setFromPoints(
				trace.points.map(
					(p) => new THREE.Vector3(gradient === 0 ? 0.012 : 0, p.y, -p.x),
				),
			);
			const material =
				gradient === 0
					? new THREE.LineDashedMaterial({
							color: 0x8aa3a7,
							dashSize: 0.25,
							gapSize: 0.17,
							transparent: true,
							opacity: 0.75,
						})
					: new THREE.LineBasicMaterial({ color: 0xf2c178 });
			const line = new THREE.Line(geometry, material);
			line.computeLineDistances();
			grin.add(line);
			rayLines.push(line);
		}
	for (const scale of [0.35, 0.6, 0.82]) {
		const points = Array.from(
			{ length: 128 },
			(_, i) =>
				new THREE.Vector3(
					0,
					4.5 * scale * Math.sin((i * Math.PI) / 64),
					2 * scale * Math.cos((i * Math.PI) / 64),
				),
		);
		grin.add(
			new THREE.LineLoop(
				new THREE.BufferGeometry().setFromPoints(points),
				new THREE.LineBasicMaterial({
					color: 0x8fcfc7,
					transparent: true,
					opacity: 0.32,
				}),
			),
		);
	}
	const section = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
	const cameras: readonly (readonly [number, number, number])[] = [
		[24, 18, 30],
		[44, 28, 60],
		[0, 0, 32],
		[17, 10, 28],
		[17, 10, 28],
		[22, 8, 24],
		[20, 10, 26],
		[15, 9, 30],
		[0, 0, 32],
		[23, 10, 23],
		[20, 9, 27],
		[23, 2, 0],
		[20, 12, 25],
		[20, 12, 25],
		[22, 11, 25],
		[20, 24, 20],
		[27, 20, 32],
		[15, 10, 20],
		[15, 10, 20],
		[13, 8, 20],
		[34, 35, 34],
	];
	let previousSection: boolean | undefined;
	return {
		update(step: number, progress: number, detail = "") {
			const t = ease(THREE.MathUtils.clamp(progress, 0, 1));
			const wholeEye = step === 20 && !detail,
				sectionView = step === 15 || wholeEye;
			retinal.update(step, t, detail);
			normals.visible = detail === "normals";
			scene.environmentIntensity = 0.45 * (detail === "lighting" ? t : 1);
			for (const { light, intensity } of lights)
				light.intensity = intensity * (detail === "lighting" ? t : 1);
			anatomy.support.traverse((object) => {
				if (object instanceof THREE.LineSegments)
					object.visible = detail !== "muscle";
			});
			grid.visible = step <= 8;
			axes.visible = step <= 4 && detail !== "normals";
			cameraHelper.visible = rig.visible = step === 1;
			sphere.visible = step === 2 || step === 3;
			sphereWire.visible = sphere.visible || step === 5;
			const scale = step === 2 ? mix(0.01, 1, t) : 1;
			sphere.scale.setScalar(scale);
			sphereWire.scale.setScalar(scale);
			const cut =
				step === 3 ? mix(-R, Math.sqrt(R * R - APERTURE * APERTURE), t) : -R;
			clip[0]!.constant =
				step === 5 ? -Math.sqrt(R * R - APERTURE * APERTURE) : -cut;
			cutRing.visible = step === 3;
			cutRing.position.z = cut;
			cutRing.scale.setScalar(Math.sqrt(Math.max(0, R * R - cut * cut)));
			cap.visible = capWire.visible = step === 4 || step === 5 || step === 6;
			if (cap.visible) {
				setCap(
					step === 5 ? mix(0, -0.26, t) : step === 4 ? 0 : -0.26,
					step === 6 ? mix(R, 5.6, t) : R,
				);
				capWire.material.opacity = step === 6 ? 0.58 * (1 - t) : 0.58;
				cap.material.opacity = step === 6 ? 0.25 * (1 - t) : 0.25;
				capGeometry.setDrawRange(
					0,
					step === 4
						? 3 * Math.floor((capGeometry.index!.count * t) / 3)
						: Infinity,
				);
			}
			cornea.visible =
				(step >= 6 && step <= 8) || step === 14 || step === 15 || wholeEye;
			cornea.material.opacity = step === 6 ? 0.1 * t : 0.1;
			cornea.position.z = step === 14 ? 8 * (1 - t) : 0;
			iris.visible =
				step === 7 || step === 8 || step === 14 || step === 15 || wholeEye;
			iris.scale.setScalar(step === 7 ? mix(0.01, 1, t) : 1);
			iris.position.z = step === 14 ? 4 * (1 - t) : 0;
			const pupil = step === 8 ? mix(8, 2, t) : 4;
			updateAssemblyIris(iris.geometry, pupil);
			irisAppearance.pupil.value = pupil / 2;
			toy.visible = step === 9;
			for (const { mesh, side } of toyCaps)
				mesh.position.z = side * 3 * (1 - t);
			anatomy.group.visible =
				step === 10 || (step >= 12 && step <= 15) || wholeEye;
			anatomy.update(step === 13 ? 8 * t : 0, sectionView, false);
			anatomy.support.visible = step >= 12;
			for (const [material, original] of supportMaterials) {
				const transparent = step === 12 || original.transparent;
				if (material.transparent !== transparent) {
					material.transparent = transparent;
					material.needsUpdate = true;
				}
				material.opacity =
					original.opacity *
					(step === 12 &&
					(detail !== "fibres" || material instanceof THREE.LineBasicMaterial)
						? t
						: 1);
			}
			anatomy.lens.visible = step !== 15;
			grin.visible = step === 11;
			if (grin.visible)
				for (const ray of rayLines)
					ray.geometry.setDrawRange(
						0,
						Math.floor(ray.geometry.getAttribute("position").count * t),
					);
			iol.group.visible = step === 15;
			iol.group.scale.setScalar(step === 15 ? mix(0.01, 1, t) : 1);
			iol.setSection(step === 15);
			if (sectionView !== previousSection) {
				for (const material of [cornea.material, iris.material]) {
					material.clippingPlanes = sectionView ? section : [];
					material.needsUpdate = true;
				}
				previousSection = sectionView;
			}
			const localRetina =
				step === 20 && (detail === "landmarks" || detail === "canal");
			const end = localRetina
				? new THREE.Vector3(0, 0, 40)
				: new THREE.Vector3(...cameras[step]!);
			// Deterministic camera motion makes replay and direct slide jumps repeatable.
			const start = step === 0 ? end : new THREE.Vector3(...cameras[step - 1]!);
			camera.up.set(0, 1, 0);
			camera.position.lerpVectors(start, end, t);
			const targetZ =
				step === 16
					? -12
					: step === 20
						? localRetina
							? -12
							: -8
						: step === 1
							? 10
							: step === 3
								? 6.5 * t
								: step === 4 || step === 5
									? 6.5
									: step === 6
										? mix(6.5, 3.5, t)
										: step === 7 || step === 8
											? 3.5
											: 0;
			view.controls.target.set(0, 0, targetZ);
			view.controls.update();
			return step === 5
				? `Q = ${mix(0, -0.26, t).toFixed(2)}`
				: step === 8
					? `pupil = ${pupil.toFixed(1)} mm`
					: step === 13
						? `model input = ${(8 * t).toFixed(1)} D`
						: null;
		},
	};
}
