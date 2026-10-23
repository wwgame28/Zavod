class_name FreeCamera
extends Camera3D
## Temporary fly camera for exploring the world before the playable character exists.
## Mouse look (click to capture, RMB hold also works), WASD/arrows, E/Space up, Q/Ctrl down,
## Shift fast, Alt slow, wheel = speed, 1-9 = viewpoints, O = cinematic orbit.

signal viewpoint_changed(index: int, label: String)
signal speed_changed(speed: float)

@export var base_speed := 22.0
@export var mouse_sensitivity := 0.0024
@export var acceleration := 7.0
@export var orbit_center := Vector3(0.0, 0.0, -10.0)
@export var orbit_speed := 0.07
@export var orbit_min_radius := 120.0
@export var orbit_look_offset := 8.0
@export var viewpoint_root: NodePath

var speed_scale := 1.0
var orbiting := false
var _yaw := 0.0
var _pitch := 0.0
var _velocity := Vector3.ZERO
var _viewpoints: Array[Viewpoint] = []
var _tween: Tween
var _orbit_angle := 0.0
var _orbit_radius := 260.0
var _orbit_height := 60.0


func _ready() -> void:
	var root := get_node_or_null(viewpoint_root)
	if root:
		for child in root.get_children():
			if child is Viewpoint:
				_viewpoints.append(child)
	if not _viewpoints.is_empty():
		jump_to(0, false)
	else:
		_sync_angles()


func viewpoint_count() -> int:
	return _viewpoints.size()


func viewpoint_label(index: int) -> String:
	return _viewpoints[index].label if index < _viewpoints.size() else ""


func jump_to(index: int, smooth: bool = true) -> void:
	if index < 0 or index >= _viewpoints.size():
		return
	orbiting = false
	_velocity = Vector3.ZERO
	var vp := _viewpoints[index]
	var goal := vp.global_transform
	if _tween:
		_tween.kill()
	if smooth:
		var from := global_transform
		_tween = create_tween()
		_tween.tween_method(func(t: float) -> void:
			var q := from.basis.get_rotation_quaternion().slerp(goal.basis.get_rotation_quaternion(), t)
			global_transform = Transform3D(Basis(q), from.origin.lerp(goal.origin, t))
			, 0.0, 1.0, 1.6).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		_tween.finished.connect(_sync_angles)
	else:
		global_transform = Transform3D(goal.basis.orthonormalized(), goal.origin)
		_sync_angles()
	viewpoint_changed.emit(index, vp.label)


func _sync_angles() -> void:
	var fwd := -global_transform.basis.z
	_yaw = atan2(-fwd.x, -fwd.z)
	_pitch = asin(clampf(fwd.y, -1.0, 1.0))
	_apply_rotation()


func _apply_rotation() -> void:
	basis = Basis.from_euler(Vector3(_pitch, _yaw, 0.0))


func _transitioning() -> bool:
	return _tween != null and _tween.is_running()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			_set_speed_scale(speed_scale * 1.2)
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_set_speed_scale(speed_scale / 1.2)
	elif event is InputEventMouseMotion:
		var looking := Input.mouse_mode == Input.MOUSE_MODE_CAPTURED or Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT)
		if looking and not _transitioning():
			if orbiting:
				orbiting = false
			var mm := event as InputEventMouseMotion
			_yaw -= mm.relative.x * mouse_sensitivity
			_pitch = clampf(_pitch - mm.relative.y * mouse_sensitivity, -1.55, 1.55)
			_apply_rotation()
	elif event is InputEventKey and event.pressed and not event.echo:
		var key := (event as InputEventKey).keycode
		if key == KEY_ESCAPE:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		elif key >= KEY_1 and key <= KEY_9:
			jump_to(key - KEY_1)
	if event.is_action_pressed("toggle_orbit"):
		_toggle_orbit()


func _set_speed_scale(value: float) -> void:
	speed_scale = clampf(value, 0.05, 40.0)
	speed_changed.emit(base_speed * speed_scale)


func _toggle_orbit() -> void:
	orbiting = not orbiting
	if orbiting:
		if _tween:
			_tween.kill()
		var flat := Vector2(global_position.x - orbit_center.x, global_position.z - orbit_center.z)
		_orbit_radius = clampf(flat.length(), orbit_min_radius, 900.0)
		_orbit_angle = atan2(flat.y, flat.x)
		_orbit_height = global_position.y


func _process(delta: float) -> void:
	if orbiting:
		_orbit_angle += orbit_speed * delta
		global_position = orbit_center + Vector3(cos(_orbit_angle) * _orbit_radius, _orbit_height - orbit_center.y, sin(_orbit_angle) * _orbit_radius)
		look_at(orbit_center + Vector3(0.0, orbit_look_offset, 0.0), Vector3.UP)
		_sync_angles()
		return
	if _transitioning():
		return
	var input := Vector3.ZERO
	input.x = Input.get_axis("move_left", "move_right")
	input.z = Input.get_axis("move_forward", "move_back")
	input.y = Input.get_axis("move_down", "move_up")
	var speed := base_speed * speed_scale
	if Input.is_action_pressed("sprint"):
		speed *= 4.0
	if Input.is_action_pressed("move_slow"):
		speed *= 0.25
	var wish := global_transform.basis * Vector3(input.x, 0.0, input.z)
	wish.y += input.y
	if wish.length_squared() > 1.0:
		wish = wish.normalized()
	_velocity = _velocity.lerp(wish * speed, 1.0 - exp(-acceleration * delta))
	global_position += _velocity * delta
