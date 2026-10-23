@tool
class_name HeroBuilder
extends RefCounted
## Procedural model of the hero (sky wanderer): one skinned mesh with four surfaces
## (outfit/body, face, hair, crystal pendant) bound to the HeroRig skeleton.
## Clothing patterns are painted by the character shader from part ids + UVs, so seams stay crisp.

enum Part {
	SKIN, COAT, SKIRT, LINING_BLUE, SLEEVE, SHORTS, BOOT, GLOVE, LEATHER, GOLD, CAPELET, COLLAR,
	LINING_IVORY, TIGHTS,
}


const H := HeroRig.HEAD_CENTER
const HEAD_RADII := Vector3(0.083, 0.105, 0.095)
const CHARACTER_MAT := preload("res://materials/character/hero_body.tres")
const FACE_MAT := preload("res://materials/character/hero_face.tres")
const HAIR_MAT := preload("res://materials/character/hero_hair.tres")
const GEM_MAT := preload("res://materials/crystal.tres")

var body := SkinnedKit.new()
var face := SkinnedKit.new()
var hair := SkinnedKit.new()
var gem := SkinnedKit.new()
var rng := RandomNumberGenerator.new()


## Returns {"skeleton": Skeleton3D, "mesh": ArrayMesh}.
static func build(seed_value: int = 7) -> Dictionary:
	var b := HeroBuilder.new()
	b.rng.seed = seed_value
	b.body.extra_mode = SkinnedKit.EXTRA_HEIGHT
	b._torso()
	b._skirt()
	b._belt()
	b._collar_and_pendant()
	for side in [1.0, -1.0]:
		b._arm(side)
		b._hand(side)
		b._leg(side)
		b._boot(side)
	b._capelet()
	b._head()
	b._hair()
	var mesh := ArrayMesh.new()
	b.body.commit(mesh, CHARACTER_MAT)
	b.face.commit(mesh, FACE_MAT)
	b.hair.commit(mesh, HAIR_MAT)
	b.gem.commit(mesh, GEM_MAT)
	return {"skeleton": HeroRig.build_skeleton(), "mesh": mesh}


# --- Skin weight helpers ----------------------------------------------------------------------

## Blends along a chain: `joints[i]` is where `bones[i + 1]` takes over from `bones[i]`.
static func _chain(t: float, joints: Array, bones: Array, blend: float) -> Array:
	for j in joints.size():
		var jt: float = joints[j]
		if absf(t - jt) < blend:
			var w := smoothstep(-blend, blend, t - jt)
			return [[bones[j], 1.0 - w], [bones[j + 1], w]]
	var idx := 0
	for j in joints.size():
		if t > float(joints[j]):
			idx = j + 1
	return [[bones[idx], 1.0]]


static func _skin_torso(p: Vector3) -> Array:
	var e := _chain(p.y, [0.975, 1.1, 1.22, 1.385], [HeroRig.HIPS, HeroRig.SPINE, HeroRig.CHEST, HeroRig.UPPER_CHEST, HeroRig.NECK], 0.045)
	var side_bone := HeroRig.L_SHOULDER if p.x > 0.0 else HeroRig.R_SHOULDER
	var sh := smoothstep(0.09, 0.16, absf(p.x)) * smoothstep(1.26, 1.34, p.y) * 0.6
	var leg_bone := HeroRig.L_UPPER_LEG if p.x > 0.0 else HeroRig.R_UPPER_LEG
	var lg := smoothstep(0.87, 0.79, p.y) * smoothstep(0.02, 0.09, absf(p.x)) * 0.55
	var out := []
	for item in e:
		out.append([item[0], float(item[1]) * (1.0 - sh - lg)])
	out.append([side_bone, sh])
	out.append([leg_bone, lg])
	return out


static func _skin_arm(p: Vector3, side: float) -> Array:
	var s := HeroRig.joint(_b(HeroRig.L_UPPER_ARM, side))
	var e := HeroRig.joint(_b(HeroRig.L_LOWER_ARM, side))
	var w := HeroRig.joint(_b(HeroRig.L_HAND, side))
	var dir := (e - s).normalized()
	var t := (p - s).dot(dir)
	var le := s.distance_to(e)
	var lw := le + e.distance_to(w)
	var res := _chain(t, [-0.005, le, lw], [_b(HeroRig.L_SHOULDER, side), _b(HeroRig.L_UPPER_ARM, side), _b(HeroRig.L_LOWER_ARM, side), _b(HeroRig.L_HAND, side)], 0.04)
	if t < 0.02:
		res.append([HeroRig.UPPER_CHEST, 0.15 * smoothstep(0.02, -0.04, t)])
	return res


