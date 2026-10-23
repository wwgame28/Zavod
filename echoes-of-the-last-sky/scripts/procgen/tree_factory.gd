@tool
class_name TreeFactory
extends RefCounted
## Stylized anime-style trees. Canopies are clusters of noisy blobs with normals bent toward the
## canopy centre, which gives the soft painterly toon shading typical of the genre.
## Every factory returns {"bark": MeshKit, "leaves": MeshKit}; vertex alpha = wind sway weight.


static func _noise(rng: RandomNumberGenerator) -> FastNoiseLite:
	var n := FastNoiseLite.new()
	n.seed = rng.randi()
	n.frequency = 1.0
	return n


static func _apply_sway(kit: MeshKit, height: float, exponent: float = 1.6) -> void:
	for i in kit.verts.size():
		var c := kit.colors[i]
		c.a = pow(clampf(kit.verts[i].y / height, 0.0, 1.0), exponent)
		kit.colors[i] = c


static func _sample(points: PackedVector3Array, t: float) -> Vector3:
	var f := clampf(t, 0.0, 1.0) * float(points.size() - 1)
	var i := mini(int(f), points.size() - 2)
	return points[i].lerp(points[i + 1], f - float(i))


static func _random_unit(rng: RandomNumberGenerator) -> Vector3:
	var v := Vector3(rng.randf_range(-1, 1), rng.randf_range(-1, 1), rng.randf_range(-1, 1))
	return v.normalized() if v.length_squared() > 0.001 else Vector3.UP


## Rounded broadleaf tree.
static func broadleaf(rng: RandomNumberGenerator, height: float, canopy: float, leaf: Color,
		bark: Color, subdiv: int = 2, branch_count: int = 4) -> Dictionary:
	var bark_kit := MeshKit.new()
	var leaf_kit := MeshKit.new()
	var noise := _noise(rng)
	var lean := Vector3(rng.randf_range(-1, 1), 0.0, rng.randf_range(-1, 1)).normalized() * height * 0.1
	var trunk := PackedVector3Array()
	var radii := PackedFloat32Array()
	var segs := 6
	var r0 := height * 0.05
	var trunk_h := height * 0.62
	var phase := rng.randf() * TAU
	for i in segs + 1:
		var t := float(i) / float(segs)
		var wiggle := Vector3(sin(t * 4.0 + phase), 0.0, cos(t * 3.0 + phase)) * height * 0.025
		trunk.push_back(Vector3(0.0, t * trunk_h, 0.0) + lean * t * t + wiggle * t)
		radii.push_back(r0 * lerpf(1.0, 0.5, t) * (1.0 + 0.7 * pow(1.0 - t, 8.0)))
	bark_kit.add_tube(trunk, radii, 8, bark.darkened(0.15), bark, true, noise, 0.12)

	var crown := trunk[segs] + Vector3(0.0, canopy * 0.3, 0.0)
	var tips: Array[Vector3] = [crown]
	for b in branch_count:
		var t := rng.randf_range(0.55, 0.92)
		var start := _sample(trunk, t)
		var yaw := TAU * (float(b) + rng.randf() * 0.6) / float(branch_count)
		var dir := Vector3(cos(yaw), rng.randf_range(0.45, 0.85), sin(yaw)).normalized()
		var length := canopy * rng.randf_range(0.6, 0.9)
		var rb := r0 * lerpf(1.0, 0.5, t)
		var bp := PackedVector3Array([start, start + dir * length * 0.5 + Vector3(0.0, length * 0.12, 0.0), start + dir * length])
		bark_kit.add_tube(bp, PackedFloat32Array([rb * 0.6, rb * 0.38, rb * 0.2]), 6, bark, bark, true)
		tips.append(start + dir * length)

	for tip in tips:
		var n := rng.randi_range(2, 3)
		for _k in n:
			var off := _random_unit(rng) * canopy * 0.32
			off.y *= 0.6
			var r := canopy * rng.randf_range(0.42, 0.58)
			var col := leaf.lerp(leaf.lightened(0.12), rng.randf())
			leaf_kit.add_blob(tip + off, Vector3(r, r * 0.82, r), subdiv, col, noise, 0.2, crown, 0.6, 0.35)
	_apply_sway(bark_kit, height)
	_apply_sway(leaf_kit, height)
	return {"bark": bark_kit, "leaves": leaf_kit}


