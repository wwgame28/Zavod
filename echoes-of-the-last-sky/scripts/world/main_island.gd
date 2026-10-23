@tool
class_name MainIsland
extends ProceduralNode
## The Cradle - central floating island of the Shattered Reach.
## Layout (tiers, ramps, landmarks) is authored here as data; all geometry is generated from it.
##
##   South meadow (h ~3)  ->  Grand Stair  ->  Temple Terrace (h 14, plaza + Echo Core)
##   Temple Terrace       ->  Crown Ascent ->  Skyroot Crown (h 34, ancient blossom tree)
##   West Shelf: spring pond feeding a waterfall off the edge.  East Knoll: ruined watchtower.
##   South-west: broken bridge reaching toward a lone islet.    South-east: rune circle.

const PLAZA_CENTER := Vector2(-30.0, 10.0)
const PLAZA_HEIGHT := 14.3
const PLAZA_RADIUS := 15.0
const TOWER_CENTER := Vector2(80.0, 10.0)
const HERO_TREE := Vector2(26.0, -64.0)
const POND_CENTER := Vector2(-112.0, -30.0)
const WATER_LEVEL := 13.15
const RUNE_CIRCLE := Vector2(38.0, 62.0)
const BRIDGE_START := Vector3(-58.0, 3.6, 92.0)
const BRIDGE_DIR := Vector3(-0.55, 0.0, 0.835)
const GRAND_STAIR := [Vector3(-24.0, 2.7, 82.0), Vector3(-24.0, 14.3, 38.0)]
const CROWN_STAIR := [Vector3(-22.0, 14.3, -16.0), Vector3(6.0, 34.2, -50.0)]

var shape: IslandShape
var grid: HeightGrid
var _exclusions: Array[Vector3] = []   # (x, z, radius)
var _tree_spots: Array[Vector3] = []


func _build() -> void:
	shape = make_shape()
	_build_terrain()
	grid = HeightGrid.bake(shape, 2.0)
	_build_cliff_strata()
	_build_temple()
	_build_echo_core()
	_build_stairs()
	_build_tower()
	_build_rune_circle()
	_build_bridge_and_islet()
	_build_water()
	_build_hero_tree()
	_scatter_trees()
	_scatter_rocks()
	_build_underside()
	_build_fragments()
	_build_vegetation()
	_build_ambient_fx()


static func make_shape() -> IslandShape:
	var s := IslandShape.new()
	s.noise_seed = 7
	s.radius = 118.0
	s.aspect = Vector2(1.18, 0.95)
	s.coast_noise = 0.13
	s.base_height = 2.6
	s.hill_amp = 2.0
	s.hill_scale = 0.013
	s.rim_drop = 1.6
	s.underside_depth = 92.0
	s.plateaus = [
		{"c": Vector2(-52, -22), "r": 70.0, "h": 14.0, "edge": 5.0, "wobble": 0.07, "top_amp": 0.5},
		{"c": Vector2(-118, -30), "r": 30.0, "h": 13.6, "edge": 5.0, "wobble": 0.1, "top_amp": 0.25},
		{"c": Vector2(22, -60), "r": 31.0, "h": 34.0, "edge": 7.0, "wobble": 0.12, "top_amp": 0.8},
		{"c": Vector2(80, 10), "r": 24.0, "h": 7.0, "edge": 12.0, "wobble": 0.1, "top_amp": 0.4},
	]
	s.ramps = [
		{"a": GRAND_STAIR[0], "b": GRAND_STAIR[1], "w": 8.0, "fall": 4.0},
		{"a": CROWN_STAIR[0], "b": CROWN_STAIR[1], "w": 6.0, "fall": 4.0},
	]
	s.flats = [
		{"c": PLAZA_CENTER, "r": PLAZA_RADIUS + 2.0, "h": PLAZA_HEIGHT, "fall": 5.0},
		{"c": TOWER_CENTER, "r": 10.0, "h": 7.2, "fall": 5.0},
		{"c": Vector2(-55, 88), "r": 8.0, "h": 3.6, "fall": 6.0},
		{"c": RUNE_CIRCLE, "r": 12.0, "h": 2.8, "fall": 6.0},
		{"c": HERO_TREE, "r": 9.0, "h": 34.6, "fall": 6.0},
	]
	s.basins = [{"c": POND_CENTER, "r": 13.0, "depth": 2.8}]
	s.channels = [{"a": Vector2(-122, -31), "b": Vector2(-165, -34), "w": 3.6, "level": 12.95}]
	s.paths = [
		PackedVector2Array([Vector2(-56, 90), Vector2(-40, 86), Vector2(-24, 84)]),
		PackedVector2Array([Vector2(38, 62), Vector2(12, 76), Vector2(-24, 84)]),
		PackedVector2Array([Vector2(38, 62), Vector2(58, 40), Vector2(72, 20)]),
		PackedVector2Array([Vector2(-24, 38), Vector2(-26, 30), Vector2(-28, 24)]),
		PackedVector2Array([Vector2(-44, 2), Vector2(-62, -10), Vector2(-84, -22), Vector2(-100, -28)]),
		PackedVector2Array([Vector2(-26, -4), Vector2(-22, -16)]),
		PackedVector2Array([Vector2(6, -50), Vector2(16, -58)]),
	]
	s.setup()
	return s


# --- Terrain -----------------------------------------------------------------------------------

func _build_terrain() -> void:
	var res := IslandBuilder.build(shape, 360, 120, 46, true, 3)
	var kit: MeshKit = res["kit"]
	var terrain := add_mesh(kit.commit(null, WorldPalette.TERRAIN), Transform3D.IDENTITY, "Terrain")
	terrain.set_instance_shader_parameter("underside_depth", shape.tip_depth() * 0.95)
	var body := StaticBody3D.new()
	body.name = "TerrainCollision"
	var cs := CollisionShape3D.new()
	var faces := ConcavePolygonShape3D.new()
	faces.set_faces(res["collision"])
	cs.shape = faces
	body.add_child(cs)
	add_child(body)


func _near_ramp(p: Vector2, margin: float) -> bool:
	for rp in shape.ramps:
		var a: Vector3 = rp["a"]
		var b: Vector3 = rp["b"]
		var a2 := Vector2(a.x, a.z)
		var ab := Vector2(b.x, b.z) - a2
		var t := clampf((p - a2).dot(ab) / ab.length_squared(), 0.0, 1.0)
		if p.distance_to(a2 + ab * t) < float(rp["w"]) * 0.5 + margin:
			return true
	return false


