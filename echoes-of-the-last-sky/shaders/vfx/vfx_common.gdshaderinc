// Shared pieces of the VFX particle shaders: camera-facing billboard with particle spin and
// procedural sprite shapes, so effects need no textures. Particle data from ParticleProcessMaterial:
// INSTANCE_CUSTOM.x = spin angle, .y = life fraction, .z = random seed (anim offset), COLOR = colour ramp.

// 0 glow, 1 smoke puff, 2 star glint, 3 droplet, 4 soft beam, 5 leaf/petal, 6 ring
uniform int shape = 0;
uniform float energy = 1.0;
uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform sampler2D depth_tex : hint_depth_texture, filter_linear_mipmap;
uniform float soft_distance = 0.4;

mat4 vfx_billboard(mat4 view, mat4 inv_view, mat4 model, float angle) {
	float sx = length(model[0].xyz);
	float sy = length(model[1].xyz);
	mat4 bb = mat4(inv_view[0] * sx, inv_view[1] * sy, inv_view[2], model[3]);
	mat4 spin = mat4(vec4(cos(angle), -sin(angle), 0.0, 0.0), vec4(sin(angle), cos(angle), 0.0, 0.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(0.0, 0.0, 0.0, 1.0));
	return view * bb * spin;
}

float vfx_shape(vec2 uv, float seed, float life) {
	vec2 p = uv * 2.0 - 1.0;
	float r = length(p);
	if (shape == 1) {
		float n = texture(noise_tex, uv * 0.55 + vec2(seed * 3.1, seed * 1.7) + vec2(life * 0.12)).r;
		float body = 1.0 - smoothstep(0.3, 1.0, r + (n - 0.5) * 0.8);
		return clamp(body * (0.55 + 0.6 * n), 0.0, 1.0);
	} else if (shape == 2) {
		float cross_x = exp(-abs(p.y) * 22.0) * (1.0 - abs(p.x));
		float cross_y = exp(-abs(p.x) * 22.0) * (1.0 - abs(p.y));
		float core = pow(max(0.0, 1.0 - r * 2.4), 2.0);
		return clamp(max(cross_x, cross_y) + core, 0.0, 1.0);
	} else if (shape == 3) {
		float d = length(p * vec2(2.0, 1.0));
		return 1.0 - smoothstep(0.55, 1.0, d);
	} else if (shape == 4) {
		return pow(max(0.0, 1.0 - abs(p.x)), 2.5) * (1.0 - smoothstep(0.5, 1.0, abs(p.y)));
	} else if (shape == 5) {
		float d = length(vec2(p.x * 1.9, p.y + 0.15 * p.x * p.x));
		return 1.0 - smoothstep(0.75, 0.95, d);
	} else if (shape == 6) {
		float w = mix(0.14, 0.03, life);
		return (1.0 - smoothstep(0.0, w, abs(r - 0.82))) * (1.0 - step(1.0, r));
	}
	return pow(clamp(1.0 - r, 0.0, 1.0), 1.8);
}

float vfx_soft(vec2 screen_uv, float depth_raw, vec3 vertex, mat4 inv_proj) {
	vec4 v = inv_proj * vec4(screen_uv * 2.0 - 1.0, depth_raw, 1.0);
	float scene = -v.z / v.w;
	return clamp((scene + vertex.z) / max(soft_distance, 1e-3), 0.0, 1.0);
}
