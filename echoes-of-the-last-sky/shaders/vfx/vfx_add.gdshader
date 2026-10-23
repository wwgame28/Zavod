// Additive, unshaded particle sprites: magic glows, glints, sparks of light, energy beams.
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded, shadows_disabled, fog_disabled;

#include "res://shaders/vfx/vfx_common.gdshaderinc"

uniform bool billboard = true;

varying vec4 v_custom;

void vertex() {
	v_custom = INSTANCE_CUSTOM;
	if (billboard) {
		MODELVIEW_MATRIX = vfx_billboard(VIEW_MATRIX, INV_VIEW_MATRIX, MODEL_MATRIX, INSTANCE_CUSTOM.x);
		MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
	}
}

void fragment() {
	float a = vfx_shape(UV, v_custom.z, v_custom.y);
	a *= vfx_soft(SCREEN_UV, texture(depth_tex, SCREEN_UV).r, VERTEX, INV_PROJECTION_MATRIX);
	ALBEDO = COLOR.rgb * energy;
	ALPHA = a * COLOR.a;
}
