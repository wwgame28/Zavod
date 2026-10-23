// Velocity-stretched streaks (sparks, droplets in flight, wind lines). The particle's Y axis is
// aligned to its velocity (particle_flag_align_y); the quad turns to the camera around that axis.
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded, shadows_disabled, fog_disabled;

uniform float energy = 1.5;
uniform float stretch = 4.0;
uniform float width = 0.6;

void vertex() {
	vec3 axis = normalize(MODEL_MATRIX[1].xyz + vec3(0.0, 1e-5, 0.0));
	float size = length(MODEL_MATRIX[0].xyz);
	vec3 center = MODEL_MATRIX[3].xyz;
	vec3 to_cam = normalize(INV_VIEW_MATRIX[3].xyz - center);
	vec3 side = normalize(cross(axis, to_cam) + vec3(1e-5, 0.0, 0.0));
	mat4 m = mat4(vec4(side * size * width, 0.0), vec4(axis * size * stretch, 0.0), vec4(to_cam, 0.0), vec4(center, 1.0));
	MODELVIEW_MATRIX = VIEW_MATRIX * m;
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float a = pow(max(0.0, 1.0 - abs(p.x)), 2.0) * (1.0 - smoothstep(0.2, 1.0, abs(p.y)));
	a *= mix(1.0, 0.4, smoothstep(-1.0, 1.0, p.y));
	ALBEDO = COLOR.rgb * energy;
	ALPHA = a * COLOR.a;
}
