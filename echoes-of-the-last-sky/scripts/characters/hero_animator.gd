class_name HeroAnimator
extends Node
## Procedural animation for the procedural rig (identity rest orientations): test poses, a living
## idle and speed-driven locomotion (walk -> run -> sprint cycles, jump/fall poses, landing squash).
## It validates skinning now and keeps the hero alive until authored clips arrive.
## Imported rigs are left untouched (they play their own clips).

## Foot contact during locomotion (side: 1 = left, -1 = right).
signal footstep(side: float)

enum Pose { A_POSE, IDLE, WALK_TEST, T_POSE }
const POSE_NAMES := ["A-pose (rest)", "Idle", "Walk test", "T-pose"]

@export var hero_path: NodePath = ^".."
@export var pose: Pose = Pose.IDLE
@export var blend_speed := 16.0

var motion_speed := 0.0
var grounded := true
var vertical_speed := 0.0

var _time := 0.0
var _phase := 0.0
var _landing := 0.0
var _air := 0.0
var _move := 0.0
var _hips_drop := 0.0
var _current := {}


func cycle_pose() -> String:
	pose = ((int(pose) + 1) % Pose.size()) as Pose
	return POSE_NAMES[pose]


## Fed by the player controller every physics tick.
func set_motion(speed: float, on_floor: bool, vy: float) -> void:
	motion_speed = speed
	grounded = on_floor
	vertical_speed = vy


func notify_landing(impact: float) -> void:
	_landing = maxf(_landing, impact)


func _process(delta: float) -> void:
	var hero := get_node_or_null(hero_path) as Hero
	if hero == null or hero.skeleton == null or not hero.is_procedural:
		return
	_time += delta
	var run := smoothstep(2.6, 6.0, motion_speed)
	var stride := lerpf(1.35, 2.3, run) + 0.4 * smoothstep(6.5, 8.6, motion_speed)
	var before := _phase
	_phase = fmod(_phase + delta * TAU * motion_speed / stride, TAU)
	if grounded and _move > 0.5 and pose == Pose.IDLE:
		for contact in [[PI * 0.5, 1.0], [PI * 1.5, -1.0]]:
			var c: float = contact[0]
			if (before < c and _phase >= c) or (before > _phase and (before < c or _phase >= c)):
				footstep.emit(contact[1])
	_landing = move_toward(_landing, 0.0, delta * 3.5)
	_air = move_toward(_air, 0.0 if grounded else 1.0, delta * 8.0)
	_move = move_toward(_move, smoothstep(0.15, 1.4, motion_speed) if grounded else 0.0, delta * 6.0)
	var target := _target_pose()
	var sk := hero.skeleton
	var k := 1.0 - exp(-blend_speed * delta)
	for bone in range(sk.get_bone_count()):
		var q: Quaternion = target.get(bone, Quaternion.IDENTITY)
		var cur: Quaternion = _current.get(bone, Quaternion.IDENTITY)
		cur = cur.slerp(q, k)
		_current[bone] = cur
		sk.set_bone_pose_rotation(bone, cur)
	var rest := sk.get_bone_rest(HeroRig.HIPS).origin
	sk.set_bone_pose_position(HeroRig.HIPS, rest + Vector3(0.0, _hips_drop, 0.0))


static func _arm_dir(side: float) -> Vector3:
	var s := HeroRig.joint(HeroRig.L_UPPER_ARM if side > 0.0 else HeroRig.R_UPPER_ARM)
	var e := HeroRig.joint(HeroRig.L_LOWER_ARM if side > 0.0 else HeroRig.R_LOWER_ARM)
	return (e - s).normalized()


static func _b(left_bone: int, side: float) -> int:
	return left_bone if side > 0.0 else HeroRig.mirror(left_bone)


