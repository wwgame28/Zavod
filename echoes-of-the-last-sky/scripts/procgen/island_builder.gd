@tool
class_name IslandBuilder
extends RefCounted
## Turns an IslandShape into one terrain mesh: polar top surface, grassy overhanging lip,
## layered cliff wall and a tapering underside. Also returns collision faces for the walkable part.
## Vertex color: r = path mask, g = meadow mask, b = cliff/underside factor.

const WALL_T_MAX := 0.93


## Returns {kit: MeshKit, collision: PackedVector3Array, rim: PackedVector2Array,
## rim_h: PackedFloat32Array, thetas: PackedFloat32Array}
static func build(shape: IslandShape, angular: int, radial: int, wall_rings: int,
		with_collision: bool = false, collision_wall_rings: int = 3) -> Dictionary:
	var kit := MeshKit.new()
	var thetas := PackedFloat32Array()
	var rim := PackedVector2Array()
	for i in angular:
		var th := TAU * float(i) / float(angular)
		thetas.push_back(th)
		rim.push_back(shape.coast_point(th))

	var center := kit.add_vertex(Vector3(0.0, shape.height(0.0, 0.0), 0.0), Vector3.UP, _top_color(shape, 0.0, 0.0))
	var rings := []
	for j in range(1, radial + 1):
		var r := pow(float(j) / float(radial), 0.8)
		var ring := PackedInt32Array()
		for i in angular:
			var p := rim[i] * r
			ring.push_back(kit.add_vertex(Vector3(p.x, shape.height(p.x, p.y), p.y), Vector3.UP,
					_top_color(shape, p.x, p.y), p))
		rings.append(ring)

	var first: PackedInt32Array = rings[0]
	for i in angular:
		kit.add_tri(center, first[i], first[(i + 1) % angular])
	for j in rings.size() - 1:
		_stitch(kit, rings[j], rings[j + 1], angular)

	var rim_ring: PackedInt32Array = rings[rings.size() - 1]
	var rim_h := PackedFloat32Array()
	for i in angular:
		rim_h.push_back(kit.verts[rim_ring[i]].y)

	# Grass lip that overhangs the cliff slightly, then the layered wall and underside.
	var lip := PackedInt32Array()
	var under_lip := PackedInt32Array()
	for i in angular:
		var p := rim[i] * 1.014
		lip.push_back(kit.add_vertex(Vector3(p.x, rim_h[i] - 0.4, p.y), Vector3.UP, Color(0, 0, 0, 1)))
	for i in angular:
		var p := rim[i] * 1.006
		under_lip.push_back(kit.add_vertex(Vector3(p.x, rim_h[i] - 1.1, p.y), Vector3.UP, Color(0, 0, 0.55, 1)))
	_stitch(kit, rim_ring, lip, angular)
	_stitch(kit, lip, under_lip, angular)
	var prev := under_lip
	var collision_index_count := 0
	for k in range(1, wall_rings + 1):
		var t := float(k) / float(wall_rings) * WALL_T_MAX
		var ring := PackedInt32Array()
		for i in angular:
			var wp := shape.wall_point(thetas[i], t, rim[i], rim_h[i])
			ring.push_back(kit.add_vertex(wp, Vector3.UP, Color(0, 0, 1, 1), Vector2(thetas[i] * shape.radius, wp.y)))
		_stitch(kit, prev, ring, angular)
		prev = ring
		if k == collision_wall_rings:
			collision_index_count = kit.indices.size()
	var tip := kit.add_vertex(Vector3(0.0, -shape.tip_depth(), 0.0), Vector3.DOWN, Color(0, 0, 1, 1))
	for i in angular:
		kit.add_tri(prev[i], tip, prev[(i + 1) % angular])
	kit.compute_smooth_normals()

	var collision := PackedVector3Array()
	if with_collision:
		collision.resize(collision_index_count)
		for n in collision_index_count:
			collision[n] = kit.verts[kit.indices[n]]
	return {"kit": kit, "collision": collision, "rim": rim, "rim_h": rim_h, "thetas": thetas}


## Connects ring `a` to the next ring `b` (outward on top, downward on the wall), clockwise fronts.
static func _stitch(kit: MeshKit, a: PackedInt32Array, b: PackedInt32Array, n: int) -> void:
	for i in n:
		var i1 := (i + 1) % n
		kit.add_tri(a[i], b[i1], a[i1])
		kit.add_tri(a[i], b[i], b[i1])


static func _top_color(shape: IslandShape, x: float, z: float) -> Color:
	return Color(shape.path_mask(x, z), shape.meadow_mask(x, z), 0.0, 1.0)


## Position and outward normal on the cliff wall / underside, for attaching props.
static func wall_frame(shape: IslandShape, theta: float, t: float) -> Array:
	var rim := shape.coast_point(theta)
	var rim_h := shape.height(rim.x * 0.999, rim.y * 0.999)
	var p := shape.wall_point(theta, t, rim, rim_h)
	var e := 0.01
	var rim2 := shape.coast_point(theta + e)
	var p_th := shape.wall_point(theta + e, t, rim2, rim_h)
	var p_t := shape.wall_point(theta, minf(t + e, 1.0), rim, rim_h)
	var n := (p_th - p).cross(p_t - p).normalized()
	var outward := Vector3(p.x, 0.0, p.z).normalized() + Vector3.DOWN * t
	if n.dot(outward) < 0.0:
		n = -n
	return [p, n]
