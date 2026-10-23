// Tree canopies: soft spherified normals broken up by noise clumps, back-lit translucency, wind.
shader_type spatial;
render_mode cull_back, diffuse_lambert, specular_disabled;

#include "res://shaders/include/toon_lighting.gdshaderinc"
#include "res://shaders/include/wind.gdshaderinc"

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 tint : source_color = vec4(1.0);
uniform vec4 translucency_color : source_color = vec4(0.95, 1.0, 0.6, 1.0);
uniform float translucency = 0.45;
uniform float flutter = 0.06;
uniform float clump_scale = 0.32;
uniform float normal_noise = 0.9;
uniform vec4 rim_color : source_color = vec4(0.92, 1.0, 0.85, 1.0);
uniform float rim_strength = 0.35;

varying vec3 world_pos;

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	VERTEX += world_to_local(MODEL_MATRIX, wind_offset(wp, MODEL_MATRIX[3].xyz, COLOR.a, flutter));
	world_pos = wp;
}

void fragment() {
	vec3 p = world_pos * clump_scale;
	float a = texture(noise_tex, p.xz + p.y * 0.37).r;
	float b = texture(noise_tex, p.zy + vec2(0.5, 0.21)).r;
	float c = texture(noise_tex, p.xy + vec2(0.25, 0.73)).r;
	vec3 pert = (vec3(a, b, c) - 0.5) * normal_noise;
	NORMAL = normalize(NORMAL + (VIEW_MATRIX * vec4(pert, 0.0)).xyz);
	ALBEDO = COLOR.rgb * tint.rgb * (0.92 + 0.16 * a);
	ROUGHNESS = 1.0;
	EMISSION = ALBEDO * rim_color.rgb * toon_fresnel(NORMAL, VIEW, 3.0) * rim_strength;
}

void light() {
	toon_light(NORMAL, LIGHT, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, DIFFUSE_LIGHT);
	if (LIGHT_IS_DIRECTIONAL) {
		float back = pow(clamp(dot(VIEW, -LIGHT), 0.0, 1.0), 3.0);
		DIFFUSE_LIGHT += LIGHT_COLOR / PI * translucency_color.rgb * back * translucency * (0.4 + 0.6 * ATTENUATION);
	}
}