func _target_pose() -> Dictionary:
	_hips_drop = 0.0
	match pose:
		Pose.A_POSE:
			return {}
		Pose.T_POSE:
			return {HeroRig.L_UPPER_ARM: Quaternion(Vector3.BACK, 0.785), HeroRig.R_UPPER_ARM: Quaternion(Vector3.BACK, -0.785)}
		Pose.WALK_TEST:
			return _walk_test_pose()
	var p := _idle_pose()
	if _move > 0.001:
		p = _blend(p, _locomotion_pose(), _move)
	if _air > 0.001:
		p = _blend(p, _air_pose(), _air)
	if _landing > 0.001:
		_hips_drop -= 0.11 * _landing
		for side in [1.0, -1.0]:
			p[_b(HeroRig.L_UPPER_LEG, side)] = Quaternion(Vector3.LEFT, 0.35 * _landing) * p.get(_b(HeroRig.L_UPPER_LEG, side), Quaternion.IDENTITY)
			p[_b(HeroRig.L_LOWER_LEG, side)] = Quaternion(Vector3.RIGHT, 0.7 * _landing) * p.get(_b(HeroRig.L_LOWER_LEG, side), Quaternion.IDENTITY)
			p[_b(HeroRig.L_FOOT, side)] = Quaternion(Vector3.RIGHT, -0.35 * _landing) * p.get(_b(HeroRig.L_FOOT, side), Quaternion.IDENTITY)
		p[HeroRig.SPINE] = Quaternion(Vector3.RIGHT, 0.18 * _landing) * p.get(HeroRig.SPINE, Quaternion.IDENTITY)
	return p


static func _blend(a: Dictionary, b: Dictionary, w: float) -> Dictionary:
	var out := a.duplicate()
	for bone in b:
		var qa: Quaternion = a.get(bone, Quaternion.IDENTITY)
		out[bone] = qa.slerp(b[bone], w)
	for bone in a:
		if not b.has(bone):
			out[bone] = (a[bone] as Quaternion).slerp(Quaternion.IDENTITY, w)
	return out


func _arms(p: Dictionary, down: float, swing: Array, bend: Array, twist: float) -> void:
	for i in 2:
		var side := 1.0 if i == 0 else -1.0
		var dir := _arm_dir(side)
		var bend_axis := dir.cross(Vector3.BACK).normalized()
		p[_b(HeroRig.L_UPPER_ARM, side)] = Quaternion(Vector3.RIGHT, swing[i]) * Quaternion(Vector3.BACK, -down * side) * Quaternion(dir, twist * side)
		p[_b(HeroRig.L_LOWER_ARM, side)] = Quaternion(bend_axis, bend[i])
		p[_b(HeroRig.L_HAND, side)] = Quaternion(bend_axis, 0.14)


func _idle_pose() -> Dictionary:
	var t := _time
	var breath := sin(t * 1.7)
	var p := {}
	p[HeroRig.SPINE] = Quaternion(Vector3.RIGHT, 0.012 * breath)
	p[HeroRig.UPPER_CHEST] = Quaternion(Vector3.RIGHT, -0.02 * breath)
	p[HeroRig.NECK] = Quaternion(Vector3.RIGHT, 0.015 * breath)
	p[HeroRig.HEAD] = Quaternion(Vector3.UP, 0.06 * sin(t * 0.37)) * Quaternion(Vector3.BACK, 0.035 * sin(t * 0.53))
	p[HeroRig.HIPS] = Quaternion(Vector3.BACK, 0.02 * sin(t * 0.8))
	var bend := 0.28 + 0.03 * breath
	_arms(p, 0.64, [0.0, 0.0], [bend, bend], 0.25)
	p[HeroRig.L_UPPER_LEG] = Quaternion(Vector3.BACK, 0.03) * Quaternion(Vector3.LEFT, 0.04)
	p[HeroRig.L_LOWER_LEG] = Quaternion(Vector3.RIGHT, 0.08)
	p[HeroRig.R_UPPER_LEG] = Quaternion(Vector3.BACK, 0.015)
	return p


