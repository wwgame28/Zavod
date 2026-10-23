// Soft additive light motes for particles (billboarded, colour/alpha from the particle).
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded, shadows_disabled;

uniform vec4 color : source_color = vec4(0.6, 1.0, 1.0, 1.0);
uniform float energy = 2.0;

void vertex() {
	float s = length(MODEL_MATRIX[0].xyz);
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(INV_VIEW_MATRIX[0] * s, INV_VIEW_MATRIX[1] * s, INV_VIEW_MATRIX[2] * s, MODEL_MATRIX[3]);
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}

void fragment() {
	float r = length(UV - 0.5) * 2.0;
	float a = pow(1.0 - clamp(r, 0.0, 1.0), 2.2);
	ALBEDO = color.rgb * COLOR.rgb * energy;
	ALPHA = a * COLOR.a;
}
