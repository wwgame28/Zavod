@tool
class_name SkinnedKit
extends MeshKit
## MeshKit with skin weights (4 bones per vertex) and a second UV channel whose x holds the
## material part id read by the character shader. Generic MeshKit helpers use `cur_*` values.

var bones := PackedInt32Array()
var weights := PackedFloat32Array()
var uv2s := PackedVector2Array()

var cur_bones := PackedInt32Array([0, 0, 0, 0])
var cur_weights := PackedFloat32Array([1.0, 0.0, 0.0, 0.0])
const EXTRA_CONSTANT := 0
const EXTRA_HEIGHT := 1   ## UV2.y = rest-pose height of each vertex (used by clothing patterns).

var cur_part := 0
var cur_extra := 0.0
var extra_mode := EXTRA_CONSTANT


func add_vertex(p: Vector3, n: Vector3 = Vector3.UP, c: Color = Color.WHITE, uv: Vector2 = Vector2.ZERO) -> int:
	bones.append_array(cur_bones)
	weights.append_array(cur_weights)
	uv2s.push_back(Vector2(float(cur_part), p.y if extra_mode == EXTRA_HEIGHT else cur_extra))
	return super(p, n, c, uv)


## Sets the skin for following vertices from [[bone, weight], ...] (normalized, best 4 kept).
func set_skin(entries: Array) -> void:
	var packed := skin_of(entries)
	cur_bones = packed[0]
	cur_weights = packed[1]


static func skin_of(entries: Array) -> Array:
	var merged := {}
	for e in entries:
		if float(e[1]) > 0.0001:
			merged[e[0]] = float(merged.get(e[0], 0.0)) + float(e[1])
	var list := []
	for b in merged:
		list.append([b, merged[b]])
	list.sort_custom(func(a, b): return a[1] > b[1])
	var bi := PackedInt32Array([0, 0, 0, 0])
	var bw := PackedFloat32Array([0.0, 0.0, 0.0, 0.0])
	var total := 0.0
	for i in mini(4, list.size()):
		total += list[i][1]
	if total <= 0.0:
		bw[0] = 1.0
		return [bi, bw]
	for i in mini(4, list.size()):
		bi[i] = list[i][0]
		bw[i] = list[i][1] / total
	return [bi, bw]


func append(other: MeshKit, xform: Transform3D = Transform3D.IDENTITY) -> void:
	var count := other.verts.size()
	super(other, xform)
	var sk := other as SkinnedKit
	for i in count:
		if sk:
			for k in 4:
				bones.push_back(sk.bones[i * 4 + k])
				weights.push_back(sk.weights[i * 4 + k])
			uv2s.push_back(sk.uv2s[i])
		else:
			bones.append_array(cur_bones)
			weights.append_array(cur_weights)
			var y := (xform * other.verts[i]).y
			uv2s.push_back(Vector2(float(cur_part), y if extra_mode == EXTRA_HEIGHT else cur_extra))


func to_arrays() -> Array:
	var arr := super()
	arr[Mesh.ARRAY_BONES] = bones
	arr[Mesh.ARRAY_WEIGHTS] = weights
	arr[Mesh.ARRAY_TEX_UV2] = uv2s
	return arr


## Bends every normal added since `from_index` toward the direction from `center` (soft shading).
func soften_normals(from_index: int, center: Vector3, amount: float) -> void:
	for i in range(from_index, verts.size()):
		normals[i] = normals[i].lerp((verts[i] - center).normalized(), amount).normalized()


## Lofted surface through superellipse rings. Each ring: {c, x, z, n, v} where x/z are the
## half-axis vectors (length = radius). The angle a runs from +z toward +x; a0..a1 may cover
## only part of the ring for open sheets. UV = (a / TAU, ring v). `skin_fn(p) -> [[bone, w], ...]`.
func loft(rings: Array, sides: int, part: int, skin_fn: Callable, cap_start: bool = false,
		cap_end: bool = false, a0: float = -PI, a1: float = PI, flip: bool = false) -> void:
	var tmp := SkinnedKit.new()
	tmp.cur_part = part
	tmp.cur_extra = cur_extra
	tmp.extra_mode = extra_mode
	var closed := is_equal_approx(a1 - a0, TAU)
	var grid := []
	for ring in rings:
		var row := []
		var c: Vector3 = ring["c"]
		var x: Vector3 = ring["x"]
		var z: Vector3 = ring["z"]
		var k := 2.0 / float(ring.get("n", 2.0))
		for s in sides + 1:
			var a := lerpf(a0, a1, float(s) / float(sides))
			var sa := sin(a)
			var ca := cos(a)
			var p := c + x * (signf(sa) * pow(absf(sa), k)) + z * (signf(ca) * pow(absf(ca), k))
			tmp.set_skin(skin_fn.call(p))
			row.append(tmp.add_vertex(p, (p - c).normalized(), Color.WHITE, Vector2(a / TAU, float(ring.get("v", 0.0)))))
		grid.append(row)
	for r in grid.size() - 1:
		var center := (Vector3(rings[r]["c"]) + Vector3(rings[r + 1]["c"])) * 0.5
		for s in sides:
			var a: int = grid[r][s]
			var b: int = grid[r][s + 1]
			var c2: int = grid[r + 1][s + 1]
			var d: int = grid[r + 1][s]
			var out := (tmp.verts[a] + tmp.verts[c2]) * 0.5 - center
			tmp.add_quad_facing(a, b, c2, d, -out if flip else out)
	tmp.compute_smooth_normals()
	if closed:
		for row in grid:
			var na := (tmp.normals[row[0]] + tmp.normals[row[sides]]).normalized()
			tmp.normals[row[0]] = na
			tmp.normals[row[sides]] = na
	if cap_start:
		_cap(tmp, grid[0], rings[0], rings[1], skin_fn, sides)
	if cap_end:
		_cap(tmp, grid[grid.size() - 1], rings[rings.size() - 1], rings[rings.size() - 2], skin_fn, sides)
	append(tmp)