func _excluded(x: float, z: float, pad: float = 0.0) -> bool:
	for e in _exclusions:
		if Vector2(x, z).distance_to(Vector2(e.x, e.y)) < e.z + pad:
			return true
	return false


func _exclude(c: Vector2, r: float) -> void:
	_exclusions.append(Vector3(c.x, c.y, r))


## Layered sandstone buttresses along the tier cliffs (hide heightfield stretching, add strata).
func _build_cliff_strata() -> void:
	var kit := MeshKit.new()
	for index in [0, 1, 2]:
		var pl: Dictionary = shape.plateaus[index]
		var c: Vector2 = pl["c"]
		var r: float = pl["r"]
		var edge: float = pl["edge"]
		var count := int(TAU * r / 7.0)
		for k in count:
			var ang := TAU * (float(k) + rng.randf_range(-0.3, 0.3)) / float(count)
			var dir := Vector2(cos(ang), sin(ang))
			var p := c + dir * (r - edge * 0.5)
			var wob := shape.edge_wobble(p.x, p.y)
			p = c + dir * (r - edge * 0.5 - float(pl["wobble"]) * wob * r)
			if not shape.is_inside(p.x, p.y, 0.04) or _near_ramp(p, 4.0):
				continue
			var inner := p - dir * edge * 0.9
			var outer := p + dir * edge * 0.9
			var top := shape.height(inner.x, inner.y)
			var bottom := shape.height(outer.x, outer.y)
			var drop := top - bottom
			if drop < 4.0:
				continue
			var width := rng.randf_range(6.0, 9.5)
			var depth := rng.randf_range(4.0, 6.5)
			var layers := clampi(int(drop / 2.8), 2, 10)
			var stack := RockFactory.strata_stack(rng, width, drop * 0.94, depth, layers, WorldPalette.ROCK_A, WorldPalette.ROCK_B)
			var xf := Transform3D(Basis(Vector3.UP, -ang - PI * 0.5), Vector3(p.x, bottom - 1.2, p.y))
			kit.append(stack, xf)
	var mesh := kit.commit(null, WorldPalette.ROCK)
	add_mesh(mesh, Transform3D.IDENTITY, "CliffStrata")
	add_collision(mesh, Transform3D.IDENTITY, "CliffStrataCollision")


# --- Temple of the First Echo ------------------------------------------------------------------

func _build_temple() -> void:
	var kit := MeshKit.new()
	var base := Vector3(PLAZA_CENTER.x, PLAZA_HEIGHT, PLAZA_CENTER.y)
	kit.append(RuinFactory.plaza(rng, PLAZA_RADIUS), Transform3D(Basis(), base))
	var ring_r := 12.6
	var count := 12
	var intact: Array[bool] = []
	for k in count:
		var a := TAU * float(k) / float(count) + 0.13
		var p := base + Vector3(cos(a) * ring_r, -0.05, sin(a) * ring_r)
		var state: int = [0, 0, 1, 2, 0, 1, 0, 0, 2, 1, 0, 1][k]
		intact.append(state == 0)
		if state == 2:
			# Fallen column lying across the plaza edge, plus the stump it broke from.
			kit.append(RuinFactory.column(rng, 2.2, 0.85, true), Transform3D(Basis(), p))
			var fallen := RuinFactory.column(rng, 8.0, 0.85, true)
			var tangent := Vector3(-sin(a), 0.0, cos(a))
			var lay := Basis(tangent, -PI * 0.5 + 0.05) * Basis(Vector3.UP, rng.randf() * TAU)
			kit.append(fallen, Transform3D(lay, p + Vector3(cos(a), 0.0, sin(a)) * 1.6 + Vector3(0.0, 0.75, 0.0)))
		else:
			var h := 9.5 if state == 0 else rng.randf_range(3.5, 6.5)
			kit.append(RuinFactory.column(rng, h, 0.85, state == 1), Transform3D(Basis(Vector3.UP, rng.randf() * TAU), p))
	# Lintels resting on neighbouring intact columns.
	for k in count:
		var k1 := (k + 1) % count
		if intact[k] and intact[k1]:
			var a0 := TAU * float(k) / float(count) + 0.13
			var a1 := TAU * float(k1) / float(count) + 0.13
			var p0 := base + Vector3(cos(a0) * ring_r, 9.5 + 0.3, sin(a0) * ring_r)
			var p1 := base + Vector3(cos(a1) * ring_r, 9.5 + 0.3, sin(a1) * ring_r)
			var mid := (p0 + p1) * 0.5
			var along := (p1 - p0).normalized()
			var lb := Basis(along, Vector3.UP, along.cross(Vector3.UP))
			RuinFactory.block(kit, rng, Transform3D(lb, mid), Vector3(p0.distance_to(p1) + 2.2, 0.9, 1.6))
			RuinFactory.block(kit, rng, Transform3D(lb, mid + Vector3(0.0, -0.5, 0.0)), Vector3(p0.distance_to(p1) + 1.6, 0.12, 1.65), RuinFactory.trim_color())
	# Grand gateway arch at the top of the Grand Stair.
	var gate_p := Vector2(-25.0, 31.0)
	var gate := RuinFactory.arch(rng, 6.4, 7.5, 2.4, false)
	kit.append(gate, Transform3D(Basis(Vector3.UP, 0.04), Vector3(gate_p.x, grid.ground_min(gate_p.x, gate_p.y, 4.0) - 0.2, gate_p.y)))
	# Broken side arch and ruined walls framing the back of the plaza.
	var arch2 := RuinFactory.arch(rng, 5.0, 5.5, 2.0, true)
	var a2p := Vector2(-49.0, 2.0)
	kit.append(arch2, Transform3D(Basis(Vector3.UP, 1.2), Vector3(a2p.x, grid.ground_min(a2p.x, a2p.y, 3.0) - 0.2, a2p.y)))
	for i in 5:
		var a := lerpf(-PI * 0.92, -PI * 0.12, float(i) / 4.0) + rng.randf_range(-0.08, 0.08)
		var rr := rng.randf_range(18.5, 21.0)
		var wp := PLAZA_CENTER + Vector2(cos(a), sin(a)) * rr
		var length := rng.randf_range(6.0, 10.0)
		var wall := RuinFactory.wall(rng, length, rng.randf_range(2.5, 5.0), 1.2, 0.7)
		var yaw := -a - PI * 0.5
		kit.append(wall, Transform3D(Basis(Vector3.UP, yaw), Vector3(wp.x, grid.ground_min(wp.x, wp.y, length * 0.5) - 0.3, wp.y)))
	_scatter_rubble(kit, PLAZA_CENTER, 24.0, 26)
	var mesh := kit.commit(null, WorldPalette.RUIN)
	add_mesh(mesh, Transform3D.IDENTITY, "TempleOfTheFirstEcho")
	add_collision(mesh, Transform3D.IDENTITY, "TempleCollision")
	_exclude(PLAZA_CENTER, PLAZA_RADIUS + 5.0)
	_exclude(gate_p, 6.0)
	_exclude(a2p, 5.0)


