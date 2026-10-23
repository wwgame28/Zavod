// Alpha-blended particle sprites: dust, smoke, mist, droplets, leaves. A cheap sun/shade term keeps
// them seated in the toon-lit world without full lighting cost.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, unshaded, shadows_disabled;

#include "res://shaders/vfx/vfx_common.gdshaderinc"

uniform vec4 shade_color : source_color = vec4(0.72, 0.74, 0.9, 1.0);
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
	// Upper half catches the sun, lower half takes the cool shade.
	float lit = smoothstep(-0.2, 0.6, 1.0 - UV.y * 1.4);
	ALBEDO = COLOR.rgb * mix(shade_color.rgb, vec3(1.0), lit) * energy;
	ALPHA = a * COLOR.a;
}