static func _skin_leg(p: Vector3, side: float) -> Array:
	return _chain(-p.y, [-0.9, -0.47, -0.075], [HeroRig.HIPS, _b(HeroRig.L_UPPER_LEG, side), _b(HeroRig.L_LOWER_LEG, side), _b(HeroRig.L_FOOT, side)], 0.05)


## Left-side bone, mirrored when building the right side.
static func _b(bone: int, side: float) -> int:
	return bone if side > 0.0 else HeroRig.mirror(bone)


static func _ring(c: Vector3, x: Vector3, z: Vector3, n: float = 2.0, v: float = 0.0) -> Dictionary:
	return {"c": c, "x": x, "z": z, "n": n, "v": v}


static func _hring(y: float, rx: float, rz: float, zo: float = 0.0, n: float = 2.0, x0: float = 0.0) -> Dictionary:
	return _ring(Vector3(x0, y, zo), Vector3(rx, 0, 0), Vector3(0, 0, rz), n, y)


# --- Body and outfit --------------------------------------------------------------------------

func _torso() -> void:
	var rows := [
		[0.785, 0.125, 0.088, 0.0, 2.2], [0.83, 0.148, 0.102, 0.0, 2.3], [0.9, 0.152, 0.104, -0.004, 2.3],
		[0.97, 0.135, 0.094, 0.0, 2.3], [1.04, 0.112, 0.082, 0.004, 2.3], [1.11, 0.12, 0.088, 0.006, 2.3],
		[1.17, 0.134, 0.097, 0.01, 2.3], [1.225, 0.141, 0.104, 0.014, 2.2], [1.28, 0.148, 0.094, 0.006, 2.4],
		[1.33, 0.158, 0.082, -0.004, 2.8], [1.362, 0.12, 0.07, -0.006, 2.6], [1.385, 0.06, 0.05, -0.006, 2.0],
	]
	var rings := []
	for r in rows:
		rings.append(_hring(r[0], r[1], r[2], r[3], r[4]))
	body.loft(rings, 28, Part.COAT, _skin_torso, true, true)
	# Neck.
	var neck := [_hring(1.36, 0.034, 0.032, -0.008), _hring(1.42, 0.031, 0.03, -0.006), _hring(1.48, 0.03, 0.029, -0.002)]
	body.loft(neck, 14, Part.SKIN, func(p: Vector3) -> Array:
		return _chain(p.y, [1.39, 1.455], [HeroRig.UPPER_CHEST, HeroRig.NECK, HeroRig.HEAD], 0.03))


func _skirt() -> void:
	var rows := [[1.0, 0.118, 0.087], [0.95, 0.152, 0.11], [0.88, 0.18, 0.13], [0.78, 0.2, 0.146], [0.67, 0.214, 0.16]]
	var rings := []
	for i in rows.size():
		var r: Array = rows[i]
		var ring := _hring(r[0], r[1], r[2], -0.004, 2.2)
		ring["v"] = float(i) / float(rows.size() - 1)
		rings.append(ring)
	var skin := func(p: Vector3) -> Array:
		var down := smoothstep(0.96, 0.68, p.y) * 0.75
		var left := smoothstep(-0.06, 0.06, p.x)
		return [[HeroRig.HIPS, 1.0 - down], [HeroRig.L_UPPER_LEG, down * left], [HeroRig.R_UPPER_LEG, down * (1.0 - left)]]
	body.shell(rings, 36, Part.SKIRT, Part.LINING_BLUE, skin, 0.007, 0.55, TAU - 0.55)


