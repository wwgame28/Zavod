class_name PlayerController
extends CharacterBody3D
## Third-person character motor: camera-relative movement with acceleration, sprint/walk,
## buffered jumps with coyote time and variable height, step-up over low ledges, and respawn
## at the last safe ground position after falling off the islands.
## The visual is rendered top-level and interpolated between physics ticks for smooth motion.

signal jumped
signal landed(impact: float)
signal respawned

@export var camera_path: NodePath
@export var run_speed := 5.8
@export var sprint_speed := 8.6
@export var walk_speed := 2.2
@export var ground_accel := 40.0
@export var ground_decel := 34.0
@export var air_accel := 9.0
@export var turn_speed := 12.0
@export var gravity := 24.0
@export var fall_gravity_scale := 1.45
@export var jump_height := 1.25
@export var coyote_time := 0.12
@export var jump_buffer_time := 0.13
@export var step_height := 0.4
@export var kill_height := -140.0
@export var input_enabled := true

@onready var visual: Node3D = $Visual
@onready var hero: Hero = $Visual/Hero

var facing_yaw := 0.0
var horizontal_speed := 0.0

var _camera: ThirdPersonCamera
var _prev_pos := Vector3.ZERO
var _curr_pos := Vector3.ZERO
var _coyote := 0.0
var _buffer := 0.0
var _was_on_floor := true
var _safe_pos := Vector3.ZERO
var _safe_time := 0.0
var _lean := 0.0
var _anim_player: AnimationPlayer


func _ready() -> void:
	floor_max_angle = deg_to_rad(48.0)
	floor_snap_length = 0.45
	floor_constant_speed = true
	safe_margin = 0.01
	visual.top_level = true
	_camera = get_node_or_null(camera_path) as ThirdPersonCamera
	facing_yaw = rotation.y
	rotation = Vector3.ZERO
	reset_motion_state()


## Call after teleporting the body so interpolation and safe position restart from here.
func reset_motion_state() -> void:
	velocity = Vector3.ZERO
	_prev_pos = global_position
	_curr_pos = global_position
	_safe_pos = global_position
	visual.global_position = global_position
	visual.rotation = Vector3(0.0, facing_yaw, 0.0)


func teleport(pos: Vector3, yaw: float = NAN) -> void:
	global_position = pos
	if not is_nan(yaw):
		facing_yaw = yaw
	reset_motion_state()


## Interpolated position of the visual (what the camera should follow).
func visual_position() -> Vector3:
	return visual.global_position


func _physics_process(delta: float) -> void:
	_prev_pos = _curr_pos
	var input := Vector2.ZERO
	if input_enabled:
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var cam_basis := _camera.yaw_basis() if _camera else Basis()
	var forward := cam_basis * Vector3.FORWARD
	var right := cam_basis * Vector3.RIGHT
	var dir := forward * -input.y + right * input.x
	var amount := minf(dir.length(), 1.0)
	if amount > 0.0:
		dir = dir / dir.length()
	var top_speed := run_speed
	if input_enabled and Input.is_action_pressed("sprint"):
		top_speed = sprint_speed
	elif input_enabled and Input.is_action_pressed("move_slow"):
		top_speed = walk_speed
	var on_floor := is_on_floor()
	var desired := Vector2(dir.x, dir.z) * top_speed * amount
	var hvel := Vector2(velocity.x, velocity.z)
	var accel := air_accel
	if on_floor:
		accel = ground_accel if desired.length() >= hvel.length() else ground_decel
	hvel = hvel.move_toward(desired, accel * delta)

	if on_floor:
		_coyote = coyote_time
	else:
		_coyote -= delta
		var g := gravity * (fall_gravity_scale if velocity.y < 0.0 else 1.0)
		if velocity.y > 0.0 and not (input_enabled and Input.is_action_pressed("jump")):
			g *= 2.2   # released early: shorter hop
		velocity.y -= g * delta
	if input_enabled and Input.is_action_just_pressed("jump"):
		_buffer = jump_buffer_time
	else:
		_buffer -= delta
	if _buffer > 0.0 and _coyote > 0.0:
		velocity.y = sqrt(2.0 * gravity * jump_height)
		_buffer = 0.0
		_coyote = 0.0
		jumped.emit()

	velocity.x = hvel.x
	velocity.z = hvel.y
	var pre := velocity
	move_and_slide()
	if is_on_floor() and is_on_wall():
		_try_step_up(pre, delta)

	var floor_now := is_on_floor()
	if floor_now and not _was_on_floor:
		landed.emit(clampf(-pre.y / 14.0, 0.0, 1.0))
		if hero and hero.get_node_or_null("Animator"):
			(hero.get_node("Animator") as HeroAnimator).notify_landing(clampf(-pre.y / 14.0, 0.0, 1.0))
	_was_on_floor = floor_now

	horizontal_speed = Vector2(velocity.x, velocity.z).length()
	var yaw_before := facing_yaw
	if amount > 0.05:
		facing_yaw = lerp_angle(facing_yaw, atan2(dir.x, dir.z), 1.0 - exp(-turn_speed * delta))
	var turn_rate := wrapf(facing_yaw - yaw_before, -PI, PI) / maxf(delta, 1e-4)
	_lean = lerpf(_lean, clampf(-turn_rate * horizontal_speed * 0.012, -0.22, 0.22), 1.0 - exp(-8.0 * delta))

	if floor_now:
		_safe_time += delta
		if _safe_time > 0.4:
			_safe_pos = global_position
	else:
		_safe_time = 0.0
	if global_position.y < kill_height:
		teleport(_safe_pos + Vector3(0.0, 0.5, 0.0))
		respawned.emit()
	_curr_pos = global_position
	_drive_animation(floor_now)


## Lift over low ledges (tile edges, rubble) that stop the capsule while walking.
func _try_step_up(pre: Vector3, delta: float) -> void:
	var horizontal := Vector3(pre.x, 0.0, pre.z)
	if horizontal.length() < 0.5:
		return
	var motion := horizontal * delta
	var start := global_transform
	var up := Vector3.UP * step_height
	if test_move(start, up):
		return
	var raised := start.translated(up)
	if test_move(raised, motion):
		return
	var moved := raised.translated(motion)
	var col := KinematicCollision3D.new()
	if test_move(moved, Vector3.DOWN * (step_height + 0.05), col) and col.get_normal().y > cos(floor_max_angle):
		global_position = moved.origin + col.get_travel()
		velocity.x = pre.x
		velocity.z = pre.z
		apply_floor_snap()


func _process(_delta: float) -> void:
	var f := Engine.get_physics_interpolation_fraction()
	visual.global_position = _prev_pos.lerp(_curr_pos, f)
	visual.rotation = Vector3(0.0, facing_yaw, _lean)


func _drive_animation(on_floor: bool) -> void:
	if hero == null:
		return
	var anim := hero.get_node_or_null("Animator") as HeroAnimator
	if anim and hero.is_procedural:
		anim.set_motion(horizontal_speed, on_floor, velocity.y)
		return
	# Imported models: play clips whose names contain idle / walk / run / jump.
	if _anim_player == null:
		_anim_player = hero.find_child("AnimationPlayer", true, false) as AnimationPlayer
		if _anim_player == null:
			return
	var want := "idle"
	if not on_floor:
		want = "jump"
	elif horizontal_speed > 4.0:
		want = "run"
	elif horizontal_speed > 0.3:
		want = "walk"
	for clip in _anim_player.get_animation_list():
		if String(clip).to_lower().contains(want):
			if _anim_player.current_animation != clip:
				_anim_player.play(clip, 0.2)
			break
