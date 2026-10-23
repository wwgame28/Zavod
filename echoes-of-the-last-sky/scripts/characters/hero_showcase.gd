extends Node3D
## Character viewer inside the world: grounds the hero on the plaza, cycles test poses (P),
## toggles a turntable (T). Camera bookmarks frame the hero from all sides.
## Dev args: `--model=<res://...glb>` previews an imported model, `--pose=<0-3>` picks a pose.

@export var hero_path: NodePath
@export var animator_path: NodePath
@export var hud_path: NodePath
@export var turntable_speed := 0.5

var _turntable := false


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--model="):
			(get_node(hero_path) as Hero).model_scene = load(arg.substr(8))
	for i in 2:
		await get_tree().physics_frame
	var hero := get_node(hero_path) as Node3D
	var space := get_world_3d().direct_space_state
	var p := hero.global_position
	var hit := space.intersect_ray(PhysicsRayQueryParameters3D.create(p + Vector3(0, 3, 0), p - Vector3(0, 6, 0)))
	if not hit.is_empty():
		var dy: float = hit.position.y - hero.global_position.y
		hero.global_position.y = hit.position.y
		# Keep the camera bookmarks framed on the grounded hero.
		var vps := get_node_or_null("Viewpoints") as Node3D
		var cam := get_node_or_null("FreeCamera") as FreeCamera
		if vps:
			for m in vps.get_children():
				var vp := m as Viewpoint
				vp.global_position.y += dy
				vp.target = vp.target + Vector3(0.0, dy, 0.0)
		if cam:
			cam.orbit_center = hero.global_position
			cam.global_position.y += dy
	var anim := get_node_or_null(animator_path) as HeroAnimator
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--pose=") and anim:
			anim.pose = int(arg.substr(7)) as HeroAnimator.Pose


func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	var key := (event as InputEventKey).keycode
	if key == KEY_P:
		var anim := get_node(animator_path) as HeroAnimator
		var hud := get_node_or_null(hud_path) as WorldHud
		var label := anim.cycle_pose()
		if hud:
			hud.toast(label)
	elif key == KEY_T:
		_turntable = not _turntable


func _process(delta: float) -> void:
	if _turntable:
		(get_node(hero_path) as Node3D).rotate_y(turntable_speed * delta)
