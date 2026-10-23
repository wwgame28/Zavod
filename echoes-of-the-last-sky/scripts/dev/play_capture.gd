extends Node
## Scripted gameplay screenshots for QA: `-- --play-capture=<dir>`. Drives the hero with simulated
## input and saves third-person frames (spawn, running, mid-jump, terrace, stairs view).


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--play-capture="):
			_run(arg.substr(15))


func _shot(dir: String, name: String) -> void:
	for i in 3:
		await get_tree().process_frame
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [dir, name])
	print("[play-capture] %s/%s.png" % [dir, name])


func _hold(action: String, frames: int) -> void:
	Input.action_press(action)
	for i in frames:
		await get_tree().physics_frame
	Input.action_release(action)


func _run(dir: String) -> void:
	DirAccess.make_dir_recursive_absolute(dir)
	var main := get_parent()
	for i in 8:
		await get_tree().physics_frame
	var player := main.get("player") as PlayerController
	var cam := main.get("player_camera") as ThirdPersonCamera
	var hud := main.get("hud") as WorldHud
	if hud:
		hud.set_overlay_visible(false)
	await _hold("move_forward", 4)
	for i in 20:
		await get_tree().physics_frame
	await _shot(dir, "01_spawn")
	Input.action_press("sprint")
	await _hold("move_forward", 50)
	Input.action_press("move_forward")
	await _shot(dir, "02_sprint")
	Input.action_release("move_forward")
	Input.action_release("sprint")
	for i in 40:
		await get_tree().physics_frame
	cam.rotate_view(-1.25, 0.15)
	for i in 10:
		await get_tree().process_frame
	Input.action_press("move_right")
	Input.action_press("jump")
	for i in 14:
		await get_tree().physics_frame
	await _shot(dir, "03_jump")
	Input.action_release("jump")
	Input.action_release("move_right")
	for i in 50:
		await get_tree().physics_frame
	player.teleport(Vector3(-24.0, 9.0, 56.0), PI)
	cam.yaw = 0.0
	cam.pitch = -0.2
	cam.recenter()
	await _hold("move_forward", 30)
	Input.action_press("move_forward")
	await _shot(dir, "04_grand_stair")
	Input.action_release("move_forward")
	player.teleport(Vector3(-34.0, 14.6, 30.0), PI)
	cam.recenter()
	cam.rotate_view(0.5, 0.05)
	for i in 30:
		await get_tree().physics_frame
	await _shot(dir, "05_temple")
	get_tree().quit()
