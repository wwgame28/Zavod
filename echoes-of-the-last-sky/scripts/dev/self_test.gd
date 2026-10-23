class_name SelfTest
extends Node
## Automated smoke test. Run with `-- --selftest`; prints PASS/FAIL lines and exits with code 0/1.
## Checks world generation, walkable collision (needed by the future character controller),
## viewpoints and free-camera input handling.

@export var camera_path: NodePath
@export var world_path: NodePath

var _failures := 0


func _ready() -> void:
	if "--selftest" in OS.get_cmdline_user_args():
		_run()


func _check(ok: bool, label: String) -> void:
	print("[selftest] %s  %s" % ["PASS" if ok else "FAIL", label])
	if not ok:
		_failures += 1


func _run() -> void:
	for i in 3:
		await get_tree().physics_frame
	var world := get_node(world_path)
	var island := world.get_node("MainIsland") as MainIsland
	_check(island.get_child_count() > 20, "main island generated (%d nodes)" % island.get_child_count())
	_check(world.get_node("SkyIslands").get_child_count() >= 16, "distant islands generated")
	_check(world.get_node("CloudLayer").get_child_count() >= 3, "cloud layer generated")

	# Walkable ground: rays must hit terrain collision close to the analytic surface height.
	var space := (get_viewport().world_3d as World3D).direct_space_state
	var probes := [Vector2(0, 70), Vector2(-30, 10), Vector2(38, -50), Vector2(80, 10), Vector2(-24, 60)]
	for p in probes:
		var q := PhysicsRayQueryParameters3D.create(Vector3(p.x, 200.0, p.y), Vector3(p.x, -300.0, p.y))
		var hit := space.intersect_ray(q)
		var expected := island.shape.height(p.x, p.y)
		var ok := not hit.is_empty() and absf(hit.position.y - expected) < 3.5
		_check(ok, "ground collision at %s (hit %s, surface %.1f)" % [p, str(hit.get("position", "none")), expected])
	var off := PhysicsRayQueryParameters3D.create(Vector3(400, 200, 400), Vector3(400, -300, 400))
	_check(space.intersect_ray(off).is_empty(), "no phantom collision outside the island")

	var cam := get_node(camera_path) as FreeCamera
	_check(cam.viewpoint_count() == 9, "nine viewpoints registered")
	cam.jump_to(4, false)
	var vp := world.get_node("Viewpoints").get_child(4) as Node3D
	_check(cam.global_position.distance_to(vp.global_position) < 0.01, "viewpoint jump places camera")
	var start := cam.global_position
	Input.action_press("move_forward")
	for i in 30:
		await get_tree().process_frame
	Input.action_release("move_forward")
	var moved := cam.global_position - start
	_check(moved.length() > 0.5 and moved.dot(-cam.global_transform.basis.z) > 0.0, "W moves camera forward (%.2f m)" % moved.length())
	print("[selftest] %s" % ("ALL PASSED" if _failures == 0 else "%d FAILED" % _failures))
	get_tree().quit(1 if _failures > 0 else 0)