## Tall layered conifer for high ground and distant islands.
static func conifer(rng: RandomNumberGenerator, height: float, radius: float, leaf: Color,
		bark: Color, tiers: int = 4) -> Dictionary:
	var bark_kit := MeshKit.new()
	var leaf_kit := MeshKit.new()
	var trunk := PackedVector3Array([Vector3.ZERO, Vector3(0.0, height * 0.5, 0.0), Vector3(0.0, height * 0.9, 0.0)])
	bark_kit.add_tube(trunk, PackedFloat32Array([radius * 0.12, radius * 0.08, radius * 0.03]), 6, bark.darkened(0.2), bark, true)
	var sides := 12
	for k in tiers:
		var f := float(k) / float(tiers)
		var base_y := lerpf(height * 0.18, height * 0.62, f)
		var top_y := base_y + height * lerpf(0.42, 0.38, f)
		var r := radius * lerpf(1.0, 0.45, f)
		var col := leaf.darkened(0.12 * (1.0 - f))
		var rim := []
		for s in sides:
			var ang := TAU * (float(s) + 0.5 * float(k % 2)) / float(sides)
			var dir := Vector3(cos(ang), 0.0, sin(ang))
			var droop := 0.0 if s % 2 == 0 else height * 0.035
			var rr := r * (0.86 if s % 2 == 1 else 1.0) * rng.randf_range(0.92, 1.08)
			var n := (dir * 0.8 + Vector3.UP * 0.55).normalized()
			rim.append(leaf_kit.add_vertex(dir * rr + Vector3(0.0, base_y - droop, 0.0), n, col))
		var apex := leaf_kit.add_vertex(Vector3(0.0, top_y, 0.0), Vector3.UP, col.lightened(0.15))
		var under := leaf_kit.add_vertex(Vector3(0.0, base_y + height * 0.06, 0.0), Vector3.DOWN, col.darkened(0.3))
		for s in sides:
			var s1 := (s + 1) % sides
			var mid := Vector3(cos(TAU * (s + 0.5) / sides), 0.4, sin(TAU * (s + 0.5) / sides))
			leaf_kit.add_tri_facing(rim[s], rim[s1], apex, mid)
			leaf_kit.add_tri_facing(rim[s], rim[s1], under, Vector3.DOWN)
	_apply_sway(bark_kit, height)
	_apply_sway(leaf_kit, height)
	return {"bark": bark_kit, "leaves": leaf_kit}


## Low rounded shrub.
static func bush(rng: RandomNumberGenerator, size: float, leaf: Color, subdiv: int = 1) -> Dictionary:
	var leaf_kit := MeshKit.new()
	var noise := _noise(rng)
	var center := Vector3(0.0, size * 0.45, 0.0)
	var n := rng.randi_range(3, 5)
	for k in n:
		var ang := TAU * float(k) / float(n) + rng.randf()
		var off := Vector3(cos(ang), 0.0, sin(ang)) * size * rng.randf_range(0.2, 0.5)
		var r := size * rng.randf_range(0.45, 0.65)
		off.y = r * 0.55
		leaf_kit.add_blob(off, Vector3(r, r * 0.8, r), subdiv, leaf.lerp(leaf.lightened(0.15), rng.randf()),
				noise, 0.18, center, 0.55, 0.3, 0.0)
	_apply_sway(leaf_kit, size * 3.0, 1.0)
	return {"bark": MeshKit.new(), "leaves": leaf_kit}


