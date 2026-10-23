@tool
class_name MeshKit
extends RefCounted
## Accumulates vertices and triangles for procedural meshes.
## Godot treats clockwise triangles as front faces; helpers here fix winding automatically
## where an outward direction is known. Vertex color alpha is used by shaders as a
## per-vertex parameter (wind sway weight or material id, depending on the shader).

var verts := PackedVector3Array()
var normals := PackedVector3Array()
var colors := PackedColorArray()
var uvs := PackedVector2Array()
var indices := PackedInt32Array()

static var _ico_cache := {}


func vertex_count() -> int:
	return verts.size()


func is_empty() -> bool:
	return indices.is_empty()


func add_vertex(p: Vector3, n: Vector3 = Vector3.UP, c: Color = Color.WHITE, uv: Vector2 = Vector2.ZERO) -> int:
	verts.push_back(p)
	normals.push_back(n)
	colors.push_back(c)
	uvs.push_back(uv)
	return verts.size() - 1


func add_tri(a: int, b: int, c: int) -> void:
	indices.push_back(a)
	indices.push_back(b)
	indices.push_back(c)


## Adds a triangle, swapping winding if needed so its front face points along `outward`.
func add_tri_facing(a: int, b: int, c: int, outward: Vector3) -> void:
	var fn := (verts[c] - verts[a]).cross(verts[b] - verts[a])
	if fn.dot(outward) < 0.0:
		add_tri(a, c, b)
	else:
		add_tri(a, b, c)


## Quad a-b-c-d given in order around its edge.
func add_quad_facing(a: int, b: int, c: int, d: int, outward: Vector3) -> void:
	add_tri_facing(a, b, c, outward)
	add_tri_facing(a, c, d, outward)


## Front-facing (Godot convention) normal of a triangle.
static func face_normal(a: Vector3, b: Vector3, c: Vector3) -> Vector3:
	return (c - a).cross(b - a)


func compute_smooth_normals() -> void:
	var acc := PackedVector3Array()
	acc.resize(verts.size())
	acc.fill(Vector3.ZERO)
	for i in range(0, indices.size(), 3):
		var ia := indices[i]
		var ib := indices[i + 1]
		var ic := indices[i + 2]
		var fn := face_normal(verts[ia], verts[ib], verts[ic])
		acc[ia] += fn
		acc[ib] += fn
		acc[ic] += fn
	for i in verts.size():
		var n := acc[i]
		normals[i] = n.normalized() if n.length_squared() > 1e-12 else Vector3.UP


## Splits shared vertices so every triangle has its own; normal = mix(face, smooth, smooth_blend).
## Gives crisp stylized facets that still read slightly rounded under toon lighting.
func facetize(smooth_blend: float = 0.25) -> void:
	compute_smooth_normals()
	var nv := PackedVector3Array()
	var nn := PackedVector3Array()
	var nc := PackedColorArray()
	var nu := PackedVector2Array()
	var ni := PackedInt32Array()
	nv.resize(indices.size())
	nn.resize(indices.size())
	nc.resize(indices.size())
	nu.resize(indices.size())
	ni.resize(indices.size())
	for i in range(0, indices.size(), 3):
		var ia := indices[i]
		var ib := indices[i + 1]
		var ic := indices[i + 2]
		var fn := face_normal(verts[ia], verts[ib], verts[ic]).normalized()
		for k in 3:
			var src := indices[i + k]
			nv[i + k] = verts[src]
			nn[i + k] = fn.lerp(normals[src], smooth_blend).normalized()
			nc[i + k] = colors[src]
			nu[i + k] = uvs[src]
			ni[i + k] = i + k
	verts = nv
	normals = nn
	colors = nc
	uvs = nu
	indices = ni


func append(other: MeshKit, xform: Transform3D = Transform3D.IDENTITY) -> void:
	var base := verts.size()
	var nbasis := xform.basis.inverse().transposed()
	for i in other.verts.size():
		verts.push_back(xform * other.verts[i])
		normals.push_back((nbasis * other.normals[i]).normalized())
		colors.push_back(other.colors[i])
		uvs.push_back(other.uvs[i])
	for idx in other.indices:
		indices.push_back(idx + base)


func set_all_colors(c: Color) -> void:
	for i in colors.size():
		colors[i] = c


func to_arrays() -> Array:
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = normals
	arr[Mesh.ARRAY_COLOR] = colors
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_INDEX] = indices
	return arr