func _scatter_rubble(kit: MeshKit, center: Vector2, radius: float, count: int) -> void:
	for i in count:
		var a := rng.randf() * TAU
		var d := sqrt(rng.randf()) * radius
		var p := center + Vector2(cos(a), sin(a)) * d
		if not shape.is_inside(p.x, p.y, 0.05):
			continue
		var s := Vector3(rng.randf_range(0.6, 1.6), rng.randf_range(0.4, 0.9), rng.randf_range(0.6, 1.4))
		var b := Basis(Vector3(rng.randf(), rng.randf(), rng.randf()).normalized(), rng.randf_range(0.0, 0.5)) * Basis(Vector3.UP, rng.randf() * TAU)
		RuinFactory.block(kit, rng, Transform3D(b, Vector3(p.x, grid.height(p.x, p.y) + s.y * 0.25, p.y)), s)


## The floating Echo Core above the plaza dais: crystal, rune rings, light and motes.
func _build_echo_core() -> void:
	var anchor := add_group("EchoCore")
	anchor.position = Vector3(PLAZA_CENTER.x, PLAZA_HEIGHT + 5.6, PLAZA_CENTER.y)
	var core_spin := _spinner(anchor, Vector3(0.0, 0.35, 0.0), 0.35)
	add_mesh(CrystalFactory.echo_core(1.25, 5.2).commit(null, WorldPalette.CRYSTAL), Transform3D.IDENTITY, "Core", true, core_spin)
	var ring_kit := MeshKit.new()
	ring_kit.add_ring(Transform3D.IDENTITY, 2.9, 3.7, 128, Color.WHITE)
	var ring_mesh := ring_kit.commit(null, WorldPalette.GLOW)
	for i in 2:
		var tilt := add_group("RuneRingTilt%d" % i, anchor)
		tilt.transform = Transform3D(Basis(Vector3.RIGHT, 0.5 if i == 0 else -0.35).scaled(Vector3.ONE * (1.0 + 0.32 * i)), Vector3.ZERO)
		var spin := _spinner(tilt, Vector3(0.0, 0.25 if i == 0 else -0.18, 0.0))
		add_mesh(ring_mesh, Transform3D.IDENTITY, "RuneRing%d" % i, false, spin)
	var shard_kit := MeshKit.new()
	CrystalFactory.prism(shard_kit, Transform3D.IDENTITY, 0.22, 1.1, 6)
	var shard_mesh := shard_kit.commit(null, WorldPalette.CRYSTAL)
	var orbit := _spinner(anchor, Vector3(0.0, -0.3, 0.0))
	for i in 5:
		var a := TAU * float(i) / 5.0
		add_mesh(shard_mesh, Transform3D(Basis(Vector3(cos(a), 0.0, sin(a)), 0.4), Vector3(cos(a) * 5.0, sin(a * 2.0) * 0.8, sin(a) * 5.0)), "", false, orbit)
	var light := OmniLight3D.new()
	light.light_color = Color(0.5, 0.95, 1.0)
	light.light_energy = 3.0
	light.omni_range = 22.0
	light.omni_attenuation = 1.4
	anchor.add_child(light)
	var motes := FxFactory.motes(70, Vector3(9.0, 4.0, 9.0), Color(0.55, 1.0, 1.0), 0.18, 0.25)
	motes.position = Vector3(0.0, -2.5, 0.0)
	anchor.add_child(motes)


func _spinner(parent: Node3D, speed: Vector3, bob: float = 0.0) -> Spinner:
	var s := Spinner.new()
	s.name = "Spinner"
	s.speed = speed
	s.bob = bob
	parent.add_child(s)
	return s


func _build_stairs() -> void:
	var kit := MeshKit.new()
	for stair in [[GRAND_STAIR, 7.4, 36], [CROWN_STAIR, 5.4, 48]]:
		var a: Vector3 = stair[0][0]
		var b: Vector3 = stair[0][1]
		var flat := Vector2(b.x - a.x, b.z - a.z)
		var run := flat.length()
		var steps: int = stair[2]
		var dir := flat / run
		var yaw := atan2(-dir.x, -dir.y)
		var rise := b.y - a.y
		var st := RuinFactory.stairs(rng, stair[1], rise, run, steps)
		kit.append(st, Transform3D(Basis(Vector3.UP, yaw), a - Vector3(0.0, 0.05, 0.0)))
	var mesh := kit.commit(null, WorldPalette.RUIN)
	add_mesh(mesh, Transform3D.IDENTITY, "Stairs")


func _build_tower() -> void:
	var kit := MeshKit.new()
	var base := Vector3(TOWER_CENTER.x, 7.2, TOWER_CENTER.y)
	kit.append(RuinFactory.tower(rng, 4.6, 19.0), Transform3D(Basis(Vector3.UP, 0.6), base))
	var w := RuinFactory.wall(rng, 9.0, 3.5, 1.1, 0.8)
	var wp := TOWER_CENTER + Vector2(-9.0, 5.0)
	kit.append(w, Transform3D(Basis(Vector3.UP, 0.9), Vector3(wp.x, grid.ground_min(wp.x, wp.y, 4.5) - 0.3, wp.y)))
	_scatter_rubble(kit, TOWER_CENTER, 13.0, 18)
	var mesh := kit.commit(null, WorldPalette.RUIN)
	add_mesh(mesh, Transform3D.IDENTITY, "Watchtower")
	add_collision(mesh, Transform3D.IDENTITY, "WatchtowerCollision")
	_exclude(TOWER_CENTER, 11.0)


