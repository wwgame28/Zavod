@tool
class_name SkyIslands
extends ProceduralNode
## Distant floating islands, far massifs and the Sundered Halo - a colossal broken ring of the
## vanished civilization on the horizon. Gives the Reach depth, scale and mystery.

## [position, radius, seed, style]
const ISLANDS := [
	[Vector3(-430, 35, -360), 46.0, 101, "grove"],
	[Vector3(390, 65, -520), 60.0, 102, "ruin"],
	[Vector3(560, -40, 110), 36.0, 103, "crystal"],
	[Vector3(-650, 105, 150), 72.0, 104, "grove"],
	[Vector3(140, 150, -900), 95.0, 105, "temple"],
	[Vector3(-280, -70, 430), 24.0, 106, "rock"],
	[Vector3(300, 10, 420), 22.0, 107, "grove"],
	[Vector3(-170, 85, -640), 30.0, 112, "spire"],
	[Vector3(860, -20, 650), 58.0, 110, "grove"],
	[Vector3(-960, 20, -820), 130.0, 108, "massif"],
	[Vector3(1150, 90, -650), 150.0, 109, "massif"],
	[Vector3(-1250, 170, 520), 115.0, 111, "massif"],
	[Vector3(700, 230, -1600), 220.0, 113, "massif"],
	[Vector3(-520, 280, -1800), 260.0, 114, "massif"],
	[Vector3(1600, 140, 300), 180.0, 115, "massif"],
	[Vector3(-1700, 60, -300), 200.0, 116, "massif"],
]

var _tree_meshes: Array[ArrayMesh] = []
var _conifer_meshes: Array[ArrayMesh] = []


func _build() -> void:
	var greens := [WorldPalette.LEAF_GREEN, WorldPalette.LEAF_DEEP, WorldPalette.LEAF_LIME, WorldPalette.LEAF_BLOSSOM]
	for i in greens.size():
		var h := rng.randf_range(8.0, 12.0)
		_tree_meshes.append(WorldPalette.tree_mesh(TreeFactory.broadleaf(rng, h, h * 0.5, greens[i], WorldPalette.BARK_BROWN, 1, 3),
				WorldPalette.BLOSSOM if i == 3 else WorldPalette.FOLIAGE))
	for i in 2:
		var h := rng.randf_range(12.0, 18.0)
		_conifer_meshes.append(WorldPalette.tree_mesh(TreeFactory.conifer(rng, h, h * 0.28, WorldPalette.LEAF_PINE, WorldPalette.BARK_BROWN, 4)))
	for entry in ISLANDS:
		_build_island(entry[0], entry[1], entry[2], entry[3])
	_build_halo()


func _island_shape(radius: float, seed_value: int, style: String) -> IslandShape:
	var r := RandomNumberGenerator.new()
	r.seed = seed_value
	var s := IslandShape.new()
	s.noise_seed = seed_value
	s.radius = radius
	s.aspect = Vector2(r.randf_range(0.95, 1.25), r.randf_range(0.8, 1.0))
	s.coast_noise = r.randf_range(0.12, 0.2)
	s.base_height = 0.0
	s.hill_amp = radius * 0.035
	s.hill_scale = 1.6 / radius
	s.rim_drop = radius * 0.02
	s.underside_depth = radius * r.randf_range(0.95, 1.35)
	s.strata_bands = 5.0 + radius * 0.02
	var count := r.randi_range(1, 2)
	if style == "massif":
		count = 3
	elif style == "spire":
		s.underside_depth = radius * 2.4
	for i in count:
		var pr := radius * r.randf_range(0.3, 0.5) * (1.0 - 0.22 * i)
		var c := Vector2(r.randf_range(-0.35, 0.35), r.randf_range(-0.35, 0.35)) * radius * (1.0 - 0.3 * i)
		var ph := radius * r.randf_range(0.1, 0.22) * (1.0 + 0.7 * i) * (1.6 if style == "massif" else 1.0)
		s.plateaus.append({"c": c, "r": pr, "h": ph, "edge": pr * 0.22, "wobble": 0.12, "top_amp": radius * 0.01})
	s.setup()
	return s