## Adds this kit as a new surface of `mesh` (created when null). Returns the mesh.
func commit(mesh: ArrayMesh = null, material: Material = null) -> ArrayMesh:
	if mesh == null:
		mesh = ArrayMesh.new()
	if indices.is_empty():
		return mesh
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, to_arrays())
	if material:
		mesh.surface_set_material(mesh.get_surface_count() - 1, material)
	return mesh


## Triangle soup of all faces, for collision shapes.
func collision_faces(xform: Transform3D = Transform3D.IDENTITY) -> PackedVector3Array:
	var out := PackedVector3Array()
	out.resize(indices.size())
	for i in indices.size():
		out[i] = xform * verts[indices[i]]
	return out


# --- Primitive builders -------------------------------------------------------

## Unit icosphere: [PackedVector3Array positions, PackedInt32Array triangles (outward, clockwise)].
static func icosphere(subdiv: int) -> Array:
	if _ico_cache.has(subdiv):
		return _ico_cache[subdiv]
	var t := (1.0 + sqrt(5.0)) * 0.5
	var pts: Array[Vector3] = [
		Vector3(-1, t, 0), Vector3(1, t, 0), Vector3(-1, -t, 0), Vector3(1, -t, 0),
		Vector3(0, -1, t), Vector3(0, 1, t), Vector3(0, -1, -t), Vector3(0, 1, -t),
		Vector3(t, 0, -1), Vector3(t, 0, 1), Vector3(-t, 0, -1), Vector3(-t, 0, 1),
	]
	for i in pts.size():
		pts[i] = pts[i].normalized()
	var faces: Array[Vector3i] = [
		Vector3i(0, 11, 5), Vector3i(0, 5, 1), Vector3i(0, 1, 7), Vector3i(0, 7, 10), Vector3i(0, 10, 11),
		Vector3i(1, 5, 9), Vector3i(5, 11, 4), Vector3i(11, 10, 2), Vector3i(10, 7, 6), Vector3i(7, 1, 8),
		Vector3i(3, 9, 4), Vector3i(3, 4, 2), Vector3i(3, 2, 6), Vector3i(3, 6, 8), Vector3i(3, 8, 9),
		Vector3i(4, 9, 5), Vector3i(2, 4, 11), Vector3i(6, 2, 10), Vector3i(8, 6, 7), Vector3i(9, 8, 1),
	]
	for _s in subdiv:
		var mid := {}
		var nf: Array[Vector3i] = []
		for f in faces:
			var a := _ico_mid(pts, mid, f.x, f.y)
			var b := _ico_mid(pts, mid, f.y, f.z)
			var c := _ico_mid(pts, mid, f.z, f.x)
			nf.append(Vector3i(f.x, a, c))
			nf.append(Vector3i(f.y, b, a))
			nf.append(Vector3i(f.z, c, b))
			nf.append(Vector3i(a, b, c))
		faces = nf
	var pv := PackedVector3Array(pts)
	var tri := PackedInt32Array()
	for f in faces:
		var fn := face_normal(pv[f.x], pv[f.y], pv[f.z])
		var flip := fn.dot(pv[f.x] + pv[f.y] + pv[f.z]) < 0.0
		tri.push_back(f.x)
		tri.push_back(f.z if flip else f.y)
		tri.push_back(f.y if flip else f.z)
	var res := [pv, tri]
	_ico_cache[subdiv] = res
	return res


static func _ico_mid(pts: Array[Vector3], cache: Dictionary, a: int, b: int) -> int:
	var key := mini(a, b) * 100000 + maxi(a, b)
	if cache.has(key):
		return cache[key]
	pts.append(((pts[a] + pts[b]) * 0.5).normalized())
	cache[key] = pts.size() - 1
	return pts.size() - 1


## Noise-displaced sphere blob. `normal_center` lets canopies/clouds use soft "spherified" normals.
func add_blob(center: Vector3, radius: Vector3, subdiv: int, color: Color, noise: FastNoiseLite = null,
		noise_amp: float = 0.0, normal_center: Vector3 = Vector3.INF, normal_blend: float = 0.0,
		shade_bottom: float = 0.0, flatten_below: float = -INF) -> void:
	var ico := icosphere(subdiv)
	var pv: PackedVector3Array = ico[0]
	var tri: PackedInt32Array = ico[1]
	var base := verts.size()
	for d in pv:
		var k := 1.0
		if noise:
			k += noise_amp * noise.get_noise_3dv(center * 0.13 + d * 1.7)
		var p := center + d * radius * k
		if p.y < flatten_below:
			p.y = flatten_below
		var n := d
		if normal_center != Vector3.INF and normal_blend > 0.0:
			n = d.lerp((p - normal_center).normalized(), normal_blend).normalized()
		var c := color
		if shade_bottom > 0.0:
			c = color.darkened(shade_bottom * clampf(-d.y * 0.5 + 0.5, 0.0, 1.0))
			c.a = color.a
		add_vertex(p, n, c, Vector2(d.x * 0.5 + 0.5, d.y * 0.5 + 0.5))
	for i in tri:
		indices.push_back(base + i)


