// Character cel shading. Characters use their own ambient (a per-material shadow colour, warm for
// skin, cool for cloth) instead of the world ambient, a crisp terminator and a rim light on the lit side.

uniform float ambient_level = 0.6;
uniform float sun_scale = 0.88;
uniform float band_center = 0.02;
uniform float band_soft = 0.03;
uniform float shadow_soft = 0.1;
uniform float rim_strength = 0.4;
uniform float shadow_receive : hint_range(0.0, 1.0) = 1.0;

void char_light(vec3 n, vec3 l, vec3 v, vec3 light_color, float atten, bool directional, float metal,
		inout vec3 diffuse, inout vec3 spec) {
	float ndl = dot(n, l);
	if (directional) {
		float lit = smoothstep(band_center - band_soft, band_center + band_soft, ndl);
		float sh = mix(1.0, smoothstep(0.5 - shadow_soft, 0.5 + shadow_soft, atten), shadow_receive);
		diffuse += light_color / PI * lit * sh * sun_scale;
		float rim = smoothstep(0.6, 0.74, 1.0 - clamp(dot(n, v), 0.0, 1.0)) * smoothstep(-0.05, 0.35, ndl) * sh;
		diffuse += light_color / PI * rim * rim_strength;
		if (metal > 0.01) {
			vec3 h = normalize(l + v);
			spec += light_color * smoothstep(0.86, 0.9, dot(n, h)) * metal * 0.45 * sh;
		}
	} else {
		diffuse += light_color / PI * atten * clamp(ndl * 0.5 + 0.5, 0.0, 1.0) * 0.6;
	}
}

// Anti-aliased step for procedural patterns.
float aastep(float edge, float x) {
	float w = max(fwidth(x), 1e-5) * 0.75;
	return smoothstep(edge - w, edge + w, x);
}
