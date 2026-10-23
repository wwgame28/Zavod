// Island terrain: painted meadow palette, sandy paths, layered sandstone cliffs, dusky underside.
shader_type spatial;
render_mode cull_back, diffuse_lambert, specular_disabled;

#include "res://shaders/include/toon_lighting.gdshaderinc"
#include "res://shaders/include/terrain_palette.gdshaderinc"

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 path_color : source_color = vec4(0.88, 0.78, 0.6, 1.0);
uniform vec4 path_edge_color : source_color = vec4(0.58, 0.6, 0.36, 1.0);
uniform vec4 rock_light : source_color = vec4(0.9, 0.8, 0.64, 1.0);
uniform vec4 rock_mid : source_color = vec4(0.8, 0.65, 0.5, 1.0);
uniform vec4 rock_warm : source_color = vec4(0.76, 0.54, 0.42, 1.0);
uniform vec4 underside_color : source_color = vec4(0.46, 0.36, 0.52, 1.0);
uniform vec4 underside_deep : source_color = vec4(0.22, 0.19, 0.37, 1.0);
uniform vec4 bounce_color : source_color = vec4(0.75, 0.78, 1.0, 1.0);
uniform float bounce_strength = 0.16;
uniform vec4 flower_a : source_color = vec4(1.0, 0.97, 0.88, 1.0);
uniform vec4 flower_b : source_color = vec4(1.0, 0.82, 0.88, 1.0);
uniform float strata_scale = 2.4;
uniform float rock_slope = 0.64;
uniform vec4 rim_color : source_color = vec4(0.85, 0.92, 1.0, 1.0);
uniform float rim_strength = 0.2;

// Depth of the island below its local origin; set per island so the dusky gradient fits its size.
instance uniform float underside_depth = 100.0;

varying vec3 world_pos;
varying vec3 world_nrm;
varying float local_y;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_nrm = normalize(mat3(MODEL_MATRIX) * NORMAL);
	local_y = VERTEX.y;
}

vec3 rock_albedo(vec3 wp, float n) {
	float sy = wp.y / strata_scale + n * 0.9;
	float band = floor(sy);
	float h = fract(sin(band * 12.9898 + 78.233) * 43758.5453);
	vec3 c = h < 0.45 ? rock_light.rgb : (h < 0.8 ? rock_mid.rgb : rock_warm.rgb);
	float f = fract(sy);
	float crease = smoothstep(0.0, 0.08, f) * smoothstep(1.0, 0.9, f);
	return c * mix(0.8, 1.0, crease);
}

void fragment() {
	vec3 n = normalize(world_nrm);
	float nz = texture(noise_tex, world_pos.xz * 0.05).r;
	float nwall = texture(noise_tex, vec2(world_pos.x + world_pos.z, world_pos.y * 1.6) * 0.03).r;
	vec3 ground = grass_palette(noise_tex, world_pos.xz, COLOR.g);
	float pm = COLOR.r + (nz - 0.5) * 0.45;
	float path = smoothstep(0.42, 0.62, pm);
	float path_edge = clamp(smoothstep(0.12, 0.4, pm) - path, 0.0, 1.0);
	// Flower speckles so meadows still read as blooming fields beyond grass draw distance.
	float speck = texture(noise_tex, world_pos.xz * 0.9).r;
	float bloom = smoothstep(0.55, 0.8, COLOR.g) * step(0.74, speck) * (1.0 - path);
	vec3 petal = mix(flower_a.rgb, flower_b.rgb, step(0.5, fract(speck * 37.0)));
	ground = mix(ground, petal, bloom * 0.75);
	ground = mix(ground, path_edge_color.rgb, path_edge * 0.55);
	ground = mix(ground, path_color.rgb * (0.9 + 0.14 * nz), path);

	float slope_rock = 1.0 - smoothstep(rock_slope - 0.07, rock_slope + 0.07, n.y + (nz - 0.5) * 0.25);
	float wall = smoothstep(0.3, 0.75, COLOR.b);
	float rock_m = max(slope_rock, wall);
	vec3 rock = rock_albedo(world_pos, nwall);
	float under_t = clamp(-local_y / underside_depth, 0.0, 1.0);
	rock = mix(rock, underside_color.rgb * (0.88 + 0.22 * nwall), smoothstep(0.02, 0.5, under_t) * wall);
	rock = mix(rock, underside_deep.rgb, smoothstep(0.45, 1.0, under_t) * wall);

	ALBEDO = mix(ground, rock, rock_m);
	ROUGHNESS = 1.0;
	float down = clamp(-n.y, 0.0, 1.0);
	EMISSION = ALBEDO * (rim_color.rgb * toon_fresnel(NORMAL, VIEW, 4.0) * rim_strength + bounce_color.rgb * down * bounce_strength);
}

void light() {
	toon_light(NORMAL, LIGHT, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, DIFFUSE_LIGHT);
}
