// The sea of clouds beneath the islands: slowly drifting billows displaced on the GPU.
// UV.x = normalized radius of the grid (billows flatten toward the horizon).
shader_type spatial;
render_mode cull_disabled, diffuse_lambert, specular_disabled;

uniform sampler2D billow_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D detail_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform float amplitude = 42.0;
uniform float scale = 0.0012;
uniform float detail_scale = 0.006;
uniform vec2 drift = vec2(0.0016, 0.0007);
uniform vec4 top_color : source_color = vec4(0.96, 0.95, 0.94, 1.0);
uniform vec4 valley_color : source_color = vec4(0.5, 0.56, 0.88, 1.0);
uniform vec4 rim_color : source_color = vec4(1.0, 0.94, 0.85, 1.0);
uniform float fade_radius = 0.8;
uniform float band_softness = 0.22;

varying float h01;

float dome(float d) {
	return 1.0 - d * d;
}

float cloud_h(vec2 xz) {
	vec2 uv = xz * scale + TIME * drift;
	float b = dome(textureLod(billow_tex, uv, 0.0).r);
	float b2 = dome(textureLod(billow_tex, uv * 2.3 + vec2(0.37, 0.11), 0.0).r);
	float d = textureLod(detail_tex, xz * detail_scale + TIME * drift * 1.7, 0.0).r;
	return b * 0.6 + b2 * 0.28 + d * 0.12;
}

void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float amp = amplitude * (1.0 - smoothstep(fade_radius * 0.55, fade_radius, UV.x));
	float e = 8.0;
	float h = cloud_h(wp.xz);
	float hx = cloud_h(wp.xz + vec2(e, 0.0));
	float hz = cloud_h(wp.xz + vec2(0.0, e));
	VERTEX.y += h * amp;
	NORMAL = normalize(vec3(-(hx - h) * amp / e, 1.0, -(hz - h) * amp / e));
	h01 = mix(h, 0.6, smoothstep(fade_radius * 0.55, fade_radius, UV.x));
}

void fragment() {
	float t = smoothstep(0.42, 0.86, h01);
	ALBEDO = mix(valley_color.rgb, top_color.rgb, t * t * (3.0 - 2.0 * t));
	ROUGHNESS = 1.0;
	EMISSION = top_color.rgb * pow(t, 3.0) * 0.06;
}

void light() {
	float ndl = dot(NORMAL, LIGHT);
	if (LIGHT_IS_DIRECTIONAL) {
		float lit = smoothstep(-band_softness, band_softness, ndl);
		float shadow = mix(0.45, 1.0, ATTENUATION);
		DIFFUSE_LIGHT += LIGHT_COLOR / PI * lit * shadow;
		float back = pow(clamp(-dot(VIEW, LIGHT), 0.0, 1.0), 6.0);
		float edge = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
		DIFFUSE_LIGHT += LIGHT_COLOR / PI * rim_color.rgb * back * edge * 0.8;
	} else {
		DIFFUSE_LIGHT += LIGHT_COLOR / PI * ATTENUATION * clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
	}
}