func _build_rune_circle() -> void:
	var kit := MeshKit.new()
	var count := 7
	for k in count:
		var a := TAU * float(k) / float(count) + 0.3
		var p := RUNE_CIRCLE + Vector2(cos(a), sin(a)) * 9.0
		var h := rng.randf_range(3.6, 5.6)
		var m := RuinFactory.menhir(rng, h, 1.5)
		var tilt := Basis(Vector3(-sin(a), 0.0, cos(a)), rng.randf_range(-0.06, 0.08))
		kit.append(m, Transform3D(tilt * Basis(Vector3.UP, -a + PI * 0.5), Vector3(p.x, grid.ground_min(p.x, p.y, 0.8) - 0.4, p.y)))
	var altar_y := grid.height(RUNE_CIRCLE.x, RUNE_CIRCLE.y)
	RuinFactory.block(kit, rng, Transform3D(Basis(Vector3.UP, 0.4), Vector3(RUNE_CIRCLE.x, altar_y + 0.3, RUNE_CIRCLE.y)), Vector3(3.2, 1.0, 2.2))
	var mesh := kit.commit(null, WorldPalette.RUIN)
	add_mesh(mesh, Transform3D.IDENTITY, "RuneCircle")
	add_collision(mesh, Transform3D.IDENTITY, "RuneCircleCollision")
	var crystals := CrystalFactory.cluster(rng, 5, 0.6, 0.6, 1.8, 0.5)
	add_mesh(crystals.commit(null, WorldPalette.CRYSTAL), Transform3D(Basis(), Vector3(RUNE_CIRCLE.x, altar_y + 0.75, RUNE_CIRCLE.y)), "RuneCircleCrystal")
	_exclude(RUNE_CIRCLE, 13.0)


# --- Broken bridge and the lone islet ----------------------------------------------------------

func _build_bridge_and_islet() -> void:
	var dir := BRIDGE_DIR.normalized()
	var yaw := atan2(-dir.x, -dir.z)
	var kit := MeshKit.new()
	kit.append(RuinFactory.bridge(rng, 64.0, 5.0, 4, 0.72), Transform3D(Basis(Vector3.UP, yaw), BRIDGE_START))
	var mesh := kit.commit(null, WorldPalette.RUIN)
	add_mesh(mesh, Transform3D.IDENTITY, "BrokenBridge")
	add_collision(mesh, Transform3D.IDENTITY, "BridgeCollision")
	_exclude(Vector2(-55.0, 88.0), 9.0)

	# Fragments of the fallen span, still hovering in the gap.
	var side := Vector3(-dir.z, 0.0, dir.x)
	for i in 8:
		var d := rng.randf_range(48.0, 66.0)
		var pos := BRIDGE_START + dir * d + side * rng.randf_range(-3.5, 3.5) + Vector3(0.0, rng.randf_range(-6.0, 2.5), 0.0)
		var frag := MeshKit.new()
		var pieces := rng.randi_range(1, 3)
		for p in pieces:
			RuinFactory.block(frag, rng, Transform3D(Basis(), Vector3(p * 1.45, 0.0, 0.0)), Vector3(1.35, 0.42, 1.35))
		if rng.randf() < 0.5:
			RuinFactory.block(frag, rng, Transform3D(Basis(), Vector3(0.0, -0.9, 0.0)), Vector3(pieces * 1.4, 1.0, 1.3))
		var b := Basis(Vector3(rng.randf(), rng.randf(), rng.randf()).normalized(), rng.randf_range(0.1, 0.6)) * Basis(Vector3.UP, yaw)
		var mi := add_mesh(frag.commit(null, WorldPalette.RUIN), Transform3D(b, pos), "BridgeFragment%d" % i)
		mi.set_instance_shader_parameter("bob_amount", rng.randf_range(0.3, 0.8))
		mi.set_instance_shader_parameter("bob_phase", rng.randf() * TAU)

	# The islet the bridge once reached.
	var islet := IslandShape.new()
	islet.noise_seed = 31
	islet.radius = 15.0
	islet.aspect = Vector2(1.1, 0.9)
	islet.base_height = 0.6
	islet.hill_amp = 0.6
	islet.hill_scale = 0.05
	islet.rim_drop = 0.8
	islet.underside_depth = 26.0
	islet.setup()
	var islet_pos := BRIDGE_START + dir * 92.0 + Vector3(0.0, -0.6, 0.0)
	var node := add_group("LoneIslet")
	node.position = islet_pos
	var res := IslandBuilder.build(islet, 120, 30, 22, true, 3)
	var ik: MeshKit = res["kit"]
	var islet_terrain := add_mesh(ik.commit(null, WorldPalette.TERRAIN), Transform3D.IDENTITY, "Terrain", true, node)
	islet_terrain.set_instance_shader_parameter("underside_depth", islet.tip_depth())
	var body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var faces := ConcavePolygonShape3D.new()
	faces.set_faces(res["collision"])
	cs.shape = faces
	body.add_child(cs)
	node.add_child(body)
	var rk := MeshKit.new()
	var stub := RuinFactory.bridge(rng, 14.0, 5.0, 1, 0.75)
	rk.append(stub, Transform3D(Basis(Vector3.UP, yaw + PI), Vector3(0.0, 0.6, 0.0) - dir * 9.0))
	var shrine := RuinFactory.arch(rng, 3.6, 4.2, 1.6, false)
	rk.append(shrine, Transform3D(Basis(Vector3.UP, yaw), Vector3(0.0, 0.3, 0.0) + dir * 3.0))
	rk.append(RuinFactory.column(rng, 3.0, 0.5, true), Transform3D(Basis(), Vector3(4.0, 0.3, 0.0) + dir * 5.0))
	var rmesh := rk.commit(null, WorldPalette.RUIN)
	add_mesh(rmesh, Transform3D.IDENTITY, "Shrine", true, node)
	add_collision(rmesh, Transform3D.IDENTITY, "ShrineCollision", node)
	var tree := WorldPalette.tree_mesh(TreeFactory.broadleaf(rng, 9.0, 4.2, WorldPalette.LEAF_TEAL, WorldPalette.BARK_PALE))
	add_mesh(tree, Transform3D(Basis(), Vector3(-3.5, 0.3, 0.0) + dir * 7.0), "IsletTree", true, node)
	var under := CrystalFactory.cluster(rng, 6, 1.4, 1.5, 4.5, 0.7)
	add_mesh(under.commit(null, WorldPalette.CRYSTAL), Transform3D(Basis(Vector3.RIGHT, PI), Vector3(0.0, -islet.tip_depth() * 0.75, 0.0)), "IsletCrystal", true, node)