## The ancient guardian tree: buttress roots, twisting trunk, broad umbrella crown.
static func ancient(rng: RandomNumberGenerator, height: float, canopy: float, leaf: Color, bark: Color) -> Dictionary:
	var bark_kit := MeshKit.new()
	var leaf_kit := MeshKit.new()
	var noise := _noise(rng)
	var trunk := PackedVector3Array()
	var radii := PackedFloat32Array()
	var segs := 9
	var r0 := height * 0.08
	var trunk_h := height * 0.6
	for i in segs + 1:
		var t := float(i) / float(segs)
		var sway := Vector3(sin(t * 3.4 + 0.6) * 1.6, 0.0, cos(t * 2.6) * 1.2) * t
		trunk.push_back(Vector3(0.0, t * trunk_h, 0.0) + sway)
		radii.push_back(r0 * lerpf(1.0, 0.55, t) * (1.0 + 0.9 * pow(1.0 - t, 6.0)))
	bark_kit.add_tube(trunk, radii, 12, bark.darkened(0.2), bark, true, noise, 0.14)

	# Buttress roots spreading into the ground.
	var root_count := 7
	for k in root_count:
		var ang := TAU * float(k) / float(root_count) + rng.randf_range(-0.2, 0.2)
		var dir := Vector3(cos(ang), 0.0, sin(ang))
		var reach := r0 * rng.randf_range(2.6, 4.2)
		var pts := PackedVector3Array([
			dir * r0 * 0.4 + Vector3(0.0, r0 * 1.6, 0.0),
			dir * r0 * 1.3 + Vector3(0.0, r0 * 0.7, 0.0),
			dir * reach * 0.7 + Vector3(0.0, r0 * 0.1, 0.0),
			dir * reach + Vector3(0.0, -r0 * 0.5, 0.0),
		])
		bark_kit.add_tube(pts, PackedFloat32Array([r0 * 0.5, r0 * 0.42, r0 * 0.25, r0 * 0.1]), 7,
				bark.darkened(0.25), bark.darkened(0.1), true, noise, 0.15)

	# Main limbs with sub-branches, each ending in a canopy cluster.
	var crown := trunk[segs] + Vector3(0.0, canopy * 0.12, 0.0)
	var tips: Array[Vector3] = []
	var limbs := 6
	for b in limbs:
		var t := rng.randf_range(0.6, 0.95)
		var start := _sample(trunk, t)
		var yaw := TAU * (float(b) + rng.randf_range(-0.25, 0.25)) / float(limbs)
		var dir := Vector3(cos(yaw), rng.randf_range(0.3, 0.55), sin(yaw)).normalized()
		var length := canopy * rng.randf_range(0.55, 0.75)
		var rb := r0 * 0.45
		var mid := start + dir * length * 0.5 + Vector3(0.0, length * 0.25, 0.0)
		var end := start + dir * length + Vector3(0.0, length * 0.15, 0.0)
		bark_kit.add_tube(PackedVector3Array([start, mid, end]), PackedFloat32Array([rb, rb * 0.6, rb * 0.25]), 8,
				bark, bark, true, noise, 0.1)
		tips.append(end)
		var side_dir := (dir + Vector3(-dir.z, 0.3, dir.x) * 0.8).normalized()
		var side_end := mid + side_dir * length * 0.45
		bark_kit.add_tube(PackedVector3Array([mid, side_end]), PackedFloat32Array([rb * 0.4, rb * 0.15]), 6, bark, bark, true)
		tips.append(side_end)
	tips.append(crown + Vector3(0.0, canopy * 0.12, 0.0))

	for tip in tips:
		var n := rng.randi_range(4, 5)
		for _k in n:
			var off := _random_unit(rng) * canopy * 0.26
			off.y *= 0.45
			var r := canopy * rng.randf_range(0.2, 0.3)
			var col := leaf.lerp(leaf.lightened(0.18), rng.randf())
			leaf_kit.add_blob(tip + off, Vector3(r, r * 0.72, r), 2, col, noise, 0.25, crown, 0.32, 0.45)
	_apply_sway(bark_kit, height, 2.5)
	_apply_sway(leaf_kit, height, 2.5)
	return {"bark": bark_kit, "leaves": leaf_kit}
