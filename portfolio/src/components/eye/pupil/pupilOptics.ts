// Centred photopic SCE-I model in entrance-pupil coordinates (mm).
// A conventional illustrative rho10 = 0.05 mm^-2, not an individual constant.
// eta(r) = 10^(-rho10*r*r) = exp(-rhoE*r*r).
export const SCE_RHO10 = 0.05;
export const SCE_RHO_E = SCE_RHO10 * Math.LN10;

export function sceEffectiveArea(diameterMm: number) {
	const radius = Math.max(0, diameterMm) / 2;
	return (-Math.PI / SCE_RHO_E) * Math.expm1(-SCE_RHO_E * radius * radius);
}