func _locomotion_pose() -> Dictionary:
	var run := smoothstep(2.6, 6.0, motion_speed)
	var sprint := smoothstep(6.5, 8.6, motion_speed)
	var s := sin(_phase)
	var c := cos(_phase)
	var leg_amp := lerpf(0.36, 0.7, run) + 0.08 * sprint
	var knee_amp := lerpf(0.6, 1.4, run)
	var arm_amp := lerpf(0.32, 0.7, run) + 0.1 * sprint
	var lean := lerpf(0.04, 0.17, run) + 0.06 * sprint
	var p := {}
	for side in [1.0, -1.0]:
		var leg: float = leg_amp * s * side
		var swing_phase := maxf(0.0, c * side)
		var knee := 0.1 + 0.12 * run + knee_amp * swing_phase * swing_phase
		p[_b(HeroRig.L_UPPER_LEG, side)] = Quaternion(Vector3.LEFT, leg)
		p[_b(HeroRig.L_LOWER_LEG, side)] = Quaternion(Vector3.RIGHT, knee)
		p[_b(HeroRig.L_FOOT, side)] = Quaternion(Vector3.RIGHT, clampf((leg - knee) * 0.7 + 0.1, -0.7, 0.5))
	_arms(p, lerpf(0.6, 0.5, run), [arm_amp * s, -arm_amp * s],
			[lerpf(0.32, 1.25, run) + 0.15 * maxf(0.0, -s), lerpf(0.32, 1.25, run) + 0.15 * maxf(0.0, s)], 0.2)
	p[HeroRig.HIPS] = Quaternion(Vector3.UP, -0.09 * s * (0.6 + 0.4 * run))
	p[HeroRig.SPINE] = Quaternion(Vector3.RIGHT, lean)
	p[HeroRig.UPPER_CHEST] = Quaternion(Vector3.UP, 0.13 * s * (0.6 + 0.4 * run))
	p[HeroRig.HEAD] = Quaternion(Vector3.RIGHT, -lean * 0.7) * Quaternion(Vector3.UP, -0.05 * s)
	_hips_drop += -lerpf(0.018, 0.05, run) * s * s * _move + lerpf(0.0, 0.025, run) * (1.0 - s * s) * _move
	return p


func _air_pose() -> Dictionary:
	var rising := smoothstep(-2.0, 2.0, vertical_speed)
	var p := {}
	p[HeroRig.L_UPPER_LEG] = Quaternion(Vector3.LEFT, lerpf(0.3, 0.6, rising))
	p[HeroRig.L_LOWER_LEG] = Quaternion(Vector3.RIGHT, lerpf(0.45, 1.05, rising))
	p[HeroRig.L_FOOT] = Quaternion(Vector3.RIGHT, -0.25)
	p[HeroRig.R_UPPER_LEG] = Quaternion(Vector3.LEFT, lerpf(-0.12, 0.05, rising))
	p[HeroRig.R_LOWER_LEG] = Quaternion(Vector3.RIGHT, lerpf(0.35, 0.65, rising))
	p[HeroRig.R_FOOT] = Quaternion(Vector3.RIGHT, 0.15)
	p[HeroRig.SPINE] = Quaternion(Vector3.RIGHT, lerpf(0.02, 0.08, rising))
	_arms(p, lerpf(0.32, 0.45, rising), [-0.25, 0.3], [0.55, 0.45], 0.3)
	return p


func _walk_test_pose() -> Dictionary:
	var p := _idle_pose()
	_arms(p, 0.64, [0.45, -0.45], [0.53, 0.53], 0.25)
	p[HeroRig.L_UPPER_LEG] = Quaternion(Vector3.LEFT, 0.42)
	p[HeroRig.L_LOWER_LEG] = Quaternion(Vector3.RIGHT, 0.32)
	p[HeroRig.L_FOOT] = Quaternion(Vector3.RIGHT, -0.12)
	p[HeroRig.R_UPPER_LEG] = Quaternion(Vector3.LEFT, -0.32)
	p[HeroRig.R_LOWER_LEG] = Quaternion(Vector3.RIGHT, 0.55)
	p[HeroRig.R_FOOT] = Quaternion(Vector3.RIGHT, 0.25)
	p[HeroRig.SPINE] = Quaternion(Vector3.UP, -0.08) * Quaternion(Vector3.RIGHT, 0.04)
	return p
