// Soft drifting cloud wisp billboards around the islands.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, unshaded, shadows_disabled;

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform vec4 color : source_color = vec4(1.0, 0.99, 0.97, 1.0);
uniform vec4 shade_color : source_color = vec4(0.74, 0.78, 0.94, 1.0);
uniform float opacity = 0.6;
uniform float soft_distance = 25.0;
uniform float near_fade = 60.0;

instance uniform float seed = 0.0;

void vertex() {
	float sx = length(MODEL_MATRIX[0].xyz);
	float sy = length(MODEL_MATRIX[1].xyz);
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(INV_VIEW_MATRIX[0] * sx, INV_VIEW_MATRIX[1] * sy, INV_VIEW_MATRIX[2], MODEL_MATRIX[3]);
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}

void fragment() {
	vec2 uv = UV - 0.5;
	float r = length(uv * vec2(1.0, 1.7)) * 2.0;
	vec2 o = vec2(seed, seed * 0.37);
	float n = texture(noise_tex, UV * 0.7 + o + vec2(TIME * 0.003, 0.0)).r;
	float n2 = texture(noise_tex, UV * 1.8 + o.yx - vec2(TIME * 0.005, 0.0)).r;
	float shape = (1.0 - smoothstep(0.3, 1.0, r)) * smoothstep(0.38, 0.62, n * 0.6 + n2 * 0.4 + (1.0 - r) * 0.3);
	float d = texture(depth_tex, SCREEN_UV).r;
	vec4 v = INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, d, 1.0);
	float thick = -v.z / v.w + VERTEX.z;
	float soft = clamp(thick / soft_distance, 0.0, 1.0);
	float cam_fade = smoothstep(near_fade * 0.25, near_fade, -VERTEX.z);
	ALBEDO = mix(shade_color.rgb, color.rgb, clamp(0.5 - uv.y + (n2 - 0.5) * 0.6, 0.0, 1.0));
	ALPHA = shape * opacity * soft * cam_fade;
}
