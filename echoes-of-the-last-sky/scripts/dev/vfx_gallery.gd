extends Node3D
## VFX gallery for tuning effects in the real world lighting. Fires every one-shot effect in a row
## in front of the camera every few seconds. With `-- --vfx-capture=<dir>` it slows time and saves
## frames at fixed effect ages (useful on slow software renderers).

const EFFECTS := ["step_grass", "step_dust", "step_stone", "step_water", "jump", "land", "respawn"]

@export var spacing := 1.7
@export var origin := Vector3(-57.0, 14.0, 22.0)

var _dir := ""


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--vfx-capture="):
			_dir = arg.substr(14)
	for i in 3:
		await get_tree().physics_frame
	if _dir != "":
		DirAccess.make_dir_recursive_absolute(_dir)
		Engine.time_scale = 0.03
		await _fire_and_capture([0.12, 0.35, 0.8])
		get_tree().quit()
		return
	while true:
		_fire()
		await get_tree().create_timer(3.0).timeout


func _ground(x: float, z: float) -> float:
	var hit := get_world_3d().direct_space_state.intersect_ray(
			PhysicsRayQueryParameters3D.create(Vector3(x, 60, z), Vector3(x, -60, z), 1))
	return hit.position.y if not hit.is_empty() else origin.y


func _fire() -> void:
	for i in EFFECTS.size():
		var x := origin.x + float(i) * spacing
		Vfx.play(EFFECTS[i], Vector3(x, _ground(x, origin.z), origin.z), 1.0)


func _fire_and_capture(ages: Array) -> void:
	_fire()
	var t0 := Time.get_ticks_msec()
	var game_time := 0.0
	for age in ages:
		while game_time < float(age):
			await get_tree().process_frame
			game_time += get_process_delta_time()
		var path := "%s/vfx_%.2fs.png" % [_dir, game_time]
		get_viewport().get_texture().get_image().save_png(path)
		print("[vfx-capture] %s" % path)
	print("[vfx-capture] done in %d ms" % (Time.get_ticks_msec() - t0))
