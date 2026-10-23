// Grass clumps and flowers (MultiMesh). Blades take the terrain palette at their root, lean in the
// wind and shrink away with distance. Roughness 0 tags the pixels so the outline pass skips them.
shader_type spatial;
render_mode cull_disabled, diffuse_lambert, specular_disabled;

#include "res://shaders/include/toon_lighting.gdshaderinc"
#include "res://shaders/include/wind.gdshaderinc"
#include "res://shaders/include/terrain_palette.gdshaderinc"

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform bool use_vertex_color = false;
uniform vec4 tip_color : source_color = vec4(0.93, 0.95, 0.6, 1.0);
uniform float tip_mix = 0.3;
uniform float root_darken = 0.14;
uniform float fade_start = 42.0;
uniform float fade_end = 68.0;
uniform float flutter = 0.03;

varying vec3 root_world;
varying float blade_t;

void vertex() {
	vec3 origin = MODEL_MATRIX[3].xyz;
	float dist = length(origin - INV_VIEW_MATRIX[3].xyz);
	VERTEX *= 1.0 - smoothstep(fade_start, fade_end, dist);
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	VERTEX += world_to_local(MODEL_MATRIX, wind_offset(wp, origin, COLOR.a, flutter) * 1.6);
	NORMAL = normalize(transpose(mat3(MODEL_MATRIX)) * vec3(0.0, 1.0, 0.0));
	root_world = origin;
	blade_t = COLOR.a;
}

void fragment() {
	vec3 col;
	if (use_vertex_color) {
		col = COLOR.rgb;
	} else {
		vec3 base = grass_palette(noise_tex, root_world.xz, 0.5);
		col = base * mix(1.0 - root_darken, 1.0, blade_t) * COLOR.rgb;
		col = mix(col, tip_color.rgb * (base + 0.25), tip_mix * smoothstep(0.55, 1.0, blade_t));
	}
	ALBEDO = col;
	ROUGHNESS = 0.0;
}

void light() {
	toon_light(NORMAL, LIGHT, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, DIFFUSE_LIGHT);
}