func _belt() -> void:
	var skin := func(_p: Vector3) -> Array: return [[HeroRig.HIPS, 0.6], [HeroRig.SPINE, 0.4]]
	var rings := [_hring(0.958, 0.143, 0.102, 0.0, 2.3), _hring(0.964, 0.148, 0.106, 0.0, 2.3),
			_hring(0.998, 0.135, 0.098, 0.001, 2.3), _hring(1.006, 0.128, 0.093, 0.001, 2.3)]
	body.loft(rings, 28, Part.LEATHER, skin)
	body.set_skin(skin.call(Vector3.ZERO))
	body.cur_part = Part.GOLD
	body.add_rounded_box(Transform3D(Basis(), Vector3(0.0, 0.982, 0.108)), Vector3(0.046, 0.034, 0.014), 0.005, Color.WHITE)
	body.cur_part = Part.LEATHER
	body.add_rounded_box(Transform3D(Basis(Vector3.UP, 1.05), Vector3(0.138, 0.945, 0.05)), Vector3(0.055, 0.062, 0.034), 0.01, Color.WHITE)
	body.add_rounded_box(Transform3D(Basis(Vector3.UP, -0.5), Vector3(-0.095, 0.948, -0.098)), Vector3(0.05, 0.055, 0.03), 0.01, Color.WHITE)
	body.cur_part = Part.GOLD
	body.add_rounded_box(Transform3D(Basis(Vector3.UP, 1.05), Vector3(0.152, 0.965, 0.058)), Vector3(0.014, 0.012, 0.012), 0.003, Color.WHITE)


func _collar_and_pendant() -> void:
	var skin := func(p: Vector3) -> Array: return _chain(p.y, [1.4], [HeroRig.UPPER_CHEST, HeroRig.NECK], 0.03)
	var rings := [_hring(1.36, 0.078, 0.064, -0.004), _hring(1.4, 0.066, 0.058, -0.006), _hring(1.435, 0.06, 0.054, -0.008)]
	for i in rings.size():
		rings[i]["v"] = float(i) / 2.0
	body.shell(rings, 24, Part.COLLAR, Part.LINING_IVORY, skin, 0.006, 0.7, TAU - 0.7)
	# Gold chain and the Echo Crystal pendant.
	var chest := func(_p: Vector3) -> Array: return [[HeroRig.UPPER_CHEST, 1.0]]
	body.set_skin(chest.call(Vector3.ZERO))
	body.cur_part = Part.GOLD
	for side in [1.0, -1.0]:
		var pts := PackedVector3Array([
			Vector3(0.0, 1.398, -0.056), Vector3(0.056 * side, 1.388, -0.016), Vector3(0.068 * side, 1.35, 0.06),
			Vector3(0.034 * side, 1.29, 0.106), Vector3(0.0, 1.27, 0.116)])
		body.add_tube(pts, PackedFloat32Array([0.0028, 0.0028, 0.0028, 0.0028, 0.0028]), 5, Color.WHITE, Color.WHITE, false)
	body.add_rounded_box(Transform3D(Basis(), Vector3(0.0, 1.266, 0.117)), Vector3(0.016, 0.01, 0.008), 0.003, Color.WHITE)
	gem.set_skin(chest.call(Vector3.ZERO))
	gem.append(CrystalFactory.echo_core(0.011, 0.04, 6), Transform3D(Basis(), Vector3(0.0, 1.243, 0.121)))


func _arm(side: float) -> void:
	var s := HeroRig.joint(_b(HeroRig.L_UPPER_ARM, side))
	var e := HeroRig.joint(_b(HeroRig.L_LOWER_ARM, side))
	var w := HeroRig.joint(_b(HeroRig.L_HAND, side))
	var dir := (e - s).normalized()
	var perp := Vector3(-dir.y, dir.x, 0.0) * side
	var fwd := Vector3(0, 0, 1)
	var le := s.distance_to(e)
	var skin := func(p: Vector3) -> Array: return _skin_arm(p, side)
	# [distance along arm from the shoulder joint, radius up/out, radius front/back]
	var rows := [[-0.025, 0.052, 0.05], [0.04, 0.048, 0.047], [0.13, 0.042, 0.042], [le - 0.03, 0.037, 0.038],
			[le, 0.036, 0.037], [le + 0.06, 0.037, 0.038], [le + 0.17, 0.041, 0.041], [le + 0.206, 0.043, 0.043],
			[le + 0.203, 0.03, 0.03]]
	var rings := []
	for r in rows:
		var d: float = r[0]
		rings.append(_ring(s + dir * d, perp * float(r[1]), fwd * float(r[2]), 2.0, clampf(d / (le + 0.206), 0.0, 1.0)))
	body.loft(rings, 18, Part.SLEEVE, skin, true)
	# Glove from inside the cuff to the wrist.
	var glove := [_ring(s + dir * (le + 0.18), perp * 0.031, fwd * 0.029), _ring(w, perp * 0.026, fwd * 0.024),
			_ring(w + dir * 0.02, perp * 0.024, fwd * 0.03)]
	body.loft(glove, 14, Part.GLOVE, skin)
	# Shoulder seam ornament: a thin gold band where the sleeve meets the coat.
	var band := [_ring(s + dir * 0.0, perp * 0.0525, fwd * 0.0505), _ring(s + dir * 0.012, perp * 0.0525, fwd * 0.0505)]
	body.loft(band, 18, Part.GOLD, skin)


