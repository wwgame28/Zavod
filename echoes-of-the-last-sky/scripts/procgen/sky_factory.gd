@tool
class_name SkyFactory
extends RefCounted
## Meshes for the atmosphere: cumulus towers, the cloud sea surface, grass and flower clumps.


## Cumulus cloud tower made of soft blobs; flat-ish bottom at y = 0.
static func cumulus(rng: RandomNumberGenerator, width: float, height: float, subdiv: int = 2) -> MeshKit:
	var kit := MeshKit.new()
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 1.0
	var center := Vector3(0.0, height * 0.32, 0.0)
	var layers := [[7, 0.16, 0.24, 0.48], [5, 0.42, 0.2, 0.32], [3, 0.66, 0.16, 0.17]]
	for layer in layers:
		var count: int = layer[0]
		for k in count:
			var ang := TAU * float(k) / float(count) + rng.randf_range(-0.3, 0.3)
			var spread: float = layer[3]
			var off := Vector3(cos(ang) * width * spread, height * float(layer[1]), sin(ang) * width * spread * 0.7)
			var r := width * float(layer[2]) * rng.randf_range(0.8, 1.2)
			off.y += rng.randf_range(-0.05, 0.05) * height
			kit.add_blob(off, Vector3(r, r * 0.85, r), subdiv, Color.WHITE, noise, 0.14, center, 0.5, 0.5, 0.0)
	var top_r := width * 0.2
	kit.add_blob(Vector3(0.0, height * 0.82 - top_r * 0.4, 0.0), Vector3(top_r, top_r * 0.9, top_r), subdiv, Color.WHITE, noise, 0.15, center, 0.5, 0.3)
	return kit


## Polar grid for the sea of clouds: dense near the islands, sparse toward the horizon.
## UV.x stores the normalized radius so the shader can fade displacement with distance.
static func cloud_sea_grid(radius: float, angular: int, radial: int) -> MeshKit:
	var kit := MeshKit.new()
	var center := kit.add_vertex(Vector3.ZERO, Vector3.UP, Color.WHITE, Vector2.ZERO)
	var rings := []
	for j in range(1, radial + 1):
		var f := float(j) / float(radial)
		var r := radius * pow(f, 2.0)
		var ring := PackedInt32Array()
		for i in angular:
			var a := TAU * float(i) / float(angular)
			ring.push_back(kit.add_vertex(Vector3(cos(a) * r, 0.0, sin(a) * r), Vector3.UP, Color.WHITE, Vector2(f, 0.0)))
		rings.append(ring)
	var first: PackedInt32Array = rings[0]
	for i in angular:
		kit.add_tri(center, first[i], first[(i + 1) % angular])
	for j in rings.size() - 1:
		IslandBuilder._stitch(kit, rings[j], rings[j + 1], angular)
	return kit


## Clump of curved grass blades. Color alpha = height along the blade (0 root -> 1 tip).
static func grass_clump(rng: RandomNumberGenerator, blades: int, height: float, width: float) -> MeshKit:
	var kit := MeshKit.new()
	for b in blades:
		var ang := rng.randf() * TAU
		var base := Vector3(cos(ang), 0.0, sin(ang)) * rng.randf_range(0.0, 0.28)
		var face := rng.randf() * TAU
		var side := Vector3(cos(face), 0.0, sin(face))
		var lean := Vector3(-side.z, 0.0, side.x) * rng.randf_range(0.15, 0.45)
		var h := height * rng.randf_range(0.6, 1.15)
		var shade := rng.randf_range(0.85, 1.1)
		var segs := 3
		var prev_l := -1
		var prev_r := -1
		for s in segs + 1:
			var t := float(s) / float(segs)
			var center := base + Vector3(0.0, h * t, 0.0) + lean * h * t * t
			var col := Color(shade, shade, shade, t)
			if s == segs:
				var tip := kit.add_vertex(center, Vector3.UP, col, Vector2(0.5, t))
				kit.add_tri_facing(prev_l, prev_r, tip, lean.cross(side))
			else:
				var w := width * (1.0 - t * 0.75)
				var l := kit.add_vertex(center - side * w * 0.5, Vector3.UP, col, Vector2(0.0, t))
				var r := kit.add_vertex(center + side * w * 0.5, Vector3.UP, col, Vector2(1.0, t))
				if prev_l >= 0:
					kit.add_quad_facing(prev_l, prev_r, r, l, lean.cross(side))
				prev_l = l
				prev_r = r
	return kit


## Small five-petal flower on a thin stem; petal colour comes from vertex color.
static func flower(rng: RandomNumberGenerator, petal: Color, height: float = 0.45) -> MeshKit:
	var kit := MeshKit.new()
	var stem := Color(0.32, 0.55, 0.25, 0.0)
	var h := height * rng.randf_range(0.8, 1.2)
	var side := Vector3(1.0, 0.0, 0.0)
	var a := kit.add_vertex(-side * 0.015, Vector3.UP, stem)
	var b := kit.add_vertex(side * 0.015, Vector3.UP, stem)
	var c := kit.add_vertex(Vector3(0.0, h, 0.0) + side * 0.01, Vector3.UP, Color(stem.r, stem.g, stem.b, 1.0))
	var d := kit.add_vertex(Vector3(0.0, h, 0.0) - side * 0.01, Vector3.UP, Color(stem.r, stem.g, stem.b, 1.0))
	kit.add_quad_facing(a, b, c, d, Vector3.FORWARD)
	var center := Vector3(0.0, h, 0.0)
	var petal_col := Color(petal.r, petal.g, petal.b, 1.0)
	var heart := kit.add_vertex(center + Vector3(0.0, 0.01, 0.0), Vector3.UP, Color(1.0, 0.85, 0.4, 1.0))
	var tilt := Basis(Vector3.RIGHT, rng.randf_range(-0.35, 0.35))
	var petals := 5
	var size := 0.09 * rng.randf_range(0.8, 1.25)
	for p in petals:
		var ang := TAU * float(p) / float(petals)
		var dir := tilt * Vector3(cos(ang), 0.0, sin(ang))
		var l := tilt * Vector3(cos(ang - 0.45), 0.0, sin(ang - 0.45))
		var r := tilt * Vector3(cos(ang + 0.45), 0.0, sin(ang + 0.45))
		var i0 := kit.add_vertex(center + l * size * 0.55, Vector3.UP, petal_col)
		var i1 := kit.add_vertex(center + dir * size, Vector3.UP, petal_col)
		var i2 := kit.add_vertex(center + r * size * 0.55, Vector3.UP, petal_col)
		kit.add_tri_facing(heart, i0, i1, tilt * Vector3.UP)
		kit.add_tri_facing(heart, i1, i2, tilt * Vector3.UP)
	return kit