# --- Spring pond and waterfall -----------------------------------------------------------------

func _build_water() -> void:
	var group := add_group("Spring")
	var kit := MeshKit.new()
	var segs := 48
	var c := kit.add_vertex(Vector3(POND_CENTER.x, WATER_LEVEL, POND_CENTER.y), Vector3.UP)
	var ring := []
	for i in segs:
		var a := TAU * float(i) / float(segs)
		ring.append(kit.add_vertex(Vector3(POND_CENTER.x + cos(a) * 13.5, WATER_LEVEL, POND_CENTER.y + sin(a) * 13.5), Vector3.UP))
	for i in segs:
		kit.add_tri_facing(c, ring[i], ring[(i + 1) % segs], Vector3.UP)
	# Find where the stream channel crosses the coast.
	var ch: Dictionary = shape.channels[0]
	var ca: Vector2 = ch["a"]
	var cb: Vector2 = ch["b"]
	var lip := ca
	for s in 200:
		var p := ca.lerp(cb, float(s) / 199.0)
		if shape.radial_norm(p.x, p.y) >= 1.0:
			break
		lip = p
	var flow := (cb - ca).normalized()
	var side := Vector2(-flow.y, flow.x) * 1.9
	var q0 := kit.add_vertex(Vector3(POND_CENTER.x + side.x, WATER_LEVEL, POND_CENTER.y + side.y), Vector3.UP)
	var q1 := kit.add_vertex(Vector3(POND_CENTER.x - side.x, WATER_LEVEL, POND_CENTER.y - side.y), Vector3.UP)
	var end := lip + flow * 1.5
	var q2 := kit.add_vertex(Vector3(end.x - side.x, WATER_LEVEL, end.y - side.y), Vector3.UP)
	var q3 := kit.add_vertex(Vector3(end.x + side.x, WATER_LEVEL, end.y + side.y), Vector3.UP)
	kit.add_quad_facing(q0, q1, q2, q3, Vector3.UP)
	var water := add_mesh(kit.commit(null, WorldPalette.WATER), Transform3D.IDENTITY, "Pond", false, group)
	water.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	# Waterfall: ballistic ribbon falling off the lip, widening as it drops.
	var fall := MeshKit.new()
	var out := Vector3(flow.x, 0.0, flow.y)
	var start := Vector3(end.x, WATER_LEVEL, end.y)
	var side3 := Vector3(-flow.y, 0.0, flow.x)
	for layer in 2:
		var offset := out * (0.0 if layer == 0 else -0.7)
		var width_k := 1.0 if layer == 0 else 0.75
		var prev_l := -1
		var prev_r := -1
		var dist := 0.0
		var prev_p := start
		for i in 41:
			var t := float(i) / 40.0 * 4.2
			var p := start + offset + out * (5.5 * t) + Vector3(0.0, -0.5 * 9.8 * t * t, 0.0)
			if i > 0:
				dist += p.distance_to(prev_p)
			prev_p = p
			var w := (2.0 + dist * 0.07) * width_k
			var l := fall.add_vertex(p - side3 * w, out, Color.WHITE, Vector2(0.0, dist))
			var r := fall.add_vertex(p + side3 * w, out, Color.WHITE, Vector2(1.0, dist))
			if prev_l >= 0:
				fall.add_quad_facing(prev_l, prev_r, r, l, out)
			prev_l = l
			prev_r = r
	add_mesh(fall.commit(null, WorldPalette.WATERFALL), Transform3D.IDENTITY, "Waterfall", false, group)
	var spray := FxFactory.mist(26, Vector3(2.5, 1.0, 2.5), 4.5, out * 1.5 + Vector3(0.0, -2.0, 0.0), 3.5, 0.45)
	spray.position = start + out * 3.0 + Vector3(0.0, -3.0, 0.0)
	group.add_child(spray)
	var veil := FxFactory.mist(30, Vector3(6.0, 10.0, 6.0), 14.0, Vector3(0.0, -3.0, 0.0), 6.0, 0.35)
	veil.position = start + out * 20.0 + Vector3(0.0, -60.0, 0.0)
	group.add_child(veil)
	_exclude(POND_CENTER, 16.0)


# --- Flora -------------------------------------------------------------------------------------

func _build_hero_tree() -> void:
	var y := grid.height(HERO_TREE.x, HERO_TREE.y)
	var parts := TreeFactory.ancient(rng, 26.0, 14.0, WorldPalette.LEAF_BLOSSOM, WorldPalette.BARK_PALE)
	var mesh := WorldPalette.tree_mesh(parts, WorldPalette.BLOSSOM)
	var tree := add_mesh(mesh, Transform3D(Basis(Vector3.UP, 0.7), Vector3(HERO_TREE.x, y - 0.6, HERO_TREE.y)), "SkyrootGuardian")
	add_collision(_trunk_only(parts), tree.transform, "SkyrootGuardianCollision")
	var petals := FxFactory.petals(140, Vector3(14.0, 4.0, 14.0), Color(1.0, 0.8, 0.88), Vector3(0.35, -0.45, 0.25), 14.0)
	petals.position = Vector3(HERO_TREE.x, y + 15.0, HERO_TREE.y)
	add_child(petals)
	var glow := FxFactory.motes(40, Vector3(12.0, 5.0, 12.0), Color(1.0, 0.75, 0.9), 0.2, 0.15, 9.0)
	glow.position = Vector3(HERO_TREE.x, y + 8.0, HERO_TREE.y)
	add_child(glow)
	_exclude(HERO_TREE, 14.0)


func _trunk_only(parts: Dictionary) -> ArrayMesh:
	var bark: MeshKit = parts["bark"]
	return bark.commit()


