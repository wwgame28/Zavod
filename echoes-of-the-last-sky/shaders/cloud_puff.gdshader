// Cumulus towers: very soft cel bands, lavender shade, silver lining when back-lit.
shader_type spatial;
render_mode cull_back, diffuse_lambert, specular_disabled;

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 tint : source_color = vec4(1.0, 0.99, 0.98, 1.0);
uniform vec4 shade_color : source_color = vec4(0.7, 0.72, 0.92, 1.0);
uniform vec4 rim_color : source_color = vec4(1.0, 0.95, 0.85, 1.0);
uniform float band_softness = 0.3;
uniform float rim_energy = 1.2;
uniform float normal_noise = 0.6;

varying vec3 world_pos;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec3 p = world_pos * 0.012;
	float a = texture(noise_tex, p.xz + p.y * 0.3).r;
	float b = texture(noise_tex, p.zy + vec2(0.4, 0.1)).r;
	float c = texture(noise_tex, p.xy + vec2(0.7, 0.3)).r;
	NORMAL = normalize(NORMAL + (VIEW_MATRIX * vec4((vec3(a, b, c) - 0.5) * normal_noise, 0.0)).xyz);
	ALBEDO = mix(shade_color.rgb, tint.rgb, COLOR.r * 0.6 + 0.4);
	ROUGHNESS = 1.0;
}

void light() {
	if (LIGHT_IS_DIRECTIONAL) {
		float ndl = dot(NORMAL, LIGHT);
		float lit = smoothstep(-band_softness * 0.5, band_softness, ndl);
		DIFFUSE_LIGHT += LIGHT_COLOR / PI * lit * mix(0.5, 1.0, ATTENUATION);
		float back = pow(clamp(-dot(VIEW, LIGHT), 0.0, 1.0), 4.0);
		float edge = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
		DIFFUSE_LIGHT += LIGHT_COLOR / PI * rim_color.rgb * back * edge * rim_energy;
	}
}