func _hand(side: float) -> void:
	var e := HeroRig.joint(_b(HeroRig.L_LOWER_ARM, side))
	var w := HeroRig.joint(_b(HeroRig.L_HAND, side))
	var dir := (w - e).normalized()
	var palm_n := -Vector3(-dir.y, dir.x, 0.0) * side   # faces the thigh in the A-pose
	var fwd := Vector3(0, 0, 1)
	var hand_bone := _b(HeroRig.L_HAND, side)
	var skin := func(_p: Vector3) -> Array: return [[hand_bone, 1.0]]
	var palm := [_ring(w + dir * 0.012, palm_n * 0.014, fwd * 0.027), _ring(w + dir * 0.035, palm_n * 0.016, fwd * 0.036),
			_ring(w + dir * 0.072, palm_n * 0.014, fwd * 0.039), _ring(w + dir * 0.086, palm_n * 0.011, fwd * 0.033)]
	body.loft(palm, 14, Part.GLOVE, skin, false, true)
	body.set_skin(skin.call(w))
	var fingers := [[0.026, 0.07], [0.009, 0.078], [-0.009, 0.074], [-0.026, 0.06]]
	for f in fingers:
		var base: Vector3 = w + dir * 0.078 + fwd * float(f[0])
		var length: float = f[1]
		var pts := PackedVector3Array()
		for k in 5:
			var t := float(k) / 4.0
			var curl := t * t * 0.55
			pts.push_back(base + dir * length * t * (1.0 - curl * 0.35) + palm_n * length * curl)
		var r0 := 0.0095
		body.cur_part = Part.GLOVE
		body.add_tube(pts.slice(0, 3), PackedFloat32Array([r0, r0 * 0.95, r0 * 0.9]), 7, Color.WHITE, Color.WHITE, false)
		body.cur_part = Part.SKIN
		body.add_tube(pts.slice(2, 5), PackedFloat32Array([r0 * 0.88, r0 * 0.82, r0 * 0.72]), 7, Color.WHITE, Color.WHITE, true)
	# Thumb on the front side of the palm.
	var tb := w + dir * 0.03 + fwd * 0.03 + palm_n * 0.006
	var tdir := (dir * 0.55 + fwd * 0.6 + palm_n * 0.45).normalized()
	var tpts := PackedVector3Array([tb, tb + tdir * 0.025, tb + tdir * 0.045 + palm_n * 0.008, tb + tdir * 0.058 + palm_n * 0.015])
	body.cur_part = Part.GLOVE
	body.add_tube(tpts.slice(0, 2), PackedFloat32Array([0.0115, 0.0105]), 7, Color.WHITE, Color.WHITE, false)
	body.cur_part = Part.SKIN
	body.add_tube(tpts.slice(1, 4), PackedFloat32Array([0.0098, 0.009, 0.0078]), 7, Color.WHITE, Color.WHITE, true)


func _leg_center(y: float, side: float) -> Vector3:
	var hip := HeroRig.joint(_b(HeroRig.L_UPPER_LEG, side))
	var knee := HeroRig.joint(_b(HeroRig.L_LOWER_LEG, side))
	var ankle := HeroRig.joint(_b(HeroRig.L_FOOT, side))
	if y > knee.y:
		return hip.lerp(knee, clampf((hip.y - y) / (hip.y - knee.y), -0.3, 1.0))
	return knee.lerp(ankle, clampf((knee.y - y) / (knee.y - ankle.y), 0.0, 1.0))