func _make_tree_variants() -> Array:
	var v := []
	var greens := [WorldPalette.LEAF_GREEN, WorldPalette.LEAF_DEEP, WorldPalette.LEAF_LIME, WorldPalette.LEAF_GREEN, WorldPalette.LEAF_TEAL, WorldPalette.LEAF_DEEP]
	for i in greens.size():
		var h := rng.randf_range(7.5, 12.0)
		v.append({"mesh": WorldPalette.tree_mesh(TreeFactory.broadleaf(rng, h, h * rng.randf_range(0.42, 0.52), greens[i], WorldPalette.BARK_BROWN, 2, rng.randi_range(3, 5))), "r": 5.0, "kind": "broadleaf"})
	for i in 3:
		var h := rng.randf_range(10.0, 15.0)
		v.append({"mesh": WorldPalette.tree_mesh(TreeFactory.conifer(rng, h, h * 0.28, WorldPalette.LEAF_PINE, WorldPalette.BARK_BROWN, 4 + i % 2)), "r": 3.5, "kind": "conifer"})
	return v


func _scatter_trees() -> void:
	var variants := _make_tree_variants()
	var bushes := []
	for i in 4:
		var col: Color = [WorldPalette.LEAF_GREEN, WorldPalette.LEAF_LIME, WorldPalette.LEAF_DEEP, WorldPalette.LEAF_TEAL][i]
		bushes.append(WorldPalette.tree_mesh(TreeFactory.bush(rng, rng.randf_range(1.6, 2.4), col)))
	var group := add_group("Trees")
	# zone: [center, radius, count, allowed kinds]
	var zones := [
		[Vector2(76, 62), 24.0, 8, "broadleaf"],
		[Vector2(-92, 62), 20.0, 6, "broadleaf"],
		[Vector2(104, -26), 16.0, 4, "any"],
		[Vector2(-68, -62), 24.0, 9, "any"],
		[Vector2(-98, 2), 14.0, 4, "broadleaf"],
		[Vector2(-116, -30), 26.0, 5, "broadleaf"],
		[Vector2(22, -60), 27.0, 5, "conifer"],
		[Vector2(84, 10), 18.0, 3, "broadleaf"],
		[Vector2(0, 30), 110.0, 14, "broadleaf"],
		[Vector2(96, 30), 18.0, 4, "broadleaf"],
		[Vector2(-10, 100), 26.0, 3, "broadleaf"],
	]
	for zone in zones:
		var placed := 0
		var attempts := 0
		var count: int = zone[2]
		while placed < count and attempts < count * 40:
			attempts += 1
			var a := rng.randf() * TAU
			var p: Vector2 = zone[0] + Vector2(cos(a), sin(a)) * sqrt(rng.randf()) * float(zone[1])
			if not _tree_ok(p, 6.5):
				continue
			var choices := []
			for v in variants:
				if zone[3] == "any" or v["kind"] == zone[3]:
					choices.append(v)
			var pick: Dictionary = choices[rng.randi() % choices.size()]
			var s := rng.randf_range(0.85, 1.2)
			var y := grid.ground_min(p.x, p.y, 0.8) - 0.3
			add_mesh(pick["mesh"], Transform3D(yaw_basis(rng.randf() * TAU, s), Vector3(p.x, y, p.y)), "", true, group)
			_tree_spots.append(Vector3(p.x, p.y, 6.5 * s))
			placed += 1
	# Bushes hug tree bases, ruins and cliff feet.
	var bush_group := add_group("Bushes")
	var placed_b := 0
	var tries := 0
	while placed_b < 70 and tries < 3000:
		tries += 1
		var p: Vector2
		if rng.randf() < 0.55 and not _tree_spots.is_empty():
			var t: Vector3 = _tree_spots[rng.randi() % _tree_spots.size()]
			var a := rng.randf() * TAU
			p = Vector2(t.x, t.y) + Vector2(cos(a), sin(a)) * rng.randf_range(2.5, 6.0)
		else:
			p = Vector2(rng.randf_range(-150, 150), rng.randf_range(-120, 120))
		if not shape.is_inside(p.x, p.y, 0.04) or grid.normal(p.x, p.y).y < 0.8 or grid.path(p.x, p.y) > 0.2 or _excluded(p.x, p.y, -2.0) or _in_pond(p):
			continue
		var y := grid.ground_min(p.x, p.y, 0.6) - 0.2
		add_mesh(bushes[rng.randi() % bushes.size()], Transform3D(yaw_basis(rng.randf() * TAU, rng.randf_range(0.7, 1.3)), Vector3(p.x, y, p.y)), "", true, bush_group)
		placed_b += 1


func _in_pond(p: Vector2) -> bool:
	return p.distance_to(POND_CENTER) < 15.0


func _tree_ok(p: Vector2, spacing: float) -> bool:
	if not shape.is_inside(p.x, p.y, 0.07):
		return false
	if grid.normal(p.x, p.y).y < 0.86 or grid.path(p.x, p.y) > 0.05 or _near_ramp(p, 4.0):
		return false
	if _excluded(p.x, p.y, 2.0) or _in_pond(p):
		return false
	if shape.path_distance(p.x, p.y) < 4.0:
		return false
	for t in _tree_spots:
		if p.distance_to(Vector2(t.x, t.y)) < maxf(spacing, t.z):
			return false
	return true


func _scatter_rocks() -> void:
	var variants: Array[ArrayMesh] = []
	for i in 8:
		var s := Vector3(rng.randf_range(1.2, 2.2), rng.randf_range(0.8, 1.6), rng.randf_range(1.1, 2.0))
		var col := WorldPalette.ROCK_A.lerp(WorldPalette.ROCK_B, rng.randf())
		variants.append(RockFactory.rock(rng, s, col, rng.randi_range(6, 9), 2).commit(null, WorldPalette.ROCK))
	var group := add_group("Rocks")
	var placed := 0
	var tries := 0
	while placed < 70 and tries < 4000:
		tries += 1
		var p := Vector2(rng.randf_range(-150, 150), rng.randf_range(-120, 120))
		if not shape.is_inside(p.x, p.y, 0.02) or grid.path(p.x, p.y) > 0.3 or _excluded(p.x, p.y, -1.0) or _near_ramp(p, 2.0) or _in_pond(p):
			continue
		var n := grid.normal(p.x, p.y)
		# Favour cliff feet and slopes, where rocks naturally gather.
		if n.y > 0.95 and rng.randf() < 0.6:
			continue
		var s := rng.randf_range(0.6, 2.2)
		var b := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * s)
		add_mesh(variants[rng.randi() % variants.size()], Transform3D(b, Vector3(p.x, grid.ground_min(p.x, p.y, s) - 0.35 * s, p.y)), "", true, group)
		placed += 1
	# Pebbles as one multimesh per variant.
	var pebble_mesh := RockFactory.rock(rng, Vector3(0.35, 0.22, 0.3), WorldPalette.ROCK_A, 6, 1).commit(null, WorldPalette.ROCK)
	var xforms: Array[Transform3D] = []
	tries = 0
	while xforms.size() < 400 and tries < 8000:
		tries += 1
		var p := Vector2(rng.randf_range(-150, 150), rng.randf_range(-120, 120))
		if not shape.is_inside(p.x, p.y, 0.02) or _excluded(p.x, p.y, -3.0):
			continue
		if grid.path(p.x, p.y) < 0.3 and rng.randf() < 0.7:
			continue
		var s := rng.randf_range(0.6, 1.8)
		xforms.append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3.ONE * s), Vector3(p.x, grid.height(p.x, p.y) - 0.05, p.y)))
	_add_multimesh(pebble_mesh, xforms, "Pebbles", group, false)


