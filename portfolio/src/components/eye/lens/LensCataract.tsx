import { useInitialParameters } from "../ParameterControl";
import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
	createRoundedLensGeometry,
	EQUATOR_RADIUS,
	LENS_THICKNESS,
	roundedLensProfile,
} from "./lensConstruction";
import { clearLensMaterial } from "./lensMaterial";
import { createLensScene } from "./lensScene";

type CataractType = "clear" | "nuclear" | "cortical" | "posterior";

// A short ray integral through an illustrative density field. These patterns
// locate opacity within the lens; they do not solve multiple scattering.
function cloudMaterial(pattern: number, color: number) {
	const profile = roundedLensProfile();
	const bounds = Array.from({ length: 65 }, (_, i) => {
		const r = (i / 64) * EQUATOR_RADIUS;
		const hits: number[] = [];
		for (let j = 1; j < profile.length; j++) {
			const a = profile[j - 1]!,
				b = profile[j]!;
			if (r >= Math.min(a.x, b.x) && r <= Math.max(a.x, b.x) && a.x !== b.x)
				hits.push(
					(a.y + ((b.y - a.y) * (r - a.x)) / (b.x - a.x)) /
						(LENS_THICKNESS / 2),
				);
		}
		return new THREE.Vector2(Math.min(...hits), Math.max(...hits));
	});
	return new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		side: THREE.BackSide,
		uniforms: {
			amount: { value: 0.7 },
			bounds: { value: bounds },
			pattern: { value: pattern },
			tint: { value: new THREE.Color(color) },
		},
		vertexShader: `varying vec3 point; varying vec3 eye;
		void main() {
		 point = position;
		 eye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
		 gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}`,
		fragmentShader: `varying vec3 point; varying vec3 eye;
		uniform float amount; uniform float pattern; uniform vec3 tint;
        uniform vec2 bounds[65];
		float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
		float noise(vec3 p) {
		 vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
		 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
		 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
		}
		float density(vec3 p) {
		 float r=length(p.xy);
         if(r>=1.0) return 0.0;
         float index=r*64.0; int lo=int(floor(index));
         vec2 limits=mix(bounds[lo],bounds[lo+1],fract(index));
         if(p.z<=limits.x || p.z>=limits.y) return 0.0;
         // Map depth inside the rounded lens to the density field's unit sphere.
         p.z=((p.z-limits.x)/(limits.y-limits.x)*2.0-1.0)*sqrt(max(0.0,1.0-r*r));
         float edge=1.0-smoothstep(0.88,1.0,length(p));
		 if(pattern<0.5) {
		  // Gradual central haze, without a separately outlined inner solid.
		  return exp(-dot(p,p)*5.5)*(0.9+0.1*noise(p*5.0))*edge;
		 }
		 if(pattern<1.5) {
		  // Uneven peripheral wedges with different lengths, widths and depths.
		  float a=atan(p.y,p.x), wedges=0.0;
		  for(int i=0;i<9;i++) {
		   float k=float(i), centre=k*6.2831853/9.0+0.12*sin(k*3.7);
		   float angle=atan(sin(a-centre),cos(a-centre));
		   float width=0.035+0.045*(0.5+0.5*sin(k*2.9));
		   float start=0.32+0.25*(0.5+0.5*sin(k*4.1));
		   float spoke=exp(-angle*angle/(width*width))*smoothstep(start,start+0.18,r);
		   float depth=p.z-0.18*sin(k*2.3);
		   wedges+=spoke*exp(-depth*depth/0.10);
		  }
		  return wedges*edge*(0.75+0.25*noise(p*15.0));
		 }
		 // Irregular granular opacity near the posterior surface, not a disc.
		 float posterior=-sqrt(max(0.0,1.0-r*r))+0.08;
		 float depth=p.z-posterior;
		 float region=1.0-smoothstep(0.22,0.52,r+0.10*(noise(p*8.0)-0.5));
		 return region*exp(-depth*depth/0.004)*(0.35+0.65*noise(p*35.0))*edge*5.0;
		}
		void main() {
		 vec3 ray=normalize(point-eye);
		 float b=dot(eye,ray), c=dot(eye,eye)-1.44;
		 float disc=b*b-c;
		 if(disc<=0.0) discard;
		 float root=sqrt(disc), start=max(0.0,-b-root), finish=-b+root;
		 float stepSize=(finish-start)/40.0, integral=0.0;
		 for(int i=0;i<40;i++) {
		  vec3 p=eye+ray*(start+(float(i)+0.5)*stepSize);
		  integral+=density(p)*stepSize;
		 }
		 float alpha=1.0-exp(-amount*integral*3.0);
		 gl_FragColor=vec4(tint,alpha);
		 #include <tonemapping_fragment>
		 #include <colorspace_fragment>
		}`,
	});
}

