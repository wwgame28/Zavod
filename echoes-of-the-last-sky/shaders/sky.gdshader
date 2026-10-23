// Painted anime sky: layered gradient, warm sun halo, toon-banded drifting cloud layer.
shader_type sky;

uniform vec4 zenith_color : source_color = vec4(0.08, 0.3, 0.78, 1.0);
uniform vec4 mid_color : source_color = vec4(0.3, 0.56, 0.93, 1.0);
uniform vec4 horizon_color : source_color = vec4(0.8, 0.86, 0.94, 1.0);
uniform vec4 below_color : source_color = vec4(0.78, 0.8, 0.93, 1.0);
uniform vec4 sun_color : source_color = vec4(1.0, 0.93, 0.78, 1.0);
uniform vec4 glow_color : source_color = vec4(1.0, 0.8, 0.6, 1.0);
uniform vec4 cloud_lit : source_color = vec4(1.0, 0.99, 0.97, 1.0);
uniform vec4 cloud_shade : source_color = vec4(0.68, 0.73, 0.93, 1.0);
uniform sampler2D cloud_noise : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform float sun_size = 0.035;
uniform float cloud_coverage = 0.52;
uniform float cloud_scale = 0.32;
uniform vec2 cloud_offset = vec2(0.13, 0.41);

void sky() {
	vec3 d = EYEDIR;
	float y = d.y;
	vec3 col = mix(horizon_color.rgb, mid_color.rgb, smoothstep(0.0, 0.22, y));
	col = mix(col, zenith_color.rgb, smoothstep(0.15, 0.85, y));
	col = mix(col, below_color.rgb, smoothstep(0.0, -0.15, y));

	vec3 sun_dir = LIGHT0_ENABLED ? LIGHT0_DIRECTION : normalize(vec3(-0.6, 0.5, 0.6));
	float sd = max(dot(d, sun_dir), 0.0);
	vec2 sxz = normalize(sun_dir.xz + vec2(1e-4));
	float az = max(dot(normalize(d.xz + vec2(1e-4)), sxz), 0.0);
	col += glow_color.rgb * pow(az, 4.0) * (1.0 - smoothstep(0.0, 0.4, abs(y))) * 0.3;
	col += sun_color.rgb * (pow(sd, 10.0) * 0.28 + pow(sd, 90.0) * 0.5);
	float disc = smoothstep(cos(sun_size * 1.25), cos(sun_size), sd);

	if (!AT_CUBEMAP_PASS && y > 0.0) {
		vec2 uv = d.xz / (y + 0.18) * cloud_scale + cloud_offset;
		float n = texture(cloud_noise, uv).r * 0.65 + texture(cloud_noise, uv * 2.6 + vec2(0.3, 0.7)).r * 0.35;
		vec2 to_sun = sxz * 0.025;
		float n_sun = texture(cloud_noise, uv + to_sun).r * 0.65 + texture(cloud_noise, (uv + to_sun) * 2.6 + vec2(0.3, 0.7)).r * 0.35;
		float cov = smoothstep(cloud_coverage, cloud_coverage + 0.05, n);
		float lit = smoothstep(-0.02, 0.02, n - n_sun + 0.015);
		vec3 ccol = mix(cloud_shade.rgb, cloud_lit.rgb, lit);
		ccol += sun_color.rgb * pow(sd, 6.0) * 0.35 * (1.0 - cov * 0.5);
		float fade = smoothstep(0.02, 0.2, y);
		col = mix(col, ccol, cov * fade * 0.92);
		disc *= 1.0 - cov * fade;
	}
	col = mix(col, sun_color.rgb * 4.0, disc);
	COLOR = col;
}