# --- Underside, roots, fragments ---------------------------------------------------------------

func _build_underside() -> void:
	var group := add_group("Underside")
	var rock := MeshKit.new()
	for i in 18:
		var th := rng.randf() * TAU
		var t := rng.randf_range(0.35, 0.86)
		var frame := IslandBuilder.wall_frame(shape, th, t)
		var p: Vector3 = frame[0]
		var length := rng.randf_range(12.0, 22.0) + t * 26.0
		var radius := rng.randf_range(3.0, 6.0) + (1.0 - t) * 3.0
		var col_top := WorldPalette.ROCK_UNDER
		var sp := RockFactory.spire(rng, length, radius, col_top, WorldPalette.ROCK_DEEP)
		rock.append(sp, Transform3D(Basis(Vector3.UP, rng.randf() * TAU), p + Vector3(0.0, 3.0, 0.0) - Vector3(p.x, 0.0, p.z).normalized() * radius * 0.6))
	# Central drip below the tip.
	rock.append(RockFactory.spire(rng, 38.0, 11.0, WorldPalette.ROCK_UNDER, WorldPalette.ROCK_DEEP, 9), Transform3D(Basis(), Vector3(0.0, -shape.tip_depth() + 12.0, 0.0)))
	add_mesh(rock.commit(null, WorldPalette.ROCK), Transform3D.IDENTITY, "HangingSpires", true, group)

	var crystals := MeshKit.new()
	var light_spots: Array[Vector3] = []
	for i in 22:
		var th := TAU * float(i) / 22.0 + rng.randf_range(-0.15, 0.15)
		var t := rng.randf_range(0.25, 0.85)
		var frame := IslandBuilder.wall_frame(shape, th, t)
		var p: Vector3 = frame[0]
		var n: Vector3 = frame[1]
		var dir := (n + Vector3.DOWN * 0.6).normalized()
		var cl := CrystalFactory.cluster(rng, rng.randi_range(5, 8), rng.randf_range(2.0, 4.0), 3.0, rng.randf_range(8.0, 17.0), 0.7)
		crystals.append(cl, Transform3D(basis_from_up(dir, rng.randf() * TAU), p - dir * 0.8))
		if i % 5 == 0:
			light_spots.append(p + dir * 8.0)
	add_mesh(crystals.commit(null, WorldPalette.CRYSTAL), Transform3D.IDENTITY, "UndersideCrystals", true, group)
	for lp in light_spots:
		var light := OmniLight3D.new()
		light.position = lp
		light.light_color = Color(0.45, 0.9, 1.0)
		light.light_energy = 6.0
		light.omni_range = 45.0
		group.add_child(light)
	var motes := FxFactory.motes(90, Vector3(70.0, 30.0, 60.0), Color(0.5, 0.95, 1.0), 0.6, 0.35, 10.0)
	motes.position = Vector3(0.0, -60.0, 0.0)
	group.add_child(motes)
	_build_roots(group)


## Roots and vines spilling over the rim and dangling beneath the island.
func _build_roots(group: Node3D) -> void:
	var bark := MeshKit.new()
	var leaves := MeshKit.new()
	var noise := FastNoiseLite.new()
	noise.seed = 77
	noise.frequency = 1.0
	for i in 44:
		var th := rng.randf() * TAU
		var rim := shape.coast_point(th)
		var out := Vector3(rim.x, 0.0, rim.y).normalized()
		var top := shape.height(rim.x * 0.97, rim.y * 0.97)
		var start := Vector3(rim.x * 0.985, top - 0.4, rim.y * 0.985)
		var length := rng.randf_range(6.0, 24.0)
		var vine := rng.randf() < 0.35
		var pts := PackedVector3Array()
		var radii := PackedFloat32Array()
		var segs := 9
		var phase := rng.randf() * TAU
		for s in segs:
			var f := float(s) / float(segs - 1)
			var p := start + out * (1.6 * minf(f * 5.0, 1.0)) + Vector3(0.0, -length * f - 1.0 * minf(f * 5.0, 1.0), 0.0)
			p += Vector3(sin(f * 6.0 + phase), 0.0, cos(f * 5.0 + phase)) * f * 1.3
			pts.push_back(p)
			radii.push_back(lerpf(0.32 if not vine else 0.12, 0.04, f))
		var c0 := WorldPalette.BARK_BROWN.darkened(0.25)
		var c1 := c0
		if vine:
			c0 = WorldPalette.LEAF_DEEP.darkened(0.2)
			c1 = WorldPalette.LEAF_GREEN.darkened(0.1)
		c0.a = 0.0
		c1.a = 0.8
		bark.add_tube(pts, radii, 5, c0, c1, true)
		if vine:
			for k in range(2, segs, 2):
				var lc := WorldPalette.LEAF_GREEN
				lc.a = float(k) / float(segs) * 0.8
				leaves.add_blob(pts[k], Vector3.ONE * rng.randf_range(0.4, 0.75), 1, lc, noise, 0.2, pts[k], 0.3, 0.2)
	var mesh := ArrayMesh.new()
	bark.commit(mesh, WorldPalette.BARK)
	leaves.commit(mesh, WorldPalette.FOLIAGE)
	add_mesh(mesh, Transform3D.IDENTITY, "HangingRoots", true, group)