func _leg(side: float) -> void:
	var skin := func(p: Vector3) -> Array: return _skin_leg(p, side)
	var shorts := [[0.93, 0.08, 0.086], [0.86, 0.084, 0.089], [0.78, 0.079, 0.084], [0.718, 0.073, 0.078], [0.712, 0.066, 0.071]]
	var tights := [[0.715, 0.066, 0.071], [0.62, 0.06, 0.064], [0.53, 0.051, 0.055], [0.47, 0.046, 0.05], [0.42, 0.046, 0.05]]
	for seg in [[shorts, Part.SHORTS], [tights, Part.TIGHTS]]:
		var rings := []
		for r in seg[0]:
			var y: float = r[0]
			rings.append(_ring(_leg_center(y, side), Vector3(float(r[1]), 0, 0), Vector3(0, 0, float(r[2])), 2.0, y))
		body.loft(rings, 18, seg[1], skin)


func _boot(side: float) -> void:
	var skin := func(p: Vector3) -> Array: return _skin_leg(p, side)
	var rows := [[0.47, 0.047, 0.05], [0.478, 0.06, 0.064], [0.45, 0.06, 0.064], [0.432, 0.056, 0.06],
			[0.36, 0.052, 0.057], [0.24, 0.045, 0.049], [0.13, 0.04, 0.043], [0.075, 0.039, 0.046], [0.055, 0.039, 0.05]]
	var rings := []
	for r in rows:
		var y: float = r[0]
		rings.append(_ring(_leg_center(y, side), Vector3(float(r[1]), 0, 0), Vector3(0, 0, float(r[2])), 2.0, y))
	body.loft(rings, 18, Part.BOOT, skin)
	var knee := _leg_center(0.4, side)
	body.set_skin(skin.call(knee))
	body.cur_part = Part.GOLD
	body.add_rounded_box(Transform3D(Basis(Vector3.UP, 0.0), knee + Vector3(0.056 * side, 0.0, 0.0)), Vector3(0.008, 0.026, 0.03), 0.003, Color.WHITE)
	body.add_rounded_box(Transform3D(Basis(), _leg_center(0.2, side) + Vector3(0.047 * side, 0.0, 0.0)), Vector3(0.008, 0.02, 0.026), 0.003, Color.WHITE)
	# Foot, lofted heel to toe; the sole is flattened onto the ground.
	var x := HeroRig.joint(_b(HeroRig.L_FOOT, side)).x
	var foot_rows := [[-0.062, 0.03, 0.04, 0.048], [-0.035, 0.04, 0.05, 0.05], [0.02, 0.045, 0.047, 0.048],
			[0.08, 0.046, 0.034, 0.036], [0.135, 0.04, 0.025, 0.026], [0.162, 0.026, 0.016, 0.018]]
	var frings := []
	for r in foot_rows:
		frings.append(_ring(Vector3(x, float(r[3]), float(r[0])), Vector3(float(r[1]) * side, 0, 0), Vector3(0, float(r[2]), 0), 2.4, 0.0))
	var foot_skin := func(p: Vector3) -> Array:
		var toe := smoothstep(0.06, 0.11, p.z)
		return [[_b(HeroRig.L_FOOT, side), 1.0 - toe], [_b(HeroRig.L_TOES, side), toe]]
	var start := body.verts.size()
	body.loft(frings, 18, Part.BOOT, foot_skin, true, true)
	for i in range(start, body.verts.size()):
		if body.verts[i].y < 0.004:
			body.verts[i].y = 0.004
			body.normals[i] = body.normals[i].lerp(Vector3.DOWN, 0.7).normalized()


func _capelet() -> void:
	# Asymmetric mantle draped over the left shoulder, from the collar to the upper arm.
	var skin := func(p: Vector3) -> Array:
		var sh := smoothstep(0.08, 0.17, p.x) * 0.5
		var arm := smoothstep(0.17, 0.23, p.x) * 0.25
		return [[HeroRig.UPPER_CHEST, 1.0 - sh - arm], [HeroRig.L_SHOULDER, sh], [HeroRig.L_UPPER_ARM, arm]]
	var rows := [[1.437, 0.074, 0.066], [1.418, 0.15, 0.106], [1.39, 0.198, 0.134], [1.335, 0.224, 0.15], [1.285, 0.234, 0.156]]
	var rings := []
	for i in rows.size():
		var r: Array = rows[i]
		var ring := _hring(r[0], r[1], r[2], -0.006, 2.2)
		ring["v"] = float(i) / float(rows.size() - 1)
		rings.append(ring)
	body.shell(rings, 26, Part.CAPELET, Part.LINING_IVORY, skin, 0.005, 0.35, PI + 0.35)


