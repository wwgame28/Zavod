// Anime face painted procedurally on the head. UV = rest-pose (x, y) relative to the cranium
// centre, UV2.y = rest-pose z (front of the face is positive). `blink` closes the eyes.
shader_type spatial;
render_mode cull_back, diffuse_lambert, ambient_light_disabled;

#include "res://shaders/include/character_lighting.gdshaderinc"

uniform vec4 skin : source_color = vec4(1.0, 0.89, 0.82, 1.0);
uniform vec4 skin_shadow : source_color = vec4(1.0, 0.74, 0.76, 1.0);
uniform vec4 iris_top : source_color = vec4(0.16, 0.2, 0.5, 1.0);
uniform vec4 iris_bottom : source_color = vec4(0.36, 0.84, 0.98, 1.0);
uniform vec4 lash : source_color = vec4(0.16, 0.11, 0.16, 1.0);
uniform vec4 brow : source_color = vec4(0.6, 0.58, 0.7, 1.0);
uniform vec4 mouth : source_color = vec4(0.62, 0.32, 0.34, 1.0);
uniform vec4 blush : source_color = vec4(1.0, 0.66, 0.7, 1.0);
uniform vec2 eye_center = vec2(0.034, -0.016);
uniform vec2 eye_size = vec2(0.0205, 0.026);

instance uniform float blink = 0.0;

float ellipse_mask(vec2 p, vec2 r) {
	float d = length(p / r);
	float w = max(fwidth(d), 1e-4);
	return 1.0 - smoothstep(1.0 - w, 1.0 + w, d);
}

void fragment() {
	vec2 q = UV;
	float z = UV2.y;
	vec3 col = skin.rgb;
	if (z > 0.03) {
		float side = sign(q.x);
		vec2 e = q - vec2(eye_center.x * side, eye_center.y);
		float tilt = -0.13 * side;
		e = mat2(vec2(cos(tilt), sin(tilt)), vec2(-sin(tilt), cos(tilt))) * e;
		vec2 en = e / eye_size;
		float open = 1.0 - clamp(blink, 0.0, 1.0);
		// Blush and nose hint.
		col = mix(col, blush.rgb, 0.32 * ellipse_mask(q - vec2(0.047 * side, -0.043), vec2(0.016, 0.0075)));
		col = mix(col, skin_shadow.rgb * skin.rgb, 0.55 * ellipse_mask(q - vec2(0.002, -0.041), vec2(0.0012, 0.004)));
		// Mouth: a small soft curve.
		float mx = q.x / 0.009;
		float my = q.y - (-0.066 + 0.0025 * mx * mx);
		col = mix(col, mouth.rgb, (1.0 - aastep(0.0011, abs(my))) * (1.0 - aastep(1.0, abs(mx))));
		// Eyebrow arc.
		vec2 b = q - vec2(eye_center.x * side + 0.004 * side, eye_center.y + 0.042);
		float bx = b.x / 0.021;
		float by = b.y - 0.006 * (1.0 - bx * bx);
		float brow_w = 0.0022 * (1.0 - 0.6 * smoothstep(0.2, 1.0, bx * side));
		col = mix(col, brow.rgb, (1.0 - aastep(brow_w, abs(by))) * (1.0 - aastep(1.0, abs(bx))));
		if (open > 0.15) {
			vec2 eo = vec2(en.x, en.y / open);
			float eye = 1.0 - aastep(1.0, length(eo));
			vec3 sclera = mix(vec3(1.0, 0.99, 1.0), vec3(0.78, 0.8, 0.95), smoothstep(0.35, 0.9, eo.y));
			vec2 ic = eo - vec2(0.0, -0.12);
			float iris_d = length(ic * vec2(1.12, 1.0));
			float iris = 1.0 - aastep(0.8, iris_d);
			vec3 icol = mix(iris_bottom.rgb, iris_top.rgb, smoothstep(-0.7, 0.55, ic.y));
			icol = mix(icol, iris_top.rgb * 0.7, aastep(0.62, iris_d));
			icol = mix(icol, vec3(0.05, 0.06, 0.16), 1.0 - aastep(0.3, length(ic * vec2(1.4, 1.0))));
			icol = mix(icol, vec3(1.0), 1.0 - aastep(0.2, length(ic - vec2(-0.28 * side, 0.3))));
			icol = mix(icol, vec3(1.0), 1.0 - aastep(0.09, length(ic - vec2(0.25 * side, -0.4))));
			vec3 eye_col = mix(sclera, icol, iris);
			col = mix(col, eye_col, eye);
			// Upper lash line, thicker toward the outer corner, with a small wing.
			float rim_d = length(eo);
			float outer = smoothstep(-0.6, 1.0, eo.x * side);
			float upper = aastep(0.05, eo.y + 0.25 * outer) * (1.0 - aastep(1.0 + 0.16 + 0.2 * outer, rim_d)) * aastep(0.93, rim_d);
			float wing = (1.0 - aastep(0.12, abs(eo.y - 0.25 - (eo.x * side - 1.0) * 0.6))) * aastep(0.85, eo.x * side) * (1.0 - aastep(1.35, eo.x * side));
			float lower = (1.0 - aastep(1.06, rim_d)) * aastep(0.97, rim_d) * aastep(0.55, -eo.y) * aastep(0.1, eo.x * side);
			col = mix(col, lash.rgb, clamp(upper + wing + lower * 0.7, 0.0, 1.0));
		} else {
			// Closed eye: a gentle curved lash line.
			float cy = en.y + 0.15 - 0.25 * (1.0 - en.x * en.x);
			col = mix(col, lash.rgb, (1.0 - aastep(0.12, abs(cy))) * (1.0 - aastep(1.05, abs(en.x))));
		}
	}
	ALBEDO = col;
	ROUGHNESS = 1.0;
	EMISSION = col * skin_shadow.rgb * ambient_level;
}

void light() {
	char_light(NORMAL, LIGHT, VIEW, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, 0.0, DIFFUSE_LIGHT, SPECULAR_LIGHT);
}
