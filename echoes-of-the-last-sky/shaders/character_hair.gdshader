// Hair: silver root fading to sky-blue tips (UV.y = 0 root -> 1 tip), cool shadow, anime
// "angel ring" highlight band across the crown. UV2.x = 1 marks the gold hair band.
shader_type spatial;
render_mode cull_back, diffuse_lambert, ambient_light_disabled;

#include "res://shaders/include/character_lighting.gdshaderinc"

uniform vec4 root_color : source_color = vec4(0.93, 0.94, 0.99, 1.0);
uniform vec4 tip_color : source_color = vec4(0.42, 0.64, 0.98, 1.0);
uniform vec4 shadow_color : source_color = vec4(0.64, 0.67, 0.93, 1.0);
uniform vec4 gold : source_color = vec4(0.96, 0.76, 0.4, 1.0);
uniform float tip_start = 0.42;
uniform float ring_strength = 0.55;

varying vec3 view_up;
varying float v_metal;

void vertex() {
	view_up = (VIEW_MATRIX * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
}

void fragment() {
	bool band = UV2.x > 0.5;
	float t = UV.y;
	vec3 col = mix(root_color.rgb, tip_color.rgb, smoothstep(tip_start, 1.0, t));
	// Darker lock edges and undersides separate the strands (UV.x runs around each lock).
	float edge = smoothstep(0.14, 0.26, abs(UV.x)) * step(0.08, t);
	col *= 1.0 - 0.2 * edge;
	float metal = 0.0;
	if (band) {
		col = gold.rgb;
		metal = 1.0;
	}
	v_metal = metal;
	// Angel ring: a bright band where the surface turns away from straight up, near the crown.
	float up = dot(NORMAL, normalize(view_up));
	float ring = (1.0 - aastep(0.09, abs(up - 0.55))) * (1.0 - aastep(0.45, t)) * (band ? 0.0 : 1.0);
	ALBEDO = col;
	ROUGHNESS = 1.0;
	EMISSION = col * shadow_color.rgb * ambient_level + vec3(1.0) * ring * ring_strength * 0.35;
}

void light() {
	char_light(NORMAL, LIGHT, VIEW, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, v_metal, DIFFUSE_LIGHT, SPECULAR_LIGHT);
}