# --- Head and hair ----------------------------------------------------------------------------

func _head() -> void:
	var ico := MeshKit.icosphere(3)
	var pv: PackedVector3Array = ico[0]
	var tri: PackedInt32Array = ico[1]
	face.set_skin([[HeroRig.HEAD, 1.0]])
	face.cur_part = 0
	for d in pv:
		var p := d * HEAD_RADII
		if d.y < 0.0:
			var jy := smoothstep(0.0, -0.95, d.y)
			p.x *= lerpf(1.0, 0.5, jy * (0.55 + 0.45 * maxf(d.z, 0.0)))
			p.z *= lerpf(1.0, 0.8, jy * maxf(-d.z, 0.0))
			p.z += 0.014 * jy * maxf(d.z, 0.0)
			p.y -= 0.014 * jy
		if d.z > 0.0:
			p.z *= 1.0 - 0.05 * d.z * d.z
		face.cur_extra = p.z
		face.add_vertex(H + p, d, Color.WHITE, Vector2(p.x, p.y))
	for i in tri:
		face.indices.push_back(i)
	face.compute_smooth_normals()


func _scalp(theta: float, phi: float, k: float = 1.0) -> Vector3:
	return H + Vector3(sin(theta) * cos(phi), sin(phi), cos(theta) * cos(phi)) * HEAD_RADII * k


static func _face_z(x: float, y: float) -> float:
	return HEAD_RADII.z * sqrt(maxf(0.0, 1.0 - pow(x / HEAD_RADII.x, 2.0) - pow(y / HEAD_RADII.y, 2.0)))


static func _bezier(p: Array, t: float) -> Vector3:
	var u := 1.0 - t
	return Vector3(p[0]) * u * u * u + Vector3(p[1]) * 3.0 * u * u * t + Vector3(p[2]) * 3.0 * u * t * t + Vector3(p[3]) * t * t * t


## One hair lock along a cubic bezier: lens-shaped section tapering to a point.
func _lock(pts: Array, width: float, thick: float, segs: int = 9) -> void:
	var rings := []
	for i in segs + 1:
		var t := float(i) / float(segs)
		var c := _bezier(pts, t)
		var tan := (_bezier(pts, minf(t + 0.02, 1.0)) - _bezier(pts, maxf(t - 0.02, 0.0))).normalized()
		var out := (c - H).normalized()
		var wdir := tan.cross(out).normalized()
		var tdir := wdir.cross(tan).normalized()
		if tdir.dot(out) < 0.0:
			tdir = -tdir
		var prof := pow(1.0 - t, 0.75) * (0.72 + 0.28 * smoothstep(0.0, 0.25, t))
		rings.append(_ring(c, wdir * maxf(width * prof, 0.0005), tdir * maxf(thick * prof, 0.0004), 1.6, t))
	var start := hair.verts.size()
	hair.loft(rings, 6, 0, func(_p: Vector3) -> Array: return [[HeroRig.HEAD, 1.0]])
	hair.soften_normals(start, H, 0.45)


