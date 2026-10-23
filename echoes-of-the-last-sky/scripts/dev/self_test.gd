class_name SelfTest
extends Node
## Automated smoke test. Run with `-- --selftest` (works with --headless); prints PASS/FAIL lines and
## exits with code 0/1. Covers world generation, walkable collision, the free camera and the
## playable hero: movement, jump, stairs, solid ruins, camera obstruction and fall respawn.

@export var camera_path: NodePath
@export var world_path: NodePath

var _failures := 0
var _main: Node
var _player: PlayerController
var _space: PhysicsDirectSpaceState3D


func _ready() -> void:
	if "--selftest" in OS.get_cmdline_user_args():
		_run()


func _check(ok: bool, label: String) -> void:
	print("[selftest] %s  %s" % ["PASS" if ok else "FAIL", label])
	if not ok:
		_failures += 1


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _ground_y(x: float, z: float) -> float:
	var hit := _space.intersect_ray(PhysicsRayQueryParameters3D.create(Vector3(x, 200.0, z), Vector3(x, -300.0, z), 1))
	return hit.position.y if not hit.is_empty() else -INF


func _run() -> void:
	await _frames(4)
	_main = get_parent()
	_space = (get_viewport().world_3d as World3D).direct_space_state
	var world := get_node(world_path)
	var island := world.get_node("MainIsland") as MainIsland
	_check(island.get_child_count() > 20, "main island generated (%d nodes)" % island.get_child_count())
	_check(world.get_node("SkyIslands").get_child_count() >= 16, "distant islands generated")
	_check(world.get_node("CloudLayer").get_child_count() >= 3, "cloud layer generated")
	for p in [Vector2(0, 70), Vector2(-30, 10), Vector2(38, -50), Vector2(80, 10), Vector2(-24, 60)]:
		var y := _ground_y(p.x, p.y)
		var expected := island.shape.height(p.x, p.y)
		_check(absf(y - expected) < 3.5, "ground collision at %s (hit %.2f, surface %.1f)" % [p, y, expected])
	_check(_ground_y(400, 400) == -INF, "no phantom collision outside the island")

	if _main.has_method("set_free_camera"):
		await _test_player()
		_main.call("set_free_camera", true)
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
	_check(moved.length() > 0.5 and moved.dot(-cam.global_transform.basis.z) > 0.0, "free camera flies forward (%.2f m)" % moved.length())
	print("[selftest] %s" % ("ALL PASSED" if _failures == 0 else "%d FAILED" % _failures))
	get_tree().quit(1 if _failures > 0 else 0)


## Holds `action` for `frames` physics ticks; returns the lowest clearance above the ground seen.
func _hold(action: String, frames: int) -> float:
	var worst := INF
	Input.action_press(action)
	for i in frames:
		await get_tree().physics_frame
		var p := _player.global_position
		var hit := _space.intersect_ray(PhysicsRayQueryParameters3D.create(p + Vector3(0, 1.2, 0), p - Vector3(0, 30, 0), 1))
		if not hit.is_empty():
			worst = minf(worst, p.y - hit.position.y)
	Input.action_release(action)
	return worst


