// Rocks and ancient ruins. Vertex color rgb = stone tint; alpha selects layer:
// 1 = stone (with moss on upward faces), 0.5 = gold trim, 0 = glowing rune.
shader_type spatial;
render_mode cull_back, diffuse_lambert, specular_disabled;

#include "res://shaders/include/toon_lighting.gdshaderinc"

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 tint : source_color = vec4(1.0);
uniform vec4 moss_color : source_color = vec4(0.4, 0.62, 0.3, 1.0);
uniform float moss_amount : hint_range(0.0, 1.0) = 0.5;
uniform float moss_scale = 0.12;
uniform vec4 trim_color : source_color = vec4(0.98, 0.76, 0.38, 1.0);
uniform vec4 rune_color : source_color = vec4(0.42, 0.96, 1.0, 1.0);
uniform float rune_energy = 3.0;
uniform vec4 rim_color : source_color = vec4(0.85, 0.92, 1.0, 1.0);
uniform float rim_strength = 0.2;
uniform vec4 bounce_color : source_color = vec4(0.75, 0.78, 1.0, 1.0);
uniform float bounce_strength = 0.15;

instance uniform float bob_amount = 0.0;
instance uniform float bob_phase = 0.0;

varying vec3 world_pos;
varying vec3 world_nrm;
varying float trim_mask;

void vertex() {
	VERTEX.y += sin(TIME * 0.45 + bob_phase) * bob_amount;
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_nrm = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

void fragment() {
	float layer = COLOR.a;
	float n = texture(noise_tex, world_pos.xz * moss_scale + vec2(world_pos.y * 0.05)).r;
	float n2 = texture(noise_tex, (world_pos.xy + world_pos.zy) * 0.35).r;
	vec3 stone = COLOR.rgb * tint.rgb * (0.9 + 0.18 * n2);
	float moss = smoothstep(0.5, 0.8, world_nrm.y + (n - 0.5) * 0.7) * smoothstep(0.38, 0.58, n) * moss_amount;
	vec3 col = mix(stone, moss_color.rgb * (0.85 + 0.3 * n2), moss);
	float is_trim = 1.0 - smoothstep(0.15, 0.3, abs(layer - 0.5));
	float is_rune = 1.0 - smoothstep(0.1, 0.2, layer);
	trim_mask = is_trim;
	col = mix(col, trim_color.rgb, is_trim);
	col = mix(col, rune_color.rgb * 0.5, is_rune);
	ALBEDO = col;
	ROUGHNESS = 1.0;
	float fres = toon_fresnel(NORMAL, VIEW, 4.0);
	float pulse = 0.75 + 0.25 * sin(TIME * 1.6 + world_pos.x * 0.3 + world_pos.z * 0.2);
	float down = clamp(-world_nrm.y, 0.0, 1.0);
	EMISSION = rune_color.rgb * rune_energy * is_rune * pulse
			+ ALBEDO * (rim_color.rgb * fres * rim_strength + bounce_color.rgb * down * bounce_strength)
			+ trim_color.rgb * is_trim * fres * 0.35;
}

void light() {
	toon_light(NORMAL, LIGHT, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, DIFFUSE_LIGHT);
	if (LIGHT_IS_DIRECTIONAL && trim_mask > 0.01) {
		vec3 h = normalize(LIGHT + VIEW);
		float spec = smoothstep(0.86, 0.9, dot(NORMAL, h));
		SPECULAR_LIGHT += LIGHT_COLOR * spec * trim_mask * 0.25 * ATTENUATION;
	}
}