func _hair() -> void:
	# Cap over the cranium, open where the face is.
	var ico := MeshKit.icosphere(3)
	var pv: PackedVector3Array = ico[0]
	var tri: PackedInt32Array = ico[1]
	hair.set_skin([[HeroRig.HEAD, 1.0]])
	var map := {}
	for i in range(0, tri.size(), 3):
		var d := (pv[tri[i]] + pv[tri[i + 1]] + pv[tri[i + 2]]).normalized()
		if (d.z > 0.22 and d.y < 0.55) or (d.y < -0.18 and d.z > -0.4) or d.y < -0.62:
			continue
		for k in 3:
			var vi := tri[i + k]
			if not map.has(vi):
				var p := pv[vi] * HEAD_RADII * 1.045
				map[vi] = hair.add_vertex(H + p, pv[vi], Color.WHITE, Vector2(0.0, 0.06))
			hair.indices.push_back(map[vi])
	# Bangs.
	for i in 7:
		var th := lerpf(-0.62, 0.62, float(i) / 6.0)
		var x2 := sin(th) * 0.074
		var tip_x := sin(th) * 0.082 + signf(th) * 0.004
		var tip_y := lerpf(0.022, -0.026, absf(th) / 0.62) + rng.randf_range(-0.004, 0.004)
		if i == 3:
			tip_y = 0.03
		_lock([_scalp(th * 0.8, 0.95), _scalp(th, 0.6, 1.2), H + Vector3(x2, 0.036, _face_z(x2, 0.036) + 0.016),
				H + Vector3(tip_x, tip_y, _face_z(tip_x, tip_y) + 0.008)], 0.036, 0.011)
	# Face-framing side locks.
	for side in [1.0, -1.0]:
		var th: float = 1.2 * side
		_lock([_scalp(th, 0.55), _scalp(th, 0.2, 1.18), H + Vector3(0.1 * side, -0.06, 0.03),
				H + Vector3(0.088 * side, -0.142, 0.034)], 0.036, 0.012, 10)
	# Back and nape locks down to the shoulders.
	for i in 14:
		var th := lerpf(1.5, TAU - 1.5, float(i) / 13.0) + rng.randf_range(-0.05, 0.05)
		var dir := Vector3(sin(th), 0.0, cos(th))
		var tip_y := -0.19 - rng.randf_range(0.0, 0.06)
		var flick := 0.03 if i % 3 == 1 else 0.0
		var side_dir := Vector3(cos(th), 0.0, -sin(th)) * rng.randf_range(-0.012, 0.012)
		_lock([_scalp(th, 0.78), _scalp(th, 0.25, 1.2), H + dir * 0.116 + Vector3(0, -0.11, 0),
				H + dir * (0.122 + flick) + side_dir + Vector3(0, tip_y + flick * 0.6, 0)], 0.05, 0.017, 10)
	for i in 6:
		var th := lerpf(2.2, TAU - 2.2, float(i) / 5.0)
		var dir := Vector3(sin(th), 0.0, cos(th))
		_lock([_scalp(th, 0.15), _scalp(th, -0.25, 1.12), H + dir * 0.1 + Vector3(0, -0.13, 0),
				H + dir * 0.1 + Vector3(0, -0.17, 0)], 0.045, 0.014)
	# Crown volume sweeping toward the hairline.
	for i in 8:
		var th := TAU * float(i) / 8.0 + 0.2
		_lock([_scalp(th + 0.4, 1.35), _scalp(th, 1.05, 1.13), _scalp(th, 0.75, 1.11), _scalp(th, 0.45, 1.06)], 0.062, 0.016)
	# Ahoge.
	var crown := _scalp(0.2, 1.42)
	_lock([crown, crown + Vector3(0.004, 0.05, -0.006), crown + Vector3(0.012, 0.085, 0.03), crown + Vector3(0.02, 0.06, 0.07)], 0.014, 0.006)
	# Thin braid behind the left side lock, tied with a gold band.
	var braid_top := H + Vector3(0.086, -0.015, -0.004)
	var braid_end := H + Vector3(0.08, -0.205, 0.012)
	var noise := FastNoiseLite.new()
	for k in 8:
		var t := float(k) / 7.0
		var p := braid_top.lerp(braid_end, t) + Vector3(0.004 * (1.0 if k % 2 == 0 else -1.0), 0.0, 0.0)
		var r := lerpf(0.0165, 0.0105, t)
		var start := hair.verts.size()
		hair.add_blob(p, Vector3(r, r * 1.35, r * 0.9), 1, Color.WHITE, noise, 0.0)
		for vi in range(start, hair.verts.size()):
			hair.uvs[vi] = Vector2(0.0, lerpf(0.35, 0.8, t))
		hair.soften_normals(start, H, 0.2)
	hair.cur_part = 1
	hair.add_cylinder(Transform3D(Basis(), braid_end + Vector3(0, -0.012, 0)), 0.0085, 0.0085, 0.012, 10, Color.WHITE)
	hair.cur_part = 0
	var tuft := braid_end + Vector3(0, -0.012, 0)
	_lock([tuft, tuft + Vector3(0.002, -0.02, 0.003), tuft + Vector3(0.0, -0.035, 0.006), tuft + Vector3(-0.002, -0.05, 0.004)], 0.016, 0.008, 6)
