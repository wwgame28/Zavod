// Screen-space ink lines from depth discontinuities, faded with distance. Multiplies the frame,
// so line colour is a tint rather than flat black. Pixels tagged with roughness 0 (grass) are skipped.
shader_type spatial;
render_mode unshaded, depth_draw_never, depth_test_disabled, cull_disabled, blend_mul, fog_disabled, shadows_disabled;

uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
uniform sampler2D nr_tex : hint_normal_roughness_texture, filter_nearest;
uniform vec4 line_tint : source_color = vec4(0.42, 0.36, 0.52, 1.0);
uniform float strength = 0.75;
uniform float threshold = 0.06;
uniform float max_distance = 260.0;

void vertex() {
	POSITION = vec4(VERTEX.xy, 1.0, 1.0);
}

float lin_depth(vec2 uv, mat4 inv_proj) {
	float d = texture(depth_tex, uv).r;
	vec4 v = inv_proj * vec4(uv * 2.0 - 1.0, d, 1.0);
	return -v.z / v.w;
}

// Grass writes roughness 0, which the buffer stores near 0 (static) or 1 (dynamic flag);
// every other surface lands near the middle of the range.
bool is_grass(vec2 uv) {
	float w = texture(nr_tex, uv).w;
	return w < 0.2 || w > 0.8;
}

void fragment() {
	vec2 px = 1.0 / VIEWPORT_SIZE;
	float c = lin_depth(SCREEN_UV, INV_PROJECTION_MATRIX);
	float l = lin_depth(SCREEN_UV - vec2(px.x, 0.0), INV_PROJECTION_MATRIX);
	float r = lin_depth(SCREEN_UV + vec2(px.x, 0.0), INV_PROJECTION_MATRIX);
	float u = lin_depth(SCREEN_UV - vec2(0.0, px.y), INV_PROJECTION_MATRIX);
	float b = lin_depth(SCREEN_UV + vec2(0.0, px.y), INV_PROJECTION_MATRIX);
	float near_d = min(c, min(min(l, r), min(u, b)));
	float edge = max(0.0, (l + r + u + b - 4.0 * c)) / max(c, 0.001);
	edge = smoothstep(threshold, threshold * 2.5, edge);
	edge *= 1.0 - smoothstep(max_distance * 0.4, max_distance, near_d);
	// Lines sit on the nearer surface (the centre pixel); skip it when it is tagged grass.
	edge *= is_grass(SCREEN_UV) ? 0.0 : 1.0;
	ALBEDO = mix(vec3(1.0), line_tint.rgb, edge * strength);
}
