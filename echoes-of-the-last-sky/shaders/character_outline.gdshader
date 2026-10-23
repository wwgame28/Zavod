// Inverted-hull ink outline for characters (used as next_pass). Width grows with distance so the
// line keeps a roughly constant on-screen thickness, clamped so far-away figures stay clean.
shader_type spatial;
render_mode unshaded, cull_front, shadows_disabled;

uniform vec4 outline_color : source_color = vec4(0.22, 0.16, 0.25, 1.0);
uniform float width = 0.0024;
uniform float max_width = 0.011;

void vertex() {
	float dist = -(MODELVIEW_MATRIX * vec4(VERTEX, 1.0)).z;
	float scale = max(length(MODEL_MATRIX[0].xyz), 1e-4);
	VERTEX += NORMAL * min(width * dist, max_width) / scale;
}

void fragment() {
	ALBEDO = outline_color.rgb;
}