export default function LensCataract({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [type, setType] = useState<CataractType>("nuclear");
	const [opacity, setOpacity] = useState(0.7);
	const [error, setError] = useState(false);
	const params = useRef({ type, opacity });
	useEffect(() => {
		params.current = { type, opacity };
		viewRef.current?.invalidate();
	}, [type, opacity]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 23, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(0, 0, 23);
		const shape = createRoundedLensGeometry();
		const shell = new THREE.Mesh(shape, clearLensMaterial());
		shell.scale.set(EQUATOR_RADIUS, EQUATOR_RADIUS, LENS_THICKNESS / 2);
		view.scene.add(shell);
		const volume = shape;
		const nuclearMaterial = cloudMaterial(0, 0xcbb984);
		const corticalMaterial = cloudMaterial(1, 0xe2ded1);
		const posteriorMaterial = cloudMaterial(2, 0xd8d3bc);
		const nucleus = new THREE.Mesh(volume, nuclearMaterial);
		const cortical = new THREE.Mesh(volume, corticalMaterial);
		const posterior = new THREE.Mesh(volume, posteriorMaterial);
		for (const cloud of [nucleus, cortical, posterior]) {
			// The haze follows the same rounded profile, just inside the clear shell.
			cloud.scale.set(
				EQUATOR_RADIUS * 0.985,
				EQUATOR_RADIUS * 0.985,
				(LENS_THICKNESS / 2) * 0.985,
			);
			// Composite the density after the clear transmissive shell, whose
			// screen-space transmission buffer cannot include transparent volumes.
			cloud.renderOrder = 1;
			view.scene.add(cloud);
		}
		view.start(() => {
			const p = params.current;
			nucleus.visible = p.type === "nuclear" && p.opacity > 0;
			cortical.visible = p.type === "cortical" && p.opacity > 0;
			posterior.visible = p.type === "posterior" && p.opacity > 0;
			for (const material of [
				nuclearMaterial,
				corticalMaterial,
				posteriorMaterial,
			])
				material.uniforms.amount!.value = p.opacity;
			return {
				state: {
					model:
						"Illustrative opacity distribution; no scattering or visual-acuity prediction",
					opacityPattern: p.type,
					illustrativeOpacity: p.opacity,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const descriptions = {
		clear: es
			? "Cristalino transparente, sin opacidad añadida."
			: "Clear lens, without added opacity.",
		nuclear: es
			? "Nuclear: opacidad central, aquí con un tono amarillento."
			: "Nuclear: central opacity, shown here with yellowing.",
		cortical: es
			? "Cortical: radios o cuñas en la corteza periférica."
			: "Cortical: spoke-like or wedge-shaped opacities in the peripheral cortex.",
		posterior: es
			? "Subcapsular posterior: una placa justo por delante de la cápsula posterior."
			: "Posterior subcapsular: a patch just in front of the posterior capsule.",
	};
	useInitialParameters(
		{ type, opacity },
		(initial) => {
			setType(initial.type);
			setOpacity(initial.opacity);
		},
		mount,
	);
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "Cuando el cristalino pierde transparencia"
						: "When the lens loses transparency"}
				</strong>
				<span className="lens-muted">
					{es ? "Arrastra para girar" : "Drag to orbit"}
				</span>
			</div>
			{error ? (
				<p className="p-4" role="status">
					{es ? "WebGL no está disponible." : "WebGL is unavailable."}
				</p>
			) : (
				<div
					ref={mount}
					className="lens-scene"
					role="img"
					aria-label={
						opacity === 0
							? es
								? "Cristalino transparente para comparar"
								: "Clear lens for comparison"
							: descriptions[type]
					}
				/>
			)}
			<div className="lens-controls">
				<label>
					{es ? "Patrón de opacidad" : "Opacity pattern"}
					<select
						value={type}
						onChange={(e) => {
							const next = e.target.value as typeof type;
							setType(next);
							viewRef.current?.setView(next === "posterior" ? "back" : "front");
						}}
					>
						<option value="clear">{es ? "Transparente" : "Clear"}</option>
						<option value="nuclear">Nuclear</option>
						<option value="cortical">Cortical</option>
						<option value="posterior">
							{es ? "Subcapsular posterior" : "Posterior subcapsular"}
						</option>
					</select>
				</label>

				<p className="lens-note" aria-live="polite">
					{descriptions[type]}
				</p>

				<details className="lens-options">
					<summary>
						{es ? "Intensidad de la opacidad" : "Opacity strength"}
					</summary>
					<label>
						<span className="lens-value">
							<span>
								{es ? "Opacidad ilustrativa" : "Illustrative opacity"}
							</span>
							<output>{Math.round(opacity * 100)} / 100</output>
						</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={opacity}
							onChange={(e) => setOpacity(Number(e.target.value))}
						/>
					</label>
				</details>

				<p className="lens-note">
					{es
						? "Patrones ilustrativos: no son grados clínicos ni una simulación de lo que ve una persona. En un mismo ojo pueden coexistir varios tipos."
						: "Illustrative patterns, not clinical grades or a simulation of a person's vision. Multiple types can coexist in one eye."}
				</p>
			</div>
		</div>
	);
}
