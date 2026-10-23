extends Node
## Scripted demo reel of the current build: world fly-through, the hero running, sprinting and
## jumping across the meadow, climbing to the temple, and a fall from the broken bridge with respawn.
## Record with Godot's Movie Maker:
##   godot --path . --write-movie reel.avi --fixed-fps 24 --resolution 1280x720 -- --demo-reel

var main: Node
var player: PlayerController
var tpc: ThirdPersonCamera
var cam: FreeCamera
var hud: WorldHud


func _ready() -> void:
	if "--demo-reel" in OS.get_cmdline_user_args():
		_run()


func _wait(seconds: float) -> void:
	var t := 0.0
	while t < seconds:
		await get_tree().process_frame
		t += get_process_delta_time()


## Smooth camera move through [position, look target] keys over `seconds`.
func _fly(keys: Array, seconds: float) -> void:
	main.call("set_free_camera", true)
	hud.set_cinematic(true)
	var t := 0.0
	while t < seconds:
		var f := smoothstep(0.0, 1.0, t / seconds)
		var seg := minf(f * float(keys.size() - 1), float(keys.size() - 1) - 0.0001)
		var i := int(seg)
		var k := seg - float(i)
		var pos := _catmull(keys, i, k, 0)
		var look := _catmull(keys, i, k, 1)
		cam.global_transform = Transform3D(Basis.looking_at(look - pos, Vector3.UP), pos)
		await get_tree().process_frame
		t += get_process_delta_time()


static func _catmull(keys: Array, i: int, t: float, slot: int) -> Vector3:
	var p0: Vector3 = keys[maxi(i - 1, 0)][slot]
	var p1: Vector3 = keys[i][slot]
	var p2: Vector3 = keys[mini(i + 1, keys.size() - 1)][slot]
	var p3: Vector3 = keys[mini(i + 2, keys.size() - 1)][slot]
	var t2 := t * t
	var t3 := t2 * t
	return 0.5 * ((2.0 * p1) + (-p0 + p2) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3)


## Eases the gameplay camera yaw/pitch toward targets while `seconds` pass.
func _orbit_to(yaw: float, pitch: float, seconds: float) -> void:
	var y0 := tpc.yaw
	var p0 := tpc.pitch
	var dy := wrapf(yaw - y0, -PI, PI)
	var t := 0.0
	while t < seconds:
		var f := smoothstep(0.0, 1.0, t / seconds)
		tpc.yaw = y0 + dy * f
		tpc.pitch = lerpf(p0, pitch, f)
		await get_tree().process_frame
		t += get_process_delta_time()


func _ground(x: float, z: float) -> float:
	var hit := player.get_world_3d().direct_space_state.intersect_ray(
			PhysicsRayQueryParameters3D.create(Vector3(x, 80, z), Vector3(x, -80, z), 1))
	return hit.position.y if not hit.is_empty() else 3.0


func _play_mode() -> void:
	main.call("set_free_camera", false)
	hud.set_cinematic(true)


func _run() -> void:
	main = get_parent()
	for i in 4:
		await get_tree().physics_frame
	player = main.get("player")
	tpc = main.get("player_camera")
	cam = main.get("free_camera")
	hud = main.get("hud")
	hud.set_cinematic(true)
	player.input_enabled = false

	# 1. The Shattered Reach.
	hud.toast("The Shattered Reach")
	await _fly([[Vector3(130, 60, 270), Vector3(-6, 10, -10)], [Vector3(80, 38, 215), Vector3(-10, 13, -10)],
			[Vector3(40, 24, 172), Vector3(-14, 15, -12)]], 6.5)
	await _fly([[Vector3(170, -40, 150), Vector3(0, -40, 0)], [Vector3(110, -110, 110), Vector3(0, -70, 0)],
			[Vector3(70, -150, 40), Vector3(0, -85, -10)]], 5.0)
	hud.toast("Sky Wanderer")
	await _fly([[Vector3(-22, 34, 150), Vector3(-22, 8, 80)], [Vector3(-22, 12, 118), Vector3(-22, 4, 88)],
			[Vector3(-22.0, player.global_position.y + 2.7, player.global_position.z + 4.6), player.global_position + Vector3(0, 1.4, -2)]], 4.0)

	# 2. Meadow run: footsteps, sprint streaks, jump and landing.
	_play_mode()
	tpc.recenter()
	await _wait(1.2)
	var heading := Vector3(0.8, 0.0, -0.6).normalized()
	player.move_override = heading
	await _orbit_to(atan2(heading.x, heading.z) + PI - 0.7, -0.22, 3.5)
	player.sprint_override = true
	await _orbit_to(atan2(heading.x, heading.z) + PI - 0.3, -0.25, 2.2)
	player.request_jump()
	await _wait(1.4)
	player.request_jump()
	await _wait(1.0)
	player.sprint_override = false
	player.move_override = Vector3.ZERO
	await _orbit_to(tpc.yaw + 0.9, -0.3, 2.0)

	# 3. Up the Grand Stair to the Temple of the First Echo.
	hud.toast("Temple of the First Echo")
	player.teleport(Vector3(-24.0, _ground(-24.0, 88.0) + 0.1, 88.0), PI)
	tpc.yaw = 0.0
	tpc.pitch = -0.18
	tpc.recenter()
	player.move_override = Vector3(0, 0, -1)
	await _wait(7.2)
	player.move_override = Vector3(-0.15, 0, -1).normalized()
	await _wait(1.6)
	player.move_override = Vector3.ZERO
	await _orbit_to(tpc.yaw + 1.6, -0.05, 5.0)

	# 4. The broken bridge: a fall into the sea of clouds, and the winds carry her back.
	hud.toast("The Broken Bridge")
	var dir := MainIsland.BRIDGE_DIR.normalized()
	var start := MainIsland.BRIDGE_START + dir * 28.0
	player.teleport(start + Vector3(0, 0.3, 0), atan2(dir.x, dir.z))
	tpc.yaw = atan2(dir.x, dir.z) + PI + 0.5
	tpc.pitch = -0.28
	tpc.recenter()
	await _wait(0.8)
	player.move_override = dir
	await _wait(3.6)
	player.move_override = Vector3.ZERO
	await _wait(3.8)
	await _orbit_to(tpc.yaw - 0.6, -0.25, 1.8)

	# 5. Closing shot.
	hud.toast("Echoes of the Last Sky")
	var p := player.global_position
	await _fly([[p + Vector3(2.5, 2.0, 4.0), p + Vector3(0, 1.4, 0)], [p + Vector3(30, 25, 60), Vector3(-20, 10, 30)],
			[Vector3(90, 110, 300), Vector3(-10, 10, -20)]], 6.5)
	await _wait(0.6)
	get_tree().quit()
