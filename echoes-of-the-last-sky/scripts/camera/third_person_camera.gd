class_name ThirdPersonCamera
extends Node3D
## Orbit camera behind the player: mouse/stick look with pitch limits, smoothed follow (vertical
## follow is softer so jumps do not jerk the view), smoothed zoom, and a sphere cast that pulls the
## camera in front of obstacles instantly and eases it back out when the view clears.

@export var target_path: NodePath
@export var height := 1.45
@export var distance := 4.6
@export var min_distance := 1.8
@export var max_distance := 10.0
@export var pitch_min_deg := -70.0
@export var pitch_max_deg := 32.0
@export var mouse_sensitivity := 0.0024
@export var stick_speed := 2.8
@export var invert_y := false
@export var follow_sharpness := 16.0
@export var vertical_sharpness := 8.0
@export var zoom_sharpness := 10.0
@export var collision_radius := 0.22
@export_flags_3d_physics var collision_mask := 1

@onready var camera: Camera3D = $Camera3D

var yaw := PI
var pitch := -0.32
var current_distance := 4.6
var _zoom := 4.6
var _focus := Vector3.ZERO
var _target: PlayerController
var _shape := SphereShape3D.new()


func _ready() -> void:
	top_level = true
	_target = get_node_or_null(target_path) as PlayerController
	_zoom = distance
	current_distance = distance
	_shape.radius = collision_radius
	if _target:
		yaw = _target.facing_yaw + PI
		_focus = _target.global_position + Vector3(0.0, height, 0.0)


func yaw_basis() -> Basis:
	return Basis(Vector3.UP, yaw)


## Snap behind the player (used after respawn / mode switches).
func recenter() -> void:
	if _target:
		yaw = _target.facing_yaw + PI
		_focus = _target.visual_position() + Vector3(0.0, height, 0.0)
	current_distance = _zoom


func _unhandled_input(event: InputEvent) -> void:
	if not camera.current:
		return
	if event is InputEventMouseButton and event.pressed:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		elif mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			distance = clampf(distance * 0.9, min_distance, max_distance)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			distance = clampf(distance * 1.1, min_distance, max_distance)
	elif event is InputEventMouseMotion:
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED or Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
			var rel := (event as InputEventMouseMotion).relative
			rotate_view(-rel.x * mouse_sensitivity, -rel.y * mouse_sensitivity * (-1.0 if invert_y else 1.0))
	elif event is InputEventKey and event.pressed and (event as InputEventKey).keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func rotate_view(d_yaw: float, d_pitch: float) -> void:
	yaw = wrapf(yaw + d_yaw, -PI, PI)
	pitch = clampf(pitch + d_pitch, deg_to_rad(pitch_min_deg), deg_to_rad(pitch_max_deg))


func _process(delta: float) -> void:
	if _target == null or not camera.current:
		return
	var stick := Input.get_vector("look_left", "look_right", "look_up", "look_down")
	if stick != Vector2.ZERO:
		rotate_view(-stick.x * stick_speed * delta, -stick.y * stick_speed * delta * (-1.0 if invert_y else 1.0))
	var goal := _target.visual_position() + Vector3(0.0, height, 0.0)
	var kh := 1.0 - exp(-follow_sharpness * delta)
	var kv := 1.0 - exp(-vertical_sharpness * delta)
	_focus = Vector3(lerpf(_focus.x, goal.x, kh), lerpf(_focus.y, goal.y, kv), lerpf(_focus.z, goal.z, kh))
	_zoom = lerpf(_zoom, distance, 1.0 - exp(-zoom_sharpness * delta))
	var rot := Basis.from_euler(Vector3(pitch, yaw, 0.0))
	var back := rot * Vector3.BACK
	var safe := _zoom * _cast_fraction(_focus, _focus + back * _zoom)
	if safe < current_distance:
		current_distance = safe
	else:
		current_distance = lerpf(current_distance, safe, 1.0 - exp(-5.0 * delta))
	global_position = _focus
	camera.global_transform = Transform3D(rot, _focus + back * current_distance)
	# Avoid looking through the hero when an obstacle pushes the camera into her.
	if _target.hero:
		_target.hero.visible = current_distance > 0.75


func _cast_fraction(from: Vector3, to: Vector3) -> float:
	var space := get_world_3d().direct_space_state
	var q := PhysicsShapeQueryParameters3D.new()
	q.shape = _shape
	q.transform = Transform3D(Basis(), from)
	q.motion = to - from
	q.collision_mask = collision_mask
	q.exclude = [_target.get_rid()]
	var res := space.cast_motion(q)
	return res[0] if res.size() > 0 else 1.0
