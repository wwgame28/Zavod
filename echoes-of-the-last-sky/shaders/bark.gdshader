// Tree bark: toon-lit with vertical grain, sways with the canopy (vertex alpha = sway weight).
shader_type spatial;
render_mode cull_back, diffuse_lambert, specular_disabled;

#include "res://shaders/include/toon_lighting.gdshaderinc"
#include "res://shaders/include/wind.gdshaderinc"

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 tint : source_color = vec4(1.0);
uniform vec4 rim_color : source_color = vec4(0.85, 0.92, 1.0, 1.0);
uniform float rim_strength = 0.15;

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	VERTEX += world_to_local(MODEL_MATRIX, wind_offset(wp, MODEL_MATRIX[3].xyz, COLOR.a, 0.0));
}

void fragment() {
	float grain = texture(noise_tex, vec2(UV.x * 2.0, UV.y * 0.08)).r;
	float grain2 = texture(noise_tex, vec2(UV.x * 5.0 + 0.3, UV.y * 0.2)).r;
	ALBEDO = COLOR.rgb * tint.rgb * (0.78 + 0.3 * smoothstep(0.35, 0.7, grain * 0.7 + grain2 * 0.3));
	ROUGHNESS = 1.0;
	EMISSION = ALBEDO * rim_color.rgb * toon_fresnel(NORMAL, VIEW, 4.0) * rim_strength;
}

void light() {
	toon_light(NORMAL, LIGHT, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, DIFFUSE_LIGHT);
}