## Rounded (beveled) box with analytic smooth bevel normals.
func add_rounded_box(xform: Transform3D, size: Vector3, bevel: float, color: Color,
		jitter: float = 0.0, rng: RandomNumberGenerator = null) -> void:
	var h := size * 0.5
	bevel = minf(bevel, minf(h.x, minf(h.y, h.z)) * 0.95)
	var inner := h - Vector3.ONE * bevel
	var nbasis := xform.basis.inverse().transposed()
	# Each face is a 4x4 grid whose middle lines sit at the bevel boundary.
	for axis in 3:
		for sgn in [-1.0, 1.0]:
			var u_axis := (axis + 1) % 3
			var v_axis := (axis + 2) % 3
			var coords_u := [-h[u_axis], -inner[u_axis], inner[u_axis], h[u_axis]]
			var coords_v := [-h[v_axis], -inner[v_axis], inner[v_axis], h[v_axis]]
			var grid := []
			for iu in 4:
				var row := []
				for iv in 4:
					var p := Vector3.ZERO
					p[axis] = sgn * h[axis]
					p[u_axis] = coords_u[iu]
					p[v_axis] = coords_v[iv]
					var core := p.clamp(-inner, inner)
					var dir := p - core
					var n := dir.normalized() if dir.length_squared() > 1e-10 else Vector3.ZERO
					if n == Vector3.ZERO:
						n[axis] = sgn
					var q := core + n * bevel
					if jitter > 0.0 and rng:
						q += Vector3(rng.randf_range(-1, 1), rng.randf_range(-1, 1), rng.randf_range(-1, 1)) * jitter
					row.append(add_vertex(xform * q, (nbasis * n).normalized(), color,
							Vector2(float(iu) / 3.0, float(iv) / 3.0)))
				grid.append(row)
			var outward := Vector3.ZERO
			outward[axis] = sgn
			outward = nbasis * outward
			for iu in 3:
				for iv in 3:
					add_quad_facing(grid[iu][iv], grid[iu + 1][iv], grid[iu + 1][iv + 1], grid[iu][iv + 1], outward)


## Tube along a polyline using parallel-transport frames. Colors/sway interpolate along length.
func add_tube(points: PackedVector3Array, radii: PackedFloat32Array, sides: int, color_start: Color,
		color_end: Color, close_end: bool = true, noise: FastNoiseLite = null, noise_amp: float = 0.0) -> void:
	var count := points.size()
	if count < 2:
		return
	var tangents := PackedVector3Array()
	tangents.resize(count)
	for i in count:
		var a := points[maxi(i - 1, 0)]
		var b := points[mini(i + 1, count - 1)]
		tangents[i] = (b - a).normalized()
	var ref := Vector3.UP if absf(tangents[0].y) < 0.9 else Vector3.RIGHT
	var nrm := (ref - tangents[0] * ref.dot(tangents[0])).normalized()
	var length_acc := 0.0
	var rings := []
	for i in count:
		var t := tangents[i]
		nrm = (nrm - t * nrm.dot(t)).normalized()
		var bin := t.cross(nrm)
		if i > 0:
			length_acc += points[i].distance_to(points[i - 1])
		var f := float(i) / float(count - 1)
		var col := color_start.lerp(color_end, f)
		var ring := []
		for s in sides + 1:
			var ang := TAU * float(s) / float(sides)
			var dir := nrm * cos(ang) + bin * sin(ang)
			var r := radii[i]
			if noise:
				r *= 1.0 + noise_amp * noise.get_noise_3dv(points[i] * 0.7 + dir * 1.3)
			ring.append(add_vertex(points[i] + dir * r, dir, col, Vector2(float(s) / float(sides), length_acc)))
		rings.append(ring)
	for i in count - 1:
		for s in sides:
			var a: int = rings[i][s]
			var b: int = rings[i][s + 1]
			var c: int = rings[i + 1][s + 1]
			var d: int = rings[i + 1][s]
			var out := (verts[a] + verts[c]) * 0.5 - (points[i] + points[i + 1]) * 0.5
			add_quad_facing(a, b, c, d, out)
	if close_end:
		var tip_idx := add_vertex(points[count - 1] + tangents[count - 1] * radii[count - 1] * 0.5,
				tangents[count - 1], color_end, Vector2(0.5, length_acc))
		for s in sides:
			add_tri_facing(rings[count - 1][s], rings[count - 1][s + 1], tip_idx, tangents[count - 1])


