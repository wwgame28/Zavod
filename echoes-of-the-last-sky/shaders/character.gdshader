// Hero outfit and skin. UV2.x = part id (HeroBuilder.Part), UV2.y = rest-pose height,
// UV = per-part pattern coordinates. Patterns (panels, trims, buttons) are painted here so
// clothing seams stay crisp at any distance without textures. `use_texture` switches to an
// imported albedo texture (e.g. a Tripo3D model).
shader_type spatial;
render_mode cull_back, diffuse_lambert, ambient_light_disabled;

#include "res://shaders/include/character_lighting.gdshaderinc"

uniform bool use_texture = false;
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, hint_default_white;
uniform vec4 albedo_tint : source_color = vec4(1.0);
uniform vec4 skin : source_color = vec4(1.0, 0.89, 0.82, 1.0);
uniform vec4 ivory : source_color = vec4(0.96, 0.93, 0.86, 1.0);
uniform vec4 sky : source_color = vec4(0.42, 0.64, 0.93, 1.0);
uniform vec4 navy : source_color = vec4(0.17, 0.2, 0.36, 1.0);
uniform vec4 tights : source_color = vec4(0.14, 0.14, 0.21, 1.0);
uniform vec4 leather : source_color = vec4(0.5, 0.34, 0.24, 1.0);
uniform vec4 glove : source_color = vec4(0.27, 0.22, 0.26, 1.0);
uniform vec4 gold : source_color = vec4(0.96, 0.76, 0.4, 1.0);
uniform vec4 lining : source_color = vec4(0.3, 0.47, 0.78, 1.0);
uniform vec4 skin_shadow : source_color = vec4(1.0, 0.74, 0.76, 1.0);
uniform vec4 cloth_shadow : source_color = vec4(0.7, 0.72, 0.95, 1.0);

varying float v_metal;

void fragment() {
	int part = int(UV2.x + 0.5);
	float y = UV2.y;
	float u = UV.x;
	float v = UV.y;
	vec3 col = ivory.rgb;
	vec3 sh = cloth_shadow.rgb;
	float metal = 0.0;
	if (use_texture) {
		col = texture(albedo_tex, UV).rgb * albedo_tint.rgb;
		sh = mix(cloth_shadow.rgb, skin_shadow.rgb, 0.5);
	} else if (part == 0) {
		col = skin.rgb;
		sh = skin_shadow.rgb;
	} else if (part == 1) {
		float au = abs(u);
		col = mix(ivory.rgb, sky.rgb, 1.0 - aastep(0.05, abs(au - 0.25)));
		float vn = (y - 1.235) * 1.15;
		float vneck = aastep(1.235, y) * (1.0 - aastep(vn, au));
		col = mix(col, navy.rgb, vneck);
		float vtrim = aastep(1.235, y) * (1.0 - aastep(0.006, abs(au - vn)));
		float front = aastep(0.99, y) * (1.0 - aastep(1.235, y)) * (1.0 - aastep(0.0045, au));
		vec2 bp = vec2(u * 0.7, fract((y - 1.005) / 0.05) * 0.05 - 0.025);
		float button = aastep(1.01, y) * (1.0 - aastep(1.215, y)) * (1.0 - aastep(0.0055, length(bp)));
		// Emblem on the back: a gold diamond with a sky-blue core.
		vec2 ep = vec2((0.5 - au) * 0.7 / 0.032, (y - 1.24) / 0.045);
		float dia = abs(ep.x) + abs(ep.y);
		float emblem = (1.0 - aastep(1.0, dia)) * aastep(0.78, dia);
		col = mix(col, sky.rgb, 1.0 - aastep(0.55, dia));
		metal = max(max(vtrim, max(front, button)), emblem);
		col = mix(col, gold.rgb, metal);
		col = mix(navy.rgb, col, aastep(0.985, y));
	} else if (part == 2) {
		float side = min(abs(u - 0.25), abs(u - 0.75));
		col = mix(ivory.rgb, sky.rgb, 1.0 - aastep(0.05, side));
		col = mix(col, sky.rgb, 1.0 - aastep(0.035, abs(u - 0.5)));
		float edge = 1.0 - aastep(0.012, min(abs(u - 0.0875), abs(u - 0.9125)));
		float hem = aastep(0.9, v) * (1.0 - aastep(0.95, v));
		metal = max(edge, hem);
		col = mix(col, gold.rgb, metal);
	} else if (part == 3) {
		col = lining.rgb;
	} else if (part == 4) {
		float cuff = aastep(0.86, v);
		col = mix(ivory.rgb, sky.rgb, cuff);
		metal = (1.0 - aastep(0.008, abs(v - 0.865))) + (1.0 - aastep(0.008, abs(v - 0.975)));
		col = mix(col, gold.rgb, clamp(metal, 0.0, 1.0));
	} else if (part == 5) {
		col = navy.rgb;
	} else if (part == 13) {
		col = tights.rgb;
	} else if (part == 6) {
		col = mix(leather.rgb, leather.rgb * 1.22, aastep(0.428, y) * (1.0 - aastep(0.482, y)));
		col = mix(leather.rgb * 0.45, col, aastep(0.013, y));
	} else if (part == 7) {
		col = glove.rgb;
	} else if (part == 8) {
		col = leather.rgb * 0.86;
	} else if (part == 9) {
		col = gold.rgb;
		metal = 1.0;
	} else if (part == 10) {
		col = sky.rgb * 0.92;
		float trim = aastep(0.86, v) * (1.0 - aastep(0.93, v));
		float edge = 1.0 - aastep(0.012, min(abs(u - 0.0557), abs(u - 0.5557)));
		metal = max(trim, edge);
		col = mix(col, gold.rgb, metal);
	} else if (part == 11) {
		metal = aastep(0.82, v);
		col = mix(ivory.rgb, gold.rgb, metal);
	} else if (part == 12) {
		col = ivory.rgb * 0.9;
	}
	metal = clamp(metal, 0.0, 1.0);
	if (metal > 0.0) {
		sh = mix(sh, vec3(0.86, 0.64, 0.52), metal);
	}
	v_metal = metal;
	ALBEDO = col;
	ROUGHNESS = 1.0;
	EMISSION = col * sh * ambient_level;
}

void light() {
	char_light(NORMAL, LIGHT, VIEW, LIGHT_COLOR, ATTENUATION, LIGHT_IS_DIRECTIONAL, v_metal, DIFFUSE_LIGHT, SPECULAR_LIGHT);
}
