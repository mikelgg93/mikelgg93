# WebGL eye starter / Inicio del ojo WebGL

A small plain Three.js project: no React or Astro knowledge needed. The seven
checkpoints share `main.js`; change one step at a time and inspect its result.
This is a construction exercise, not a validated optical eye.

Un proyecto pequeño de Three.js, sin React ni Astro. Los siete pasos comparten
`main.js`: modifica uno y observa el resultado. Es un ejercicio de construcción,
no un ojo óptico validado. La interfaz del ejemplo está en inglés.

Use Bun, or Node 22.12+ with npm:

```sh
bun install
bun run dev
```

With npm: `npm install` followed by `npm run dev`. Open the address printed by
Vite. To view it on a phone, use the computer's local-network address and the
printed port while both devices are on the same network. Opening `index.html`
directly from the filesystem does not resolve package imports.

Con npm: `npm install` y `npm run dev`. Abre la dirección que muestra Vite. En
el móvil, usa la dirección local del ordenador y el puerto indicado, con ambos
en la misma red. No abras `index.html` directamente: necesita el servidor.

| Step / Paso | Edit / Modifica | Check / Comprueba |
| --- | --- | --- |
| Camera / Cámara | `camera.position`, `orbit.target` | Axes at the future corneal apex / Ejes en el futuro ápice |
| Sphere / Esfera | `R`, centre `z = -R` | Diameter 15.6 mm, front vertex at zero / Diámetro 15,6 mm, vértice anterior en cero |
| Cap / Cúpula | Polar sweep `asin(aperture / R)` | Same sphere, smaller angular extent / Misma esfera, menor extensión |
| Conic / Cónica | `Q`, `sag()` | At Q = 0 it matches the sphere / Q = 0 coincide con la esfera |
| Thickness / Espesor | `cct`, posterior radius | Separate vertices by 0.55 mm / Separación central de 0,55 mm |
| Material | `wireframe`, `opacity`, `roughness` | Normals and lighting reveal the surface / Normales e iluminación muestran la superficie |
| Assembly / Conjunto | ACD, LT, axial endpoint | Derive positions from distances / Deriva posiciones de las distancias |

**Units / Unidades:** one scene unit is one millimetre. The anterior corneal
apex is the origin, +z faces the viewer and −z goes posteriorly. The first cap
in the article uses a normalised radius of 1; this project keeps millimetres
throughout. Materials and the final assembly are illustrative. There is no GRIN
or retinal-image calculation in this starter; continue with the article demos
for those separate lessons.