## Vertical cylinder/frustum (optionally fluted, optionally with a jagged broken top).
func add_cylinder(xform: Transform3D, r_bottom: float, r_top: float, height: float, sides: int,
		color: Color, cap_bottom: bool = true, cap_top: bool = true, flute: float = 0.0,
		jag: float = 0.0, rng: RandomNumberGenerator = null) -> void:
	var tmp := MeshKit.new()
	var bottom := []
	var top := []
	for s in sides:
		var ang := TAU * float(s) / float(sides)
		var k := 1.0 - flute * float(s % 2)
		var dir := Vector3(cos(ang), 0.0, sin(ang))
		var ty := height
		if jag > 0.0 and rng:
			ty -= rng.randf() * jag
		bottom.append(tmp.add_vertex(dir * r_bottom * k, dir, color, Vector2(float(s) / sides, 0.0)))
		top.append(tmp.add_vertex(dir * r_top * k + Vector3(0, ty, 0), dir, color, Vector2(float(s) / sides, 1.0)))
	for s in sides:
		var s1 := (s + 1) % sides
		var mid_dir := Vector3(cos(TAU * (s + 0.5) / sides), 0.0, sin(TAU * (s + 0.5) / sides))
		tmp.add_quad_facing(bottom[s], bottom[s1], top[s1], top[s], mid_dir)
	tmp.compute_smooth_normals()
	if cap_top:
		var center_top := Vector3(0, height - jag * 0.5, 0)
		var ci := tmp.add_vertex(center_top, Vector3.UP, color, Vector2(0.5, 0.5))
		var ring := []
		for s in sides:
			ring.append(tmp.add_vertex(tmp.verts[top[s]], Vector3.UP, color))
		for s in sides:
			tmp.add_tri_facing(ci, ring[s], ring[(s + 1) % sides], Vector3.UP)
	if cap_bottom:
		var cb := tmp.add_vertex(Vector3.ZERO, Vector3.DOWN, color, Vector2(0.5, 0.5))
		var ringb := []
		for s in sides:
			ringb.append(tmp.add_vertex(tmp.verts[bottom[s]], Vector3.DOWN, color))
		for s in sides:
			tmp.add_tri_facing(cb, ringb[s], ringb[(s + 1) % sides], Vector3.DOWN)
	append(tmp, xform)


## Torus lying in the local XZ plane. UV.x runs around the ring (used by rune shaders).
func add_torus(xform: Transform3D, ring_radius: float, tube_radius: float, ring_segments: int,
		tube_segments: int, color: Color, arc: float = TAU) -> void:
	var tmp := MeshKit.new()
	var grid := []
	for i in ring_segments + 1:
		var a := arc * float(i) / float(ring_segments)
		var center := Vector3(cos(a), 0.0, sin(a)) * ring_radius
		var radial := Vector3(cos(a), 0.0, sin(a))
		var row := []
		for j in tube_segments + 1:
			var b := TAU * float(j) / float(tube_segments)
			var n := radial * cos(b) + Vector3.UP * sin(b)
			row.append(tmp.add_vertex(center + n * tube_radius, n, color,
					Vector2(float(i) / float(ring_segments), float(j) / float(tube_segments))))
		grid.append(row)
	for i in ring_segments:
		for j in tube_segments:
			var a: int = grid[i][j]
			var b: int = grid[i + 1][j]
			var c: int = grid[i + 1][j + 1]
			var d: int = grid[i][j + 1]
			tmp.add_quad_facing(a, b, c, d, tmp.normals[a] + tmp.normals[c])
	append(tmp, xform)


## Flat annulus in the local XZ plane (UV.x around, UV.y across) for rune rings.
func add_ring(xform: Transform3D, r_inner: float, r_outer: float, segments: int, color: Color) -> void:
	var base := verts.size()
	var nbasis := xform.basis.inverse().transposed()
	var n := (nbasis * Vector3.UP).normalized()
	for i in segments + 1:
		var a := TAU * float(i) / float(segments)
		var d := Vector3(cos(a), 0.0, sin(a))
		var u := float(i) / float(segments)
		add_vertex(xform * (d * r_inner), n, color, Vector2(u, 0.0))
		add_vertex(xform * (d * r_outer), n, color, Vector2(u, 1.0))
	for i in segments:
		var a := base + i * 2
		add_quad_facing(a, a + 2, a + 3, a + 1, n)
