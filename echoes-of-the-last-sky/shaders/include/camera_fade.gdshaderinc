// Dithered dissolve for geometry very close to the camera (foliage the camera passes through).
uniform float camera_fade_distance = 2.8;

float bayer4(vec2 p) {
	ivec2 i = ivec2(mod(p, 4.0));
	float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
	return (m[i.x + i.y * 4] + 0.5) / 16.0;
}

bool camera_faded(vec3 view_pos, vec2 frag) {
	float d = length(view_pos);
	return d < camera_fade_distance && smoothstep(camera_fade_distance * 0.35, camera_fade_distance, d) < bayer4(frag);
}
