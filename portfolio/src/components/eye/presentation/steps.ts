// Construction excerpts, not a standalone program. Full loops live in the linked source.
// Numbers describe these teaching meshes and this virtual camera, not a patient.
const baseSteps = [
	{
		chapter: "SCENE",
		title: "Start with space.",
		text: "Create a scene and a WebGL renderer. Choose a scale before adding geometry: here, one unit is one millimetre.",
		code: "const scene = new THREE.Scene();\nscene.background = new THREE.Color(0x000000);\nconst renderer = new THREE.WebGLRenderer({\n  antialias: true\n});\ncontainer.appendChild(renderer.domElement);",
		value: "1 unit = 1 mm",
		note: "Three.js manages the WebGL buffers, shaders and draw calls. The grid is our ruler.",
	},
	{
		chapter: "CAMERA",
		title: "Place the camera.",
		text: "Position a perspective camera 32 units along z and aim at the origin. Here we see its viewing cone from outside.",
		code: "const camera = new THREE.PerspectiveCamera(\n  35, width / height, 0.1, 100\n);\ncamera.position.set(0, 0, 32);\ncamera.lookAt(0, 0, 0);\nrenderer.setSize(width, height);\nrenderer.render(scene, camera);",
		value: "35° field of view · z = 32 mm",
		note: "The next slide looks through this camera. Its position and field of view are drawing choices, not eye optics.",
	},
	{
		chapter: "MESH",
		title: "Make a sphere.",
		text: "Start at the origin with a 7.8 mm radius. Combine geometry with a material, then add the mesh to the scene.",
		code: "const R = 7.8;\nconst geometry = new THREE.SphereGeometry(R, 64, 32);\nconst material = new THREE.MeshPhongMaterial({\n  color: 0x8fcfc7\n});\nscene.add(new THREE.Mesh(geometry, material));\nscene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 2));",
		value: "radius 7.8 mm · diameter 15.6 mm",
		note: "Phong shading needs light. This sphere is scaffolding for the corneal front surface, not the eyeball.",
	},
	{
		chapter: "CLIPPING",
		title: "Keep the front cap.",
		text: "Cut at the z coordinate where the sphere reaches a 5.8 mm aperture radius. A clipping plane hides the rest.",
		code: "const a = 5.8;\nconst zCut = Math.sqrt(R * R - a * a);\nmaterial.clippingPlanes = [new THREE.Plane(\n  new THREE.Vector3(0, 0, 1), -zCut\n)];\nrenderer.localClippingEnabled = true;\nmaterial.needsUpdate = true;",
		value: "aperture diameter 11.6 mm",
		note: "The plane keeps z ≥ zCut. Clipping hides fragments; it does not remove vertices or close the cut.",
	},
	{
		chapter: "VERTICES",
		title: "Own the vertices.",
		text: "Remap an indexed grid into polar coordinates: radius outwards, angle around. Its triangles become our editable cap.",
		code: "const cap = new THREE.PlaneGeometry(1, 1, 64, 24);\nconst p = cap.getAttribute('position');\n// For each radius r and angle a:\np.setXYZ(i, r * Math.cos(a), r * Math.sin(a),\n  Math.sqrt(R * R - r * r));\np.needsUpdate = true;\ncap.computeVertexNormals();",
		value: "64 sectors × 24 radial bands",
		note: "Mark the position buffer dirty after editing it. Recalculate normals for lighting and bounds for culling.",
	},
	{
		chapter: "ASPHERICITY",
		title: "Give it a Q.",
		text: "Replace spherical sag with conic sag. Animate Q from 0 to −0.26; the apex curvature stays fixed while the edge flattens.",
		code: "const Q = THREE.MathUtils.lerp(0, -0.26, t);\nconst d = 1 - (1 + Q) * r * r / (R * R);\n// Limit the aperture before sampling if d < 0.\nconst sag = (r * r / R) / (1 + Math.sqrt(d));\nconst z = R - sag;",
		value: "Q: 0 → −0.26",
		note: "A chosen prolate example. This aperture is valid throughout the animation; arbitrary R and Q need a domain check.",
	},
	{
		chapter: "THICKNESS",
		title: "Close the shell.",
		text: "Trace the front profile outwards and the back profile inwards. Revolve that closed outline to make a corneal shell.",
		code: "// Profile: front apex → rim → back apex.\n// Front: R = 7.8, Q = -0.26, apex z = 5.60.\n// Back:  R = 6.5, Q = -0.40, apex z = 5.05.\nconst shell = new THREE.LatheGeometry(profile, 96);\nshell.rotateX(Math.PI / 2);",
		value: "central thickness 0.55 mm",
		note: "The rotation aligns the lathe's axis with z. This 550 µm separation is a model choice within typical central thicknesses.",
	},
	{
		chapter: "IRIS",
		title: "Leave a real hole.",
		text: "Build another polar grid behind the cornea. Start each radial row at the pupil edge, so no triangles fill the centre.",
		code: "const inner = pupilDiameter / 2;\n// u runs from 0 at the pupil to 1 at the rim.\nconst r = inner + (5.6 - inner) * u;\np.setXYZ(i, r * Math.cos(a), r * Math.sin(a),\n  2.05 + 0.18 * (1 - u));",
		value: "iris behind cornea · z ≈ 2.1 mm",
		note: "Procedural colour and radial detail shade the mesh. No image textures are needed.",
	},
	{
		chapter: "DEFORMATION",
		title: "Move the inner edge.",
		text: "Animate the pupil from 8 to 2 mm. Update the existing iris buffer each frame; keep the outer radius fixed.",
		code: "const diameter = THREE.MathUtils.lerp(8, 2, t);\nupdateAssemblyIris(iris.geometry, diameter);\n// The helper updates positions, normals and bounds.\nirisAppearance.pupil.value = diameter / 2;",
		value: "pupil 8 → 2 mm",
		note: "The shader uniform keeps its colour pattern aligned with the hole. This animation is not a pupil-light-reflex model.",
	},
	{
		chapter: "TWO CAPS",
		title: "Duplicate. Reverse. Join.",
		text: "Sample a spherical cap, negate z for its partner, then bring their rims together. Our first lens needs only two meshes.",
		code: "const a = 4.5, R = 10;\nconst h = Math.sqrt(R * R - r * r)\n  - Math.sqrt(R * R - a * a);\n// side is +1 for the front, -1 for the back.\np.setXYZ(i, r * Math.cos(angle), r * Math.sin(angle), side * h);\nmesh.position.z = side * 3 * (1 - t);",
		value: "rim diameter 9 mm",
		note: "An intentionally symmetric toy. Both rims reach z = 0 as the gap closes.",
	},
	{
		chapter: "SHAPE & MATERIAL",
		title: "Shape it. Light it.",
		text: "Stretch the two halves differently, then scale the lens. Use transmission and generated studio reflections to reveal its clear surface.",
		code: "// On the unit sphere, reshape each vertex:\np.setZ(i, z * (z > 0 ? 0.85 : 1.15));\nlens.scale.set(radius, radius, thickness / 2);\nconst material = new THREE.MeshPhysicalMaterial({\n  transmission: 0.96, roughness: 0.055,\n  ior: 1.4 / 1.336, thickness: 2.5\n});",
		value: "asymmetric mesh · transmissive material",
		note: "Recalculate normals after reshaping. Relative IOR represents a boundary in fluid; this material does not trace GRIN optics.",
	},
	{
		chapter: "RAYS",
		title: "Separate optics from shading.",
		text: "Calculate paths through an index field, then draw them as lines. The golden rays bend through GRIN; dashed rays use a uniform index.",
		code: "const n = (x, y) => 1.37 + 0.05 *\n  (1 - x * x / 2**2 - y * y / 4.5**2);\n// traceGrinRay integrates the ray path and surface refraction.\nconst { points } = traceGrinRay(height, 0.05);\nconst ray = new THREE.BufferGeometry().setFromPoints(\n  points.map(p => new THREE.Vector3(0, p.y, -p.x))\n);",
		value: "edge n = 1.370 · centre n = 1.420",
		note: "Inside a separate symmetric 2D lens section. This field is not a WebGL material or a whole-eye image prediction.",
	},
	{
		chapter: "SUPPORT",
		title: "Build the suspension.",
		text: "Revolve a rounded muscle profile. Add folds as repeated meshes and zonules as line segments between attachment points.",
		code: "const muscle = muscleGeometry(CILIARY_PROFILE);\n// Each fibre follows origin → guide → attachment.\nfor (const p of [origin, guide, guide, end])\n  zonules.setXYZ(k++, p.x, p.y, p.z);\nzonules.needsUpdate = true;\nsupport.add(new THREE.LineSegments(geometry, material));",
		value: "muscle + processes + zonules",
		note: "Group the parts to show or hide them together. Bundle relief and fibre routes are illustrative.",
	},
	{
		chapter: "ANIMATION",
		title: "Drive it with one parameter.",
		text: "Map elapsed time to a smooth 0–1 value. Use it to move the muscle inward and thicken the lens without rebuilding the scene.",
		code: "const start = performance.now();\nfunction frame(now) {\n  const u = Math.min((now - start) / 2600, 1);\n  anatomy.update(8 * u*u*(3 - 2*u), false, false);\n  renderer.render(scene, camera);\n  if (u < 1) requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);",
		value: "one parameter · coordinated deformation",
		note: "The helper preserves this lens mesh’s volume. Its nominal 0–8 D input prescribes shape, not tissue forces or calculated optical power.",
	},
	{
		chapter: "ASSEMBLY",
		title: "Share one coordinate system.",
		text: "Place cornea, iris and lens in the same scene. Animate only the exploded offsets back to zero; their vertices already store the assembly positions.",
		code: "scene.add(cornea, iris, anatomy.group);\ncornea.position.z = 8 * (1 - t);\niris.position.z = 4 * (1 - t);\nrenderer.render(scene, camera);",
		value: "cornea + iris + lens",
		note: "Shared coordinates do not combine their optical calculations. This scene is an anatomical visualisation.",
	},
	{
		chapter: "AN ALTERNATIVE MODEL",
		title: "Swap the lens. Keep the scene.",
		text: "Hide the natural lens, then reveal an optic, curved haptics and capsular bag. Clip a section to show the implant behind the iris.",
		code: "anatomy.lens.visible = false;\niol.group.visible = true;\niol.setSection(true);\n// Reuse camera, lighting and support geometry.\n// On teardown: dispose buffers, materials and renderer.",
		value: "generic monofocal IOL · in the bag",
		note: "A typical posterior-chamber placement, not a surgical simulation. This fixed implant does not change shape to accommodate.",
	},
] as const;

