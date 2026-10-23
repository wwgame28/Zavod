// Shared stylized lighting for ECHOES OF THE LAST SKY.
// Key light: banded diffuse + crisp shadow edge + warm "terminator" band (anime cel look).
// Local lights: soft wrapped falloff so crystal glows stay gentle.

uniform vec4 toon_terminator_tint : source_color = vec4(1.0, 0.55, 0.35, 0.35);

uniform float toon_band_center : hint_range(-1.0, 1.0) = 0.02;
uniform float toon_band_softness : hint_range(0.001, 0.6) = 0.07;
uniform float toon_shadow_softness : hint_range(0.001, 0.5) = 0.18;

void toon_light(vec3 n, vec3 l, vec3 light_color, float attenuation, bool directional, inout vec3 diffuse) {
	float ndl = dot(n, l);
	if (directional) {
		float lit = smoothstep(toon_band_center - toon_band_softness, toon_band_center + toon_band_softness, ndl);
		float shadow = smoothstep(0.5 - toon_shadow_softness, 0.5 + toon_shadow_softness, attenuation);
		float k = lit * shadow;
		float edge = clamp(k * (1.0 - k) * 4.0, 0.0, 1.0);
		diffuse += light_color / PI * (vec3(k) + toon_terminator_tint.rgb * edge * toon_terminator_tint.a);
	} else {
		float wrap = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
		diffuse += light_color / PI * attenuation * wrap * wrap;
	}
}

float toon_fresnel(vec3 n, vec3 v, float power) {
	return pow(1.0 - clamp(dot(n, v), 0.0, 1.0), power);
}
