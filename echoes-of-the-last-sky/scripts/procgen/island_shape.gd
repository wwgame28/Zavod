@tool
class_name IslandShape
extends RefCounted
## Analytic description of a floating island: coastline, layered top surface and underside.
## The same functions drive mesh generation, collision and prop placement, so everything that
## sits on the island agrees with the terrain.

var noise_seed := 1
var radius := 100.0
var aspect := Vector2.ONE           ## Coastline stretch along X / Z.
var coast_noise := 0.16
var base_height := 2.0
var hill_amp := 2.5
var hill_scale := 0.012
var rim_drop := 2.0
var underside_depth := 90.0
var underside_lobes := 0.22
var strata_bands := 7.0
var strata_ledge := 0.035
var drip_amount := 0.22
var path_width := 2.4

## {c: Vector2, r, h, edge, wobble, top_amp}
var plateaus: Array[Dictionary] = []
## {a: Vector3, b: Vector3, w, fall}  - walkable inclines between tiers (y = height at each end).
var ramps: Array[Dictionary] = []
## {c: Vector2, r, h, fall}  - flattened building pads.
var flats: Array[Dictionary] = []
## {c: Vector2, r, depth}
var basins: Array[Dictionary] = []
## {a: Vector2, b: Vector2, w, level}  - stream channels carved down to a level.
var channels: Array[Dictionary] = []
var paths: Array[PackedVector2Array] = []

var _coast: FastNoiseLite
var _hills: FastNoiseLite
var _edge: FastNoiseLite
var _under: FastNoiseLite
var _meadow: FastNoiseLite


func setup() -> void:
	_coast = _make_noise(noise_seed, 1.0, 3)
	_hills = _make_noise(noise_seed + 11, 1.0, 4)
	_edge = _make_noise(noise_seed + 23, 1.0, 3)
	_under = _make_noise(noise_seed + 37, 1.0, 3)
	_meadow = _make_noise(noise_seed + 51, 1.0, 2)


static func _make_noise(s: int, freq: float, octaves: int) -> FastNoiseLite:
	var n := FastNoiseLite.new()
	n.seed = s
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.frequency = freq
	n.fractal_type = FastNoiseLite.FRACTAL_FBM
	n.fractal_octaves = octaves
	return n


## Distance from the island axis to the coast for polar angle `theta` (before aspect stretch).
func coast_radius(theta: float) -> float:
	var cx := cos(theta)
	var cz := sin(theta)
	var n := _coast.get_noise_2d(cx * 1.2, cz * 1.2) + 0.45 * _coast.get_noise_2d(cx * 3.4 + 7.0, cz * 3.4 - 3.0)
	return radius * (1.0 + coast_noise * n)


func coast_point(theta: float) -> Vector2:
	return Vector2(cos(theta) * aspect.x, sin(theta) * aspect.y) * coast_radius(theta)


## 0 at the island axis, 1 on the coastline.
func radial_norm(x: float, z: float) -> float:
	var lx := x / aspect.x
	var lz := z / aspect.y
	var theta := atan2(lz, lx)
	return Vector2(lx, lz).length() / coast_radius(theta)


