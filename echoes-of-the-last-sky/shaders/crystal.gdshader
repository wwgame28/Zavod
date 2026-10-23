// Echo Crystals: faceted, self-lit from within, bright fresnel rim and a sharp specular glint.
// UV.y = 0 at the base, 1 at the tip.
shader_type spatial;
render_mode cull_back, diffuse_lambert;

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 base_color : source_color = vec4(0.1, 0.38, 0.62, 1.0);
uniform vec4 glow_color : source_color = vec4(0.42, 1.0, 1.0, 1.0);
uniform vec4 rim_color : source_color = vec4(0.85, 1.0, 1.0, 1.0);
uniform float glow_energy = 3.6;
uniform float rim_energy = 2.0;
uniform float pulse_speed = 0.9;

varying vec3 world_pos;
varying vec3 origin;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	origin = MODEL_MATRIX[3].xyz;
}

void fragment() {
	float g = UV.y;
	float inner = texture(noise_tex, world_pos.xy * 0.16 + world_pos.zy * 0.11 + vec2(TIME * 0.015)).r;
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 2.0);
	float pulse = 0.82 + 0.18 * sin(TIME * pulse_speed + dot(origin, vec3(0.13, 0.07, 0.11)));
	vec3 body = mix(base_color.rgb, glow_color.rgb, clamp(g * 0.75 + (inner - 0.5) * 0.5, 0.0, 1.0));
	ALBEDO = body * 0.35;
	ROUGHNESS = 0.2;
	EMISSION = body * glow_energy * (0.3 + 0.7 * g) * pulse * (0.7 + 0.6 * inner) + rim_color.rgb * fres * rim_energy;
}

void light() {
	float ndl = dot(NORMAL, LIGHT);
	DIFFUSE_LIGHT += LIGHT_COLOR / PI * smoothstep(0.0, 0.1, ndl) * ATTENUATION * 0.6;
	if (LIGHT_IS_DIRECTIONAL) {
		vec3 h = normalize(LIGHT + VIEW);
		float spec = smoothstep(0.93, 0.96, dot(NORMAL, h));
		SPECULAR_LIGHT += LIGHT_COLOR * spec * 0.6 * ATTENUATION;
	}
}