func _build_island(pos: Vector3, radius: float, seed_value: int, style: String) -> void:
	var r := RandomNumberGenerator.new()
	r.seed = seed_value * 7 + 3
	var shape := _island_shape(radius, seed_value, style)
	var node := add_group("Island_%s_%d" % [style, seed_value])
	node.position = pos
	node.rotation.y = r.randf() * TAU
	var angular := clampi(int(radius * 1.6), 72, 220)
	var radial := clampi(int(radius * 0.35), 14, 40)
	var wall := clampi(int(radius * 0.25), 16, 30)
	var res := IslandBuilder.build(shape, angular, radial, wall)
	var kit: MeshKit = res["kit"]
	var terrain := add_mesh(kit.commit(null, WorldPalette.TERRAIN), Transform3D.IDENTITY, "Terrain", radius < 120.0, node)
	terrain.set_instance_shader_parameter("underside_depth", shape.tip_depth())

	# Trees on top.
	var tree_target := int(radius / 3.0)
	if style == "massif":
		tree_target = int(radius / 6.0)
	elif style == "rock":
		tree_target = 1
	var per_mesh := {}
	var attempts := 0
	var placed := 0
	while placed < tree_target and attempts < tree_target * 20:
		attempts += 1
		var a := r.randf() * TAU
		var d := sqrt(r.randf()) * 0.82
		var p := shape.coast_point(a) * d
		var n := shape.normal(p.x, p.y, 1.0)
		if n.y < 0.85:
			continue
		var conifer := style == "massif" or (style == "spire") or r.randf() < 0.2
		var mesh: ArrayMesh = _conifer_meshes[r.randi() % _conifer_meshes.size()] if conifer else _tree_meshes[r.randi() % 3]
		if style == "grove" and seed_value % 2 == 0 and r.randf() < 0.3:
			mesh = _tree_meshes[3]
		var s := r.randf_range(0.8, 1.3) * (1.5 if style == "massif" else 1.0)
		var xf := Transform3D(yaw_basis(r.randf() * TAU, s), Vector3(p.x, shape.height(p.x, p.y) - 0.4, p.y))
		if not per_mesh.has(mesh):
			per_mesh[mesh] = []
		per_mesh[mesh].append(xf)
		placed += 1
	for mesh in per_mesh:
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = per_mesh[mesh].size()
		for i in mm.instance_count:
			mm.set_instance_transform(i, per_mesh[mesh][i])
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if radius > 120.0 else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		node.add_child(mmi)

	# Ruins by style.
	var ruin := MeshKit.new()
	var top_c := Vector2.ZERO
	if not shape.plateaus.is_empty():
		top_c = shape.plateaus[0]["c"]
	var top_y := shape.height(top_c.x, top_c.y)
	match style:
		"ruin", "temple":
			var ring := 7 if style == "ruin" else 10
			var rr := radius * (0.18 if style == "ruin" else 0.14)
			for k in ring:
				var a := TAU * float(k) / float(ring)
				var p := top_c + Vector2(cos(a), sin(a)) * rr
				ruin.append(RuinFactory.column(r, r.randf_range(4.0, 10.0), 0.9, k % 3 == 1),
						Transform3D(Basis(), Vector3(p.x, shape.height(p.x, p.y) - 0.3, p.y)))
			ruin.append(RuinFactory.arch(r, 7.0, 8.0, 2.4, style == "ruin"), Transform3D(Basis(Vector3.UP, r.randf() * TAU), Vector3(top_c.x, top_y - 0.3, top_c.y) + Vector3(rr + 6.0, 0.0, 0.0)))
			if style == "temple":
				ruin.append(RuinFactory.tower(r, 5.0, 24.0), Transform3D(Basis(), Vector3(top_c.x, top_y - 0.5, top_c.y) - Vector3(0.0, 0.0, rr + 14.0)))
		"spire":
			ruin.append(RuinFactory.tower(r, 3.8, 16.0), Transform3D(Basis(), Vector3(top_c.x, top_y - 0.5, top_c.y)))
		"crystal":
			for k in 4:
				var a := r.randf() * TAU
				var p := top_c + Vector2(cos(a), sin(a)) * radius * r.randf_range(0.0, 0.3)
				var cl := CrystalFactory.cluster(r, 6, 2.0, 2.5, r.randf_range(6.0, 12.0), 0.6)
				add_mesh(cl.commit(null, WorldPalette.CRYSTAL), Transform3D(Basis(), Vector3(p.x, shape.height(p.x, p.y) - 0.5, p.y)), "", true, node)
	if not ruin.is_empty():
		add_mesh(ruin.commit(null, WorldPalette.RUIN), Transform3D.IDENTITY, "Ruins", true, node)

	# Underside spires and glowing crystal veins.
	var rock := MeshKit.new()
	var crystals := MeshKit.new()
	var spire_count := 3 + int(radius / 40.0)
	for i in spire_count:
		var frame := IslandBuilder.wall_frame(shape, r.randf() * TAU, r.randf_range(0.4, 0.85))
		var p: Vector3 = frame[0]
		rock.append(RockFactory.spire(r, radius * r.randf_range(0.25, 0.55), radius * r.randf_range(0.05, 0.1), WorldPalette.ROCK_UNDER, WorldPalette.ROCK_DEEP, 6),
				Transform3D(Basis(), p + Vector3(0.0, radius * 0.03, 0.0)))
	var crystal_count := 2 + int(radius / 50.0) + (4 if style == "crystal" else 0)
	for i in crystal_count:
		var frame := IslandBuilder.wall_frame(shape, r.randf() * TAU, r.randf_range(0.3, 0.8))
		var p: Vector3 = frame[0]
		var dir := (Vector3(frame[1]) + Vector3.DOWN * 0.5).normalized()
		var cl := CrystalFactory.cluster(r, 5, radius * 0.03, radius * 0.04, radius * r.randf_range(0.08, 0.14), 0.6)
		crystals.append(cl, Transform3D(basis_from_up(dir, r.randf() * TAU), p - dir * 0.5))
	add_mesh(rock.commit(null, WorldPalette.ROCK), Transform3D.IDENTITY, "Spires", false, node)
	add_mesh(crystals.commit(null, WorldPalette.CRYSTAL), Transform3D.IDENTITY, "Crystals", false, node)


