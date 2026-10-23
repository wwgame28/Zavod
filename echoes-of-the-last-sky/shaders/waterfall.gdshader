// Falling water ribbon. UV.x across (0..1), UV.y = metres from the lip; dissolves into mist below.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, unshaded, shadows_disabled;

uniform sampler2D noise_tex : hint_default_white, filter_linear_mipmap, repeat_enable;
uniform vec4 water_light : source_color = vec4(0.62, 0.93, 0.96, 1.0);
uniform vec4 water_dark : source_color = vec4(0.28, 0.62, 0.82, 1.0);
uniform vec4 foam : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float speed = 0.55;
uniform float fade_start = 35.0;
uniform float fade_end = 75.0;

void fragment() {
	float s1 = texture(noise_tex, vec2(UV.x * 1.3, UV.y * 0.035 - TIME * speed)).r;
	float s2 = texture(noise_tex, vec2(UV.x * 2.9 + 0.3, UV.y * 0.07 - TIME * speed * 1.45)).r;
	float streak = s1 * 0.6 + s2 * 0.4;
	vec3 col = mix(water_dark.rgb, water_light.rgb, smoothstep(0.38, 0.52, streak));
	col = mix(col, foam.rgb, smoothstep(0.6, 0.66, streak));
	col = mix(col, foam.rgb, (1.0 - smoothstep(0.0, 3.0, UV.y)) * 0.85);
	float edge = smoothstep(0.0, 0.14, UV.x) * smoothstep(1.0, 0.86, UV.x);
	float fade = 1.0 - smoothstep(fade_start, fade_end, UV.y + (s2 - 0.5) * 12.0);
	col = mix(col, foam.rgb, smoothstep(fade_start * 0.6, fade_end, UV.y) * 0.6);
	ALBEDO = col;
	ALPHA = edge * fade * mix(0.7, 0.95, streak);
}
