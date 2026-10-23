@tool
class_name CrystalFactory
extends RefCounted
## Echo Crystal geometry: faceted hexagonal prisms with pointed tips.
## UV.y runs 0 (base) -> 1 (tip) so the crystal shader can grade emission along the crystal.


static func prism(kit: MeshKit, xform: Transform3D, radius: float, height: float, sides: int = 6) -> void:
	var tmp := MeshKit.new()
	var bottom := []
	var shoulder := []
	var body_h := height * 0.72
	for s in sides:
		var ang := TAU * float(s) / float(sides)
		var dir := Vector3(cos(ang), 0.0, sin(ang))
		bottom.append(tmp.add_vertex(dir * radius + Vector3(0.0, -radius * 0.6, 0.0), dir, Color.WHITE, Vector2(0.0, 0.0)))
		shoulder.append(tmp.add_vertex(dir * radius * 0.92 + Vector3(0.0, body_h, 0.0), dir, Color.WHITE, Vector2(0.0, 0.72)))
	var tip := tmp.add_vertex(Vector3(0.0, height, 0.0), Vector3.UP, Color.WHITE, Vector2(0.0, 1.0))
	for s in sides:
		var s1 := (s + 1) % sides
		var mid := Vector3(cos(TAU * (s + 0.5) / sides), 0.0, sin(TAU * (s + 0.5) / sides))
		tmp.add_quad_facing(bottom[s], bottom[s1], shoulder[s1], shoulder[s], mid)
		tmp.add_tri_facing(shoulder[s], shoulder[s1], tip, mid + Vector3.UP)
	tmp.facetize(0.0)
	kit.append(tmp, xform)


## Cluster of crystals fanning out from a base point; the first crystal is the tallest.
static func cluster(rng: RandomNumberGenerator, count: int, base_radius: float, min_h: float,
		max_h: float, max_tilt: float = 0.6) -> MeshKit:
	var kit := MeshKit.new()
	for c in count:
		var h := max_h if c == 0 else rng.randf_range(min_h, max_h * 0.8)
		var r := h * rng.randf_range(0.13, 0.19)
		var off := Vector3.ZERO
		var basis := Basis(Vector3.UP, rng.randf() * TAU)
		if c > 0:
			var ang := rng.randf() * TAU
			off = Vector3(cos(ang), 0.0, sin(ang)) * base_radius * rng.randf_range(0.3, 1.0)
			var axis := Vector3(-sin(ang), 0.0, cos(ang))
			basis = Basis(axis, rng.randf_range(0.25, max_tilt)) * basis
		prism(kit, Transform3D(basis, off), r, h)
	return kit


## Large floating Echo Crystal (elongated bipyramid).
static func echo_core(radius: float, height: float, sides: int = 8) -> MeshKit:
	var tmp := MeshKit.new()
	var low := []
	var high := []
	for s in sides:
		var ang := TAU * float(s) / float(sides)
		var dir := Vector3(cos(ang), 0.0, sin(ang))
		low.append(tmp.add_vertex(dir * radius + Vector3(0.0, -height * 0.12, 0.0), dir, Color.WHITE, Vector2(0.0, 0.4)))
		high.append(tmp.add_vertex(dir * radius * 0.86 + Vector3(0.0, height * 0.14, 0.0), dir, Color.WHITE, Vector2(0.0, 0.62)))
	var top := tmp.add_vertex(Vector3(0.0, height * 0.55, 0.0), Vector3.UP, Color.WHITE, Vector2(0.0, 1.0))
	var bottom := tmp.add_vertex(Vector3(0.0, -height * 0.45, 0.0), Vector3.DOWN, Color.WHITE, Vector2(0.0, 0.0))
	for s in sides:
		var s1 := (s + 1) % sides
		var mid := Vector3(cos(TAU * (s + 0.5) / sides), 0.0, sin(TAU * (s + 0.5) / sides))
		tmp.add_quad_facing(low[s], low[s1], high[s1], high[s], mid)
		tmp.add_tri_facing(high[s], high[s1], top, mid + Vector3.UP)
		tmp.add_tri_facing(low[s], low[s1], bottom, mid + Vector3.DOWN)
	tmp.facetize(0.0)
	return tmp