## The Sundered Halo: a colossal ring of the vanished civilization, broken and adrift.
func _build_halo() -> void:
	var node := add_group("SunderedHalo")
	node.transform = Transform3D(Basis(Vector3.FORWARD, 0.28) * Basis(Vector3.RIGHT, 1.32), Vector3(-260.0, 460.0, -2700.0))
	var kit := MeshKit.new()
	var radius := 520.0
	var segments := 56
	var arc := TAU * radius / float(segments)
	var gaps := [[0.08, 0.16], [0.47, 0.52], [0.71, 0.8]]
	for k in segments:
		var f := float(k) / float(segments)
		var skip := false
		for g in gaps:
			if f > g[0] and f < g[1]:
				skip = true
		var a := TAU * f
		var basis := Basis(Vector3.UP, -a)
		var pos := Vector3(cos(a), 0.0, sin(a)) * radius
		if skip:
			# Drifting debris where the ring is sundered.
			if rng.randf() < 0.6:
				var drift := Vector3(cos(a), 0.0, sin(a)) * rng.randf_range(30.0, 120.0) + Vector3(0.0, rng.randf_range(-60.0, 60.0), 0.0)
				var tumble := Basis(Vector3(rng.randf(), rng.randf(), rng.randf()).normalized(), rng.randf_range(0.2, 1.2))
				RuinFactory.block(kit, rng, Transform3D(tumble * basis, pos + drift), Vector3(28.0, arc * 0.6, 22.0))
			continue
		RuinFactory.block(kit, rng, Transform3D(basis, pos), Vector3(52.0, 44.0, arc * 0.96))
		RuinFactory.block(kit, rng, Transform3D(basis, pos - Vector3(cos(a), 0.0, sin(a)) * 27.0), Vector3(5.0, 12.0, arc * 0.98), RuinFactory.rune_color())
		if k % 4 == 0:
			RuinFactory.block(kit, rng, Transform3D(basis, pos + Vector3(cos(a), 0.0, sin(a)) * 32.0), Vector3(20.0, 62.0, 20.0))
	add_mesh(kit.commit(null, WorldPalette.RUIN), Transform3D.IDENTITY, "Ring", false, node)
