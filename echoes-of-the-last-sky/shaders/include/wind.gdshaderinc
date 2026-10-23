// Wind shared by trees, grass and flowers. wind_params: xy = direction, z = sway (m), w = speed.
uniform vec4 wind_params = vec4(0.8, 0.45, 0.35, 0.9);

vec3 wind_offset(vec3 world_pos, vec3 origin, float weight, float flutter) {
	vec2 dir = normalize(wind_params.xy + vec2(1e-4));
	float t = TIME * wind_params.w;
	float phase = dot(origin.xz, vec2(0.031, 0.047));
	float sway = sin(t + phase) * 0.65 + sin(t * 2.17 + phase * 1.7) * 0.35;
	float gust = 0.65 + 0.35 * sin(t * 0.27 + origin.x * 0.012 + origin.z * 0.008);
	vec3 off = vec3(dir.x, 0.0, dir.y) * sway * gust * wind_params.z * weight;
	off += vec3(sin(t * 3.1 + world_pos.x * 0.9), 0.5 * sin(t * 2.6 + world_pos.y * 1.3), cos(t * 2.9 + world_pos.z * 0.8)) * flutter * weight;
	return off;
}

// Converts a world-space direction into model space (rotation + uniform scale).
vec3 world_to_local(mat4 model, vec3 v) {
	mat3 m = mat3(model);
	return (transpose(m) * v) / max(dot(m[0], m[0]), 1e-6);
}
