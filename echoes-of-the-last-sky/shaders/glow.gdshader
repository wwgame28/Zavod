// Additive glow for rune rings and floating sigils. UV.x runs along the ring, UV.y across it.
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, unshaded, shadows_disabled;

uniform vec4 color : source_color = vec4(0.45, 1.0, 1.0, 1.0);
uniform float energy = 3.0;
uniform float glyphs = 36.0;
uniform float scroll = 0.02;

float hash(float x) {
	return fract(sin(x * 91.3458) * 47453.5453);
}

void fragment() {
	float u = (UV.x + TIME * scroll) * glyphs;
	float cell = floor(u);
	vec2 f = vec2(fract(u), UV.y);
	float h = hash(cell);
	float h2 = hash(cell + 17.0);
	float stroke_v = step(abs(f.x - (0.3 + 0.4 * h)), 0.07) * step(0.2, f.y) * step(f.y, 0.8);
	float stroke_h = step(abs(f.y - (0.3 + 0.4 * h2)), 0.07) * step(0.15, f.x) * step(f.x, 0.85);
	float glyph = max(stroke_v, stroke_h * step(0.35, h2)) * step(0.15, h);
	float border = step(abs(UV.y - 0.5), 0.5) * (step(UV.y, 0.08) + step(0.92, UV.y));
	float pulse = 0.75 + 0.25 * sin(TIME * 2.0 + cell * 0.7);
	ALBEDO = color.rgb * energy * pulse;
	ALPHA = clamp(glyph + border * 0.7 + 0.12, 0.0, 1.0);
}