func height(x: float, z: float) -> float:
	var p := Vector2(x, z)
	var h := base_height + hill_amp * (_hills.get_noise_2d(x * hill_scale, z * hill_scale)
			+ 0.35 * _hills.get_noise_2d(x * hill_scale * 3.3 + 17.0, z * hill_scale * 3.3 - 9.0))
	h -= rim_drop * smoothstep(0.8, 1.0, radial_norm(x, z))
	var wob := edge_wobble(x, z)
	for pl in plateaus:
		var c: Vector2 = pl.c
		var r: float = pl.r
		var d := p.distance_to(c) + float(pl.get("wobble", 0.08)) * wob * r
		var m := 1.0 - smoothstep(r - float(pl.edge), r, d)
		if m > 0.0:
			var top: float = pl.h + float(pl.get("top_amp", 0.5)) * _hills.get_noise_2d(x * 0.03 + 50.0, z * 0.03)
			h = lerpf(h, maxf(h, top), m)
	for rp in ramps:
		var a: Vector3 = rp.a
		var b: Vector3 = rp.b
		var a2 := Vector2(a.x, a.z)
		var ab := Vector2(b.x, b.z) - a2
		var t := clampf((p - a2).dot(ab) / ab.length_squared(), 0.0, 1.0)
		var lat := p.distance_to(a2 + ab * t)
		var w: float = rp.w
		var m := 1.0 - smoothstep(w * 0.5, w * 0.5 + float(rp.fall), lat)
		if m > 0.0:
			h = lerpf(h, lerpf(a.y, b.y, t), m)
	for fl in flats:
		var d := p.distance_to(fl.c)
		var m := 1.0 - smoothstep(float(fl.r), float(fl.r) + float(fl.fall), d)
		if m > 0.0:
			h = lerpf(h, fl.h, m)
	for bs in basins:
		var d := p.distance_to(bs.c) / float(bs.r)
		if d < 1.0:
			h -= float(bs.depth) * smoothstep(1.0, 0.25, d)
	for ch in channels:
		var a2: Vector2 = ch.a
		var ab: Vector2 = ch.b - a2
		var t := clampf((p - a2).dot(ab) / ab.length_squared(), 0.0, 1.0)
		var lat := p.distance_to(a2 + ab * t)
		var m := 1.0 - smoothstep(float(ch.w) * 0.5, float(ch.w) * 0.5 + 2.5, lat)
		if m > 0.0:
			h = lerpf(h, minf(h, ch.level), m)
	return h


func edge_wobble(x: float, z: float) -> float:
	return _edge.get_noise_2d(x * 0.045, z * 0.045)


func normal(x: float, z: float, e: float = 0.6) -> Vector3:
	var hl := height(x - e, z)
	var hr := height(x + e, z)
	var hd := height(x, z - e)
	var hu := height(x, z + e)
	return Vector3(hl - hr, 2.0 * e, hd - hu).normalized()


func path_distance(x: float, z: float) -> float:
	var p := Vector2(x, z)
	var best := 1e9
	for path in paths:
		for i in path.size() - 1:
			var a := path[i]
			var ab := path[i + 1] - a
			var t := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
			best = minf(best, p.distance_to(a + ab * t))
	return best


func path_mask(x: float, z: float) -> float:
	if paths.is_empty():
		return 0.0
	var wob := 0.7 * _edge.get_noise_2d(x * 0.25, z * 0.25)
	var half := path_width * 0.5 + wob
	return 1.0 - smoothstep(half, half + 1.4, path_distance(x, z))


## Low-frequency mask (0..1) used for flower meadows and grass density.
func meadow_mask(x: float, z: float) -> float:
	return clampf(_meadow.get_noise_2d(x * 0.02, z * 0.02) * 0.9 + 0.5, 0.0, 1.0)


## Point on the cliff wall / underside below the rim. `t` runs 0 (rim) -> 1 (tip).
func wall_point(theta: float, t: float, rim: Vector2, rim_h: float) -> Vector3:
	var cx := cos(theta)
	var cz := sin(theta)
	var band := fposmod(t * strata_bands, 1.0)
	var ledge := strata_ledge * smoothstep(0.0, 0.2, band) * (1.0 - smoothstep(0.6, 0.95, band)) * (1.0 - t)
	var lobes := 1.0 + underside_lobes * _under.get_noise_2d(cx * 1.6 + t * 1.3, cz * 1.6 - t) * smoothstep(0.05, 0.5, t)
	var f := maxf(1.0 - 0.12 * t - 0.88 * t * t, 0.0) * lobes + ledge
	var depth := underside_depth * (0.85 + 0.25 * _under.get_noise_2d(cx * 0.9 + 11.0, cz * 0.9))
	var y := lerpf(rim_h - 0.8, -depth, pow(t, 1.1))
	y -= depth * drip_amount * maxf(0.0, _under.get_noise_2d(cx * 3.5 - 4.0, cz * 3.5 + 2.0)) * t * t
	return Vector3(rim.x * f, y, rim.y * f)


func tip_depth() -> float:
	return underside_depth * 1.18


## True when (x, z) lies inside the coast with `margin` (0..1 of radius) to spare.
func is_inside(x: float, z: float, margin: float = 0.05) -> bool:
	return radial_norm(x, z) < 1.0 - margin
