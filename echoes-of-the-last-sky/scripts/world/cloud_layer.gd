@tool
class_name CloudLayer
extends ProceduralNode
## The sea of clouds under the islands, cumulus towers rising from it and soft wisps drifting
## between the islands.

@export var sea_level := -215.0
@export var sea_radius := 7500.0
@export var tower_count := 22
@export var wisp_count := 42


func _build() -> void:
	var sea := SkyFactory.cloud_sea_grid(sea_radius, 256, 200)
	var sea_mesh := sea.commit(null, WorldPalette.CLOUD_SEA)
	sea_mesh.custom_aabb = AABB(Vector3(-sea_radius, -60.0, -sea_radius), Vector3(sea_radius * 2.0, 120.0, sea_radius * 2.0))
	add_mesh(sea_mesh, Transform3D(Basis(), Vector3(0.0, sea_level, 0.0)), "CloudSea", false)

	var variants: Array[ArrayMesh] = []
	for i in 4:
		variants.append(SkyFactory.cumulus(rng, 1.0, 1.0, 2).commit(null, WorldPalette.CLOUD_PUFF))
	var towers := add_group("CumulusTowers")
	for i in tower_count:
		var a := TAU * float(i) / float(tower_count) + rng.randf_range(-0.12, 0.12)
		var d := rng.randf_range(520.0, 3600.0)
		var w := rng.randf_range(220.0, 700.0) * (0.6 + d / 3600.0)
		var h := w * rng.randf_range(0.55, 0.95)
		var xf := Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(w, h, w * rng.randf_range(0.7, 1.0))),
				Vector3(cos(a) * d, sea_level - h * 0.12, sin(a) * d))
		add_mesh(variants[i % variants.size()], xf, "Cumulus%d" % i, false, towers)

	var quad := QuadMesh.new()
	quad.size = Vector2.ONE
	quad.material = WorldPalette.WISP
	var wisps := add_group("Wisps")
	for i in wisp_count:
		var a := rng.randf() * TAU
		var d := rng.randf_range(170.0, 950.0)
		var w := rng.randf_range(70.0, 200.0)
		var pos := Vector3(cos(a) * d, rng.randf_range(-130.0, 50.0), sin(a) * d)
		var mi := add_mesh(quad, Transform3D(Basis().scaled(Vector3(w, w * rng.randf_range(0.25, 0.4), 1.0)), pos), "Wisp%d" % i, false, wisps)
		mi.set_instance_shader_parameter("seed", rng.randf() * 10.0)