static func _cap(kit: SkinnedKit, row: Array, ring: Dictionary, neighbour: Dictionary, skin_fn: Callable, sides: int) -> void:
	var c: Vector3 = ring["c"]
	var out := (c - Vector3(neighbour["c"])).normalized()
	kit.set_skin(skin_fn.call(c))
	var ci := kit.add_vertex(c + out * 0.002, out, Color.WHITE, Vector2(0.0, float(ring.get("v", 0.0))))
	for s in sides:
		var p0 := kit.verts[row[s]]
		var p1 := kit.verts[row[s + 1]]
		kit.set_skin(skin_fn.call(p0))
		var i0 := kit.add_vertex(p0, out, Color.WHITE, kit.uvs[row[s]])
		kit.set_skin(skin_fn.call(p1))
		var i1 := kit.add_vertex(p1, out, Color.WHITE, kit.uvs[row[s + 1]])
		kit.add_tri_facing(ci, i0, i1, out)


## Thin cloth shell: outer loft, inner loft (radii shrunk by `thickness`) and an edge strip
## along the last ring (hem). Open sides are closed with strips when the angle range is partial.
func shell(rings: Array, sides: int, part_out: int, part_in: int, skin_fn: Callable, thickness: float,
		a0: float = -PI, a1: float = PI) -> void:
	loft(rings, sides, part_out, skin_fn, false, false, a0, a1)
	var inner := []
	for ring in rings:
		var r: Dictionary = ring.duplicate()
		var x: Vector3 = ring["x"]
		var z: Vector3 = ring["z"]
		r["x"] = x.normalized() * maxf(x.length() - thickness, 0.001)
		r["z"] = z.normalized() * maxf(z.length() - thickness, 0.001)
		inner.append(r)
	loft(inner, sides, part_in, skin_fn, false, false, a0, a1, true)
	# Hem strip between the outer and inner last rings, and side strips for open sheets.
	_strip_between(rings, inner, rings.size() - 1, sides, part_out, skin_fn, a0, a1)
	if not is_equal_approx(a1 - a0, TAU):
		cur_part = part_out
		for edge in [a0, a1]:
			var sgn := -1.0 if edge == a0 else 1.0
			for i in rings.size() - 1:
				var q := [_ring_point(rings[i], edge), _ring_point(rings[i + 1], edge),
						_ring_point(inner[i + 1], edge), _ring_point(inner[i], edge)]
				var out := (_ring_point(rings[i], edge + 0.01) - _ring_point(rings[i], edge - 0.01)).normalized() * sgn
				var ids := []
				for p in q:
					set_skin(skin_fn.call(p))
					ids.append(add_vertex(p, out, Color.WHITE, Vector2(edge / TAU, float(rings[i].get("v", 0.0)))))
				add_quad_facing(ids[0], ids[1], ids[2], ids[3], out)


static func _ring_point(ring: Dictionary, a: float) -> Vector3:
	var k := 2.0 / float(ring.get("n", 2.0))
	var sa := sin(a)
	var ca := cos(a)
	return Vector3(ring["c"]) + Vector3(ring["x"]) * (signf(sa) * pow(absf(sa), k)) + Vector3(ring["z"]) * (signf(ca) * pow(absf(ca), k))


func _strip_between(outer: Array, inner: Array, index: int, sides: int, part: int, skin_fn: Callable, a0: float, a1: float) -> void:
	cur_part = part
	var o: Dictionary = outer[index]
	var n: Dictionary = inner[index]
	var down := (Vector3(o["c"]) - Vector3(outer[index - 1]["c"])).normalized()
	for s in sides:
		var aa := lerpf(a0, a1, float(s) / float(sides))
		var ab := lerpf(a0, a1, float(s + 1) / float(sides))
		var q := [_ring_point(o, aa), _ring_point(o, ab), _ring_point(n, ab), _ring_point(n, aa)]
		var ids := []
		for p in q:
			set_skin(skin_fn.call(p))
			ids.append(add_vertex(p, down, Color.WHITE, Vector2(aa / TAU, float(o.get("v", 1.0)))))
		add_quad_facing(ids[0], ids[1], ids[2], ids[3], down)
