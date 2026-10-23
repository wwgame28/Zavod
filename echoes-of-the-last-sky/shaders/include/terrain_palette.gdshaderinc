// Ground palette shared by the terrain and the grass so blades blend into the soil they grow from.
// Plain uniforms (not global ones) so headless exports keep every material parameter.
uniform vec4 grass_color_dark : source_color = vec4(0.15, 0.42, 0.3, 1.0);
uniform vec4 grass_color_mid : source_color = vec4(0.35, 0.63, 0.24, 1.0);
uniform vec4 grass_color_light : source_color = vec4(0.7, 0.8, 0.3, 1.0);

vec3 grass_palette(sampler2D noise, vec2 xz, float meadow) {
	float n1 = texture(noise, xz * 0.006).r;
	float n2 = texture(noise, xz * 0.027 + vec2(0.37, 0.71)).r;
	float n3 = texture(noise, xz * 0.11 + vec2(0.13, 0.29)).r;
	vec3 c = mix(grass_color_dark.rgb, grass_color_mid.rgb, smoothstep(0.2, 0.42, n1 + (meadow - 0.5) * 0.3));
	c = mix(c, grass_color_light.rgb, smoothstep(0.56, 0.82, n1 * 0.6 + n2 * 0.4));
	return c * (0.93 + 0.12 * n3);
}
