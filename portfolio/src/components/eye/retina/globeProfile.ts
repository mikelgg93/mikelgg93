import { conicSag } from "../cornea/conic";
import { CORNEAL_APEX_Z, POSTERIOR_CORNEAL_APEX_Z } from "../eyeDimensions";
import { ciliaryWallRadius } from "../lens/anteriorSegmentProfile";
import { CHOROID_WALL, RETINAL_WALL, SCLERAL_WALL } from "./retinaAnatomy";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";

// Chosen meridian, in mm. All adjoining tissues sample the SAME boundaries.
export const ORA_Z = -3.8;
export const INNER_LIMBUS_Z =
	POSTERIOR_CORNEAL_APEX_Z - conicSag(5.8, 0, 6.5, 6.5, -0.4);
export const OUTER_LIMBUS_Z =
	CORNEAL_APEX_Z - conicSag(5.8, 0, 7.8, 7.8, -0.26);
const smooth = (t: number) => t * t * (3 - 2 * t);
export function innerScleralRadius(z: number) {
	if (z >= 1.65)
		return 6.55 + ((5.8 - 6.55) * (z - 1.65)) / (INNER_LIMBUS_Z - 1.65);
	if (z >= ORA_Z) return ciliaryWallRadius(z);
	const r = CUP_RADIUS + RETINAL_WALL + CHOROID_WALL;
	if (z <= CUP_CENTRE_Z)
		return Math.sqrt(Math.max(0, r * r - (z - CUP_CENTRE_Z) ** 2));
	const span = ORA_Z - CUP_CENTRE_Z,
		t = (z - CUP_CENTRE_Z) / span;
	// Hermite joins the spherical equator to the shared posterior ciliary attachment.
	return (
		(2 * t ** 3 - 3 * t * t + 1) * r +
		(-2 * t ** 3 + 3 * t * t) * 9.15 +
		(t ** 3 - t * t) * span * (-0.7 / 1.8)
	);
}
export function anteriorCoatRadius(
	key: "retina" | "choroid" | "sclera",
	side: number,
	z: number,
) {
	const sclera = innerScleralRadius(z);
	const t = Math.min(
		1,
		Math.max(0, (z - CUP_CENTRE_Z) / (ORA_Z - CUP_CENTRE_Z)),
	);
	const choroid = CHOROID_WALL + (0.15 - CHOROID_WALL) * smooth(t);
	const retina = RETINAL_WALL + (0.02 - RETINAL_WALL) * smooth(t);
	if (key === "retina") return sclera - choroid - retina * (1 - side);
	if (key === "choroid") return sclera - choroid * (1 - side);
	if (side === 0) return sclera;
	if (z >= 1.65)
		return 7.25 + ((5.8 - 7.25) * (z - 1.65)) / (OUTER_LIMBUS_Z - 1.65);
	return sclera + SCLERAL_WALL;
}
