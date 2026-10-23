@tool
class_name RockFactory
extends RefCounted
## Chiselled stylized rocks: noise-displaced icospheres cut by random planes, then facet-shaded.
## Vertex color alpha = 1 marks plain stone for the stone shader.


static func rock(rng: RandomNumberGenerator, size: Vector3, color: Color, cuts: int = 7,
		subdiv: int = 2, flat_bottom: float = -0.6, smooth_blend: float = 0.3) -> MeshKit:
	var ico := MeshKit.icosphere(subdiv)
	var pv: PackedVector3Array = (ico[0] as PackedVector3Array).duplicate()
	var tri: PackedInt32Array = ico[1]
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 1.0
	for i in pv.size():
		pv[i] *= 1.0 + 0.16 * noise.get_noise_3dv(pv[i] * 1.6)
	for _k in cuts:
		var n := Vector3(rng.randf_range(-1.0, 1.0), rng.randf_range(-0.5, 1.0), rng.randf_range(-1.0, 1.0)).normalized()
		var d := rng.randf_range(0.55, 0.85)
		for i in pv.size():
			var dist := pv[i].dot(n)
			if dist > d:
				pv[i] -= n * (dist - d)
	var kit := MeshKit.new()
	for i in pv.size():
		var p := pv[i]
		p.y = maxf(p.y, flat_bottom)
		var shade := 0.88 + 0.12 * clampf(p.y * 0.5 + 0.5, 0.0, 1.0)
		var c := Color(color.r * shade, color.g * shade, color.b * shade, 1.0)
		kit.add_vertex(p * size, p.normalized(), c)
	for idx in tri:
		kit.indices.push_back(idx)
	kit.facetize(smooth_blend)
	return kit


## Layered slabs stacked into a cliff buttress (reads as sedimentary strata).
static func strata_stack(rng: RandomNumberGenerator, width: float, height: float, depth: float,
		layers: int, color_a: Color, color_b: Color) -> MeshKit:
	var kit := MeshKit.new()
	var y := 0.0
	var layer_h := height / float(layers)
	for l in layers:
		var lh := layer_h * rng.randf_range(0.85, 1.2)
		var taper := 1.0 - 0.12 * float(l) / float(layers)
		var s := Vector3(width * rng.randf_range(0.8, 1.05) * taper, lh * 0.6, depth * rng.randf_range(0.8, 1.05) * taper)
		var col := color_a.lerp(color_b, rng.randf())
		var piece := rock(rng, s, col, 6, 1, -0.75, 0.2)
		var xf := Transform3D(Basis(Vector3.UP, rng.randf_range(-0.25, 0.25)),
				Vector3(rng.randf_range(-0.1, 0.1) * width, y + lh * 0.45, rng.randf_range(-0.1, 0.1) * depth))
		kit.append(piece, xf)
		y += lh * 0.82
	return kit


## Hanging rock spire for island undersides (points down from the origin).
static func spire(rng: RandomNumberGenerator, length: float, radius: float, color_top: Color,
		color_tip: Color, sides: int = 7) -> MeshKit:
	var kit := MeshKit.new()
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 1.0
	var segs := 7
	var drift := Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)) * radius * 0.6
	var rings := []
	var centers := PackedVector3Array()
	for k in segs:
		var t := float(k) / float(segs)
		var center := Vector3(0.0, -length * t, 0.0) + drift * t * t
		centers.push_back(center)
		var r := radius * pow(1.0 - t, 0.85)
		var ring := []
		for s in sides:
			var ang := TAU * (float(s) + 0.5 * float(k % 2)) / float(sides)
			var dir := Vector3(cos(ang), 0.0, sin(ang))
			var rr := r * (1.0 + 0.22 * noise.get_noise_2d(float(s) * 1.7, float(k) * 0.9))
			ring.append(kit.add_vertex(center + dir * rr, dir, color_top.lerp(color_tip, t)))
		rings.append(ring)
	for k in segs - 1:
		for s in sides:
			var s1 := (s + 1) % sides
			var out := kit.verts[rings[k][s]] - centers[k]
			kit.add_quad_facing(rings[k][s], rings[k][s1], rings[k + 1][s1], rings[k + 1][s], out)
	var tip := kit.add_vertex(Vector3(0.0, -length, 0.0) + drift, Vector3.DOWN, color_tip)
	for s in sides:
		var s1 := (s + 1) % sides
		var out := kit.verts[rings[segs - 1][s]] - centers[segs - 1] + Vector3.DOWN * radius * 0.3
		kit.add_tri_facing(rings[segs - 1][s], rings[segs - 1][s1], tip, out)
	# Cap the top so the root is closed when it pokes out of the underside.
	var cap := kit.add_vertex(Vector3.ZERO, Vector3.UP, color_top)
	for s in sides:
		kit.add_tri_facing(rings[0][s], rings[0][(s + 1) % sides], cap, Vector3.UP)
	kit.facetize(0.35)
	return kit