## Small rock islets drifting around the Cradle.
func _build_fragments() -> void:
	var group := add_group("DriftingFragments")
	var placed := 0
	while placed < 26:
		var a := rng.randf() * TAU
		var d := rng.randf_range(155.0, 240.0)
		var pos := Vector3(cos(a) * d, rng.randf_range(-85.0, 30.0), sin(a) * d * 0.9)
		var s := rng.randf_range(2.0, 8.0)
		if _blocks_viewpoint(pos, s + 25.0):
			continue
		var i := placed
		placed += 1
		var kit := RockFactory.rock(rng, Vector3(s, s * 0.8, s * 0.9), WorldPalette.ROCK_A.lerp(WorldPalette.ROCK_UNDER, rng.randf() * 0.6), 7, 2, -1.0)
		var spire := RockFactory.spire(rng, s * rng.randf_range(1.2, 2.2), s * 0.7, WorldPalette.ROCK_UNDER, WorldPalette.ROCK_DEEP, 6)
		kit.append(spire, Transform3D(Basis(), Vector3(0.0, -s * 0.3, 0.0)))
		var mi := add_mesh(kit.commit(null, WorldPalette.ROCK), Transform3D(Basis(Vector3.UP, rng.randf() * TAU), pos), "Fragment%d" % i, true, group)
		mi.set_instance_shader_parameter("bob_amount", rng.randf_range(0.5, 1.6))
		mi.set_instance_shader_parameter("bob_phase", rng.randf() * TAU)
		if i % 4 == 0:
			var cl := CrystalFactory.cluster(rng, 4, s * 0.25, s * 0.3, s * 0.7, 0.6)
			add_mesh(cl.commit(null, WorldPalette.CRYSTAL), Transform3D(Basis(), pos + Vector3(0.0, s * 0.45, 0.0)), "", true, group)


## True when a prop at `pos` would sit between a framed viewpoint and the island.
func _blocks_viewpoint(pos: Vector3, clearance: float) -> bool:
	var vp := get_node_or_null("../Viewpoints")
	if vp == null:
		return false
	for marker in vp.get_children():
		var cam: Vector3 = (marker as Node3D).position
		var seg := Vector3(0.0, 0.0, -10.0) - cam
		var t := clampf((pos - cam).dot(seg) / seg.length_squared(), 0.0, 1.0)
		if pos.distance_to(cam + seg * t) < clearance:
			return true
	return false


# --- Grass and flowers -------------------------------------------------------------------------

func _build_vegetation() -> void:
	var group := add_group("Vegetation")
	var clumps: Array[ArrayMesh] = []
	for i in 3:
		clumps.append(SkyFactory.grass_clump(rng, 7, rng.randf_range(0.65, 0.9), 0.12).commit(null, WorldPalette.GRASS))
	var flowers: Array[ArrayMesh] = []
	for c in WorldPalette.FLOWER_COLORS:
		var fk := MeshKit.new()
		for k in 3:
			var off := Vector3(rng.randf_range(-0.25, 0.25), 0.0, rng.randf_range(-0.25, 0.25))
			fk.append(SkyFactory.flower(rng, c), Transform3D(Basis(Vector3.UP, rng.randf() * TAU), off))
		flowers.append(fk.commit(null, WorldPalette.FLOWER))
	var chunk := 32.0
	var grass_cells := {}
	var flower_cells := {}
	var spacing := 0.95
	var noise := FastNoiseLite.new()
	noise.seed = 5
	noise.frequency = 0.03
	var x := -165.0
	while x < 165.0:
		var z := -130.0
		while z < 130.0:
			var px := x + rng.randf_range(-0.5, 0.5) * spacing
			var pz := z + rng.randf_range(-0.5, 0.5) * spacing
			z += spacing
			if not shape.is_inside(px, pz, 0.012):
				continue
			var n := grid.normal(px, pz)
			if n.y < 0.8 or grid.path(px, pz) > 0.35 or _in_pond(Vector2(px, pz)) or _near_ramp(Vector2(px, pz), 0.5):
				continue
			if Vector2(px, pz).distance_to(PLAZA_CENTER) < PLAZA_RADIUS + 0.5:
				continue
			var density := 0.55 + 0.45 * noise.get_noise_2d(px, pz)
			if rng.randf() > density + 0.25:
				continue
			var y := grid.height(px, pz) - 0.08
			var key := Vector2i(int(floor(px / chunk)), int(floor(pz / chunk)))
			var up := Basis(Quaternion(Vector3.UP, n.lerp(Vector3.UP, 0.5).normalized()))
			var s := rng.randf_range(0.75, 1.3) * (0.85 + 0.3 * grid.meadow_at(px, pz))
			var xf := Transform3D(up * Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s * rng.randf_range(0.8, 1.2), s)), Vector3(px, y, pz))
			var flowery := grid.meadow_at(px, pz) > 0.62 and rng.randf() < 0.22
			var cells: Dictionary = flower_cells if flowery else grass_cells
			var variant := rng.randi() % (flowers.size() if flowery else clumps.size())
			var k2 := Vector3i(key.x, key.y, variant)
			if not cells.has(k2):
				cells[k2] = []
			cells[k2].append(xf)
		x += spacing
	var total := 0
	for k in grass_cells:
		total += grass_cells[k].size()
		_add_multimesh(clumps[k.z], grass_cells[k], "Grass", group, false, 100.0)
	for k in flower_cells:
		_add_multimesh(flowers[k.z], flower_cells[k], "Flowers", group, false, 90.0)
	print("[ShatteredReach] grass clumps: %d" % total)


func _add_multimesh(mesh: Mesh, xforms: Array, node_name: String, parent: Node3D, shadows: bool,
		visibility_end: float = 0.0) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = mesh
	mm.instance_count = xforms.size()
	for i in xforms.size():
		mm.set_instance_transform(i, xforms[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = node_name
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if visibility_end > 0.0:
		mmi.visibility_range_end = visibility_end
		mmi.visibility_range_end_margin = 10.0
	parent.add_child(mmi)
	return mmi


# --- Ambient effects ---------------------------------------------------------------------------

func _build_ambient_fx() -> void:
	var pollen := FxFactory.motes(260, Vector3(120.0, 6.0, 60.0), Color(1.0, 0.93, 0.7), 0.12, 0.05, 12.0)
	pollen.position = Vector3(10.0, 8.0, 60.0)
	add_child(pollen)
	var terrace := FxFactory.motes(120, Vector3(60.0, 6.0, 45.0), Color(0.8, 1.0, 0.95), 0.12, 0.06, 12.0)
	terrace.position = Vector3(-60.0, 20.0, -20.0)
	add_child(terrace)
