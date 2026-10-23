// Stylized pond water: depth-tinted, banded ripple highlights, foam where it meets the shore.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_back, unshaded;

uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 shallow : source_color = vec4(0.46, 0.88, 0.84, 1.0);
uniform vec4 deep : source_color = vec4(0.13, 0.42, 0.62, 1.0);
uniform vec4 foam : source_color = vec4(0.95, 1.0, 1.0, 1.0);
uniform vec4 sky_tint : source_color = vec4(0.78, 0.9, 1.0, 1.0);
uniform float depth_fade = 2.5;
uniform float foam_width = 0.55;

varying vec3 world_pos;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float d = texture(depth_tex, SCREEN_UV).r;
	vec4 v = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, d, 1.0);
	float scene_depth = -v.z / v.w;
	float thick = scene_depth + VERTEX.z;
	float k = clamp(thick / depth_fade, 0.0, 1.0);
	vec2 uv = world_pos.xz * 0.07;
	float n1 = texture(noise_tex, uv + TIME * vec2(0.012, 0.008)).r;
	float n2 = texture(noise_tex, uv * 1.7 - TIME * vec2(0.01, 0.015)).r;
	float ripple = smoothstep(0.6, 0.63, (n1 + n2) * 0.5 + 0.1);
	float edge = 1.0 - smoothstep(foam_width * 0.5, foam_width, thick + (n1 - 0.5) * 0.35);
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
	vec3 col = mix(shallow.rgb, deep.rgb, smoothstep(0.0, 1.0, k));
	col = mix(col, sky_tint.rgb, fres * 0.5);
	col = mix(col, foam.rgb, max(edge, ripple * 0.45));
	ALBEDO = col;
	ALPHA = clamp(mix(0.55, 0.9, k) + edge, 0.0, 1.0);
}