export type ConstructionStep = {
	chapter: string;
	title: string;
	text: string;
	code: string;
	value: string;
	note: string;
	stage: number;
	detail?: string;
};
const additions: Record<number, ConstructionStep[]> = {
	4: [
		{
			stage: 4,
			chapter: "TRIANGLES",
			title: "Connect the dots.",
			text: "Each grid cell becomes two triangles. Store their vertex numbers in an index buffer so neighbouring faces can share vertices.",
			code: "const a = row * 65 + sector;\nconst b = a + 65;\nindices.push(a, b, a + 1, b, b + 1, a + 1);\ngeometry.setIndex(indices);",
			value: "one cell → two triangles",
			note: "Here each row has 65 vertices, including the duplicated seam. Winding order determines which face is front.",
		},
		{
			stage: 4,
			detail: "normals",
			chapter: "NORMALS",
			title: "Tell light which way is out.",
			text: "A surface normal describes its orientation. Recalculate vertex normals after changing the cap so lighting follows the new shape.",
			code: "geometry.computeVertexNormals();\ngeometry.computeBoundingSphere();\n// Gold lines show the sphere's outward normal:\nconst normal = position.clone().normalize();",
			value: "normals → shading · bounds → culling",
			note: "The radial normal is valid for this sphere centred at the origin. A conic needs normals from its own shape.",
		},
	],
	10: [
		{
			stage: 10,
			detail: "lighting",
			chapter: "REFLECTIONS",
			title: "Give glass something to reflect.",
			text: "A clear mesh against black is difficult to read. Generate a small studio environment and filter it for the physical material.",
			code: "const room = new RoomEnvironment();\nconst pmrem = new THREE.PMREMGenerator(renderer);\nconst target = pmrem.fromScene(room, 0.04);\nscene.environment = target.texture;\nscene.environmentIntensity = 0.45;",
			value: "procedural environment · no photographs",
			note: "Dispose the room and generator after construction, and the target on teardown. Reflections reveal form; they are not retinal ray traces.",
		},
	],
	12: [
		{
			stage: 12,
			detail: "fibres",
			chapter: "ZONULES",
			title: "Connect the attachments.",
			text: "Write each fibre as two line segments through a guide point. Batch their positions into one buffer and update the ends with lens shape.",
			code: "for (const p of [origin, guide, guide, end])\n  positions.setXYZ(k++, p.x, p.y, p.z);\npositions.needsUpdate = true;\ngeometry.computeBoundingSphere();",
			value: "origin → guide → lens capsule",
			note: "Line positions draw a simplified fibre route; their length does not calculate tension.",
		},
	],
};
export const steps: ConstructionStep[] = baseSteps.flatMap((step, stage) => [
	{
		...step,
		stage,
		...(stage === 12
			? {
					detail: "muscle",
					title: "Build the muscle body.",
					text: "Revolve a rounded cross-section, then repeat small meshes for the ciliary processes. Give the muscle irregular bundle detail.",
					code: "const muscle = muscleGeometry(CILIARY_PROFILE);\nsupport.add(new THREE.Mesh(muscle, material));\n// Repeated folds use one instanced mesh.\nfolds.setMatrixAt(i, transform.matrix);\nfolds.instanceMatrix.needsUpdate = true;",
					value: "continuous muscle + ciliary processes",
				}
			: {}),
	},
	...(additions[stage] ?? []),
]);
steps.push(
	{
		stage: 16,
		chapter: "RETINAL CUP",
		title: "Build the receiving surface.",
		text: "Keep the posterior part of a sphere. Begin with a flat disc, then restore each row's depth to form the retinal cup.",
		code: "const theta = u * Math.PI * 0.49;\nconst r = 12 * Math.sin(theta);\nconst z = -6.4 - 12 * Math.cos(theta);\np.setXYZ(i, r * Math.cos(a), r * Math.sin(a), z);",
		value: "chosen radius 12 mm",
		note: "A schematic posterior surface. Its anterior extent, vessels and optic nerve are omitted.",
	},
	{
		stage: 17,
		chapter: "RETINAL LAYERS",
		title: "Give the surface depth.",
		text: "Build separate bands for the main tissue compartments. Translate them apart to inspect their order, from vitreous side to pigment epithelium.",
		code: "const band = new THREE.BoxGeometry(10, 3, 1, 64, 1, 1);\n// Deform its upper and lower vertices to the profiles.\nmesh.position.z = (6 - index) * 0.35 * t;",
		value: "seven grouped bands · magnified",
		note: "The dimensions and colours are drawing choices. These separated bands are neither full histology nor an OCT scan.",
	},
	{
		stage: 18,
		chapter: "FOVEAL PROFILE",
		title: "Displace the inner layers.",
		text: "Taper the inner bands towards the centre and reshape the outer bands. Interpolate vertex heights between the two profiles.",
		code: "const z = THREE.MathUtils.lerp(flatZ, fovealZ, t);\nposition.setZ(i, z);\nposition.needsUpdate = true;\ngeometry.computeVertexNormals();",
		value: "inner layers recede · outer bands remain",
		note: "A schematic foveal profile, with exaggerated depth and omitted Henle-fibre detail. This is not a tissue-development simulation.",
	},
	{
		stage: 19,
		chapter: "PHOTORECEPTORS",
		title: "Repeat one cell efficiently.",
		text: "Create one cone icon and reuse it across the central patch. Each instance gets a transform, while sharing geometry and material.",
		code: "const cells = new THREE.InstancedMesh(geometry, material, count);\ntransform.position.set(x, y, 0);\ntransform.updateMatrix();\ncells.setMatrixAt(i, transform.matrix);\ncells.instanceMatrix.needsUpdate = true;",
		value: "central cone icons · shared geometry",
		note: "Enlarged cone-only teaching patch, not measured density. The article separately introduces rods and the sampling experiment.",
	},
	{
		stage: 20,
		chapter: "THE COMPLETE ASSEMBLY",
		title: "Meet at the back of the eye.",
		text: "Return to millimetres and put the retinal cup behind the earlier parts. A section opens the view without changing the underlying meshes.",
		code: "scene.add(cornea, iris, anatomy.group, retina);\n// Corneal apex: z = 5.6 mm.\n// Posterior retinal pole: z = -18.4 mm.\nrenderer.render(scene, camera);",
		value: "chosen axial separation 24 mm",
		note: "One anatomical scene, with separate magnified tissue lessons. A predictive eye still needs coupled, validated optical and neural models.",
	},
);
