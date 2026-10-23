// Flat expanding ring (shockwaves, pulses, water ripples) drawn on a horizontal quad particle.
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded, shadows_disabled, fog_disabled;

uniform float energy = 1.2;
uniform float thickness = 0.12;

varying vec4 v_custom;

void vertex() {
	v_custom = INSTANCE_CUSTOM;
}

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float life = v_custom.y;
	float w = mix(thickness, thickness * 0.25, life);
	float ring = (1.0 - smoothstep(0.0, w, abs(r - 0.85))) * (1.0 - step(1.0, r));
	float inner = (1.0 - smoothstep(0.0, 0.85, r)) * 0.12 * (1.0 - life);
	ALBEDO = COLOR.rgb * energy;
	ALPHA = (ring + inner) * COLOR.a;
}