func _test_player() -> void:
	_player = _main.get("player")
	var tpc := _main.get("player_camera") as ThirdPersonCamera
	await _frames(20)
	var p := _player.global_position
	_check(_player.is_on_floor() and absf(p.y - _ground_y(p.x, p.z)) < 0.3, "hero spawns standing on the ground (%s)" % str(p))
	_check(tpc.camera.current, "third-person camera is active")

	# Run forward along the camera direction.
	var start := _player.global_position
	var fwd := tpc.yaw_basis() * Vector3.FORWARD
	var clearance: float = await _hold("move_forward", 90)
	var moved := _player.global_position - start
	_check(moved.dot(fwd) > 6.0, "W runs forward relative to the camera (%.1f m)" % moved.dot(fwd))
	_check(clearance > -0.3, "never sinks into the ground (min clearance %.2f m)" % clearance)
	_check(_player.horizontal_speed > 0.0 or _player.is_on_floor(), "still grounded after running")
	var yaw_err := absf(wrapf(_player.facing_yaw - atan2(fwd.x, fwd.z), -PI, PI))
	_check(yaw_err < 0.15, "hero turns to face the movement (%.2f rad off)" % yaw_err)

	# Jump: rises about the configured height and lands again.
	await _frames(30)
	var base_y := _player.global_position.y
	Input.action_press("jump")
	var peak := base_y
	for i in 70:
		await get_tree().physics_frame
		peak = maxf(peak, _player.global_position.y)
		if i == 8:
			Input.action_release("jump")
	Input.action_press("jump")
	await _frames(1)
	Input.action_release("jump")
	await _frames(60)
	_check(peak - base_y > 0.4 and peak - base_y < 1.6, "jump height %.2f m" % (peak - base_y))
	_check(_player.is_on_floor(), "lands back on the ground")

	# Grand Stair: walk from the meadow up to the temple terrace.
	_player.teleport(Vector3(-24.0, _ground_y(-24.0, 86.0) + 0.1, 86.0), PI)
	tpc.yaw = 0.0
	await _frames(10)
	clearance = await _hold("move_forward", 600)
	p = _player.global_position
	_check(p.z < 45.0 and p.y > 12.5, "climbs the Grand Stair to the terrace (%s)" % str(p))
	_check(clearance > -0.3, "stays on the stair surface (min clearance %.2f m)" % clearance)

	# Solid ruins: the watchtower wall blocks the hero.
	_player.teleport(Vector3(66.0, _ground_y(66.0, 10.0) + 0.1, 10.0), PI * 0.5)
	tpc.yaw = -PI * 0.5
	await _frames(10)
	await _hold("move_forward", 240)
	p = _player.global_position
	_check(p.x < 76.0 and p.x > 68.0, "watchtower wall stops the hero (x %.1f)" % p.x)

	# Tree trunks are solid: walk straight at one from 3 m away.
	var trunks := get_node(world_path).get_node("MainIsland/TreeCollision")
	var trunk := trunks.get_child(trunks.get_child_count() / 2) as CollisionShape3D
	var tc := trunk.global_position
	var tr := (trunk.shape as CylinderShape3D).radius
	_player.teleport(Vector3(tc.x, _ground_y(tc.x, tc.z + 3.0) + 0.1, tc.z + 3.0), PI)
	tpc.yaw = 0.0
	await _frames(5)
	await _hold("move_forward", 120)
	var flat := Vector2(_player.global_position.x - tc.x, _player.global_position.z - tc.z).length()
	_check(flat > tr + 0.2, "tree trunk blocks the hero (%.2f m from centre, trunk r %.2f)" % [flat, tr])
	var spawn := MainIsland.SPAWN
	var nearest := INF
	for c in trunks.get_children():
		var cp := (c as Node3D).global_position
		nearest = minf(nearest, Vector2(cp.x - spawn.x, cp.z - spawn.y).length())
	_check(nearest > 7.0, "spawn area is clear of trees (nearest %.1f m)" % nearest)

	# Broken bridge: missing deck tiles must not trap the hero; she runs off the far end.
	var bdir := MainIsland.BRIDGE_DIR.normalized()
	_player.teleport(MainIsland.BRIDGE_START + bdir * 28.0 + Vector3(0, 0.3, 0), atan2(bdir.x, bdir.z))
	await _frames(10)
	_player.move_override = bdir
	var furthest := 0.0
	for i in 240:
		await get_tree().physics_frame
		furthest = maxf(furthest, (_player.global_position - MainIsland.BRIDGE_START).dot(bdir))
	_player.move_override = Vector3.ZERO
	_check(furthest > 46.0, "crosses the bridge deck past its holes (reached %.1f m)" % furthest)
	await _frames(200)

	# Pond: the hero wades instead of sinking to the bottom.
	var pond := MainIsland.POND_CENTER
	_player.teleport(Vector3(pond.x, MainIsland.WATER_LEVEL + 1.5, pond.y))
	await _frames(60)
	var depth := MainIsland.WATER_LEVEL - _player.global_position.y
	_check(depth > 0.2 and depth < 0.8 and _player.is_on_floor(), "wades knee-deep in the pond (%.2f m under the surface)" % depth)

	# Camera obstruction: wall behind the hero pulls the camera in.
	_player.teleport(Vector3(66.0, _ground_y(66.0, 10.0) + 0.1, 10.0), PI * 0.5)
	tpc.yaw = -PI * 0.5
	await _frames(5)
	await _hold("move_forward", 240)
	tpc.yaw = PI * 0.5
	tpc.rotate_view(0.0, 0.0)
	for i in 30:
		await get_tree().process_frame
	_check(tpc.current_distance < tpc.distance - 1.0, "camera moves in front of the wall (%.2f of %.2f m)" % [tpc.current_distance, tpc.distance])

	# Falling off the island respawns on safe ground.
	await _frames(30)
	var safe := _player.global_position
	_player.global_position = Vector3(0.0, 10.0, 175.0)
	var respawned := [false]
	_player.respawned.connect(func(): respawned[0] = true, CONNECT_ONE_SHOT)
	await _frames(260)
	p = _player.global_position
	_check(respawned[0] and p.distance_to(safe) < 3.0, "falling into the sky respawns at safe ground (%s)" % str(p))
	_main.call("set_free_camera", true)
	_check(not _player.input_enabled and (get_node(camera_path) as Camera3D).current, "V switches to the free camera")
	_main.call("set_free_camera", false)
	_check(_player.input_enabled and tpc.camera.current, "V switches back to the hero")
