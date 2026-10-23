class_name HeroAnimator
extends Node
## Procedural poses for the procedural rig (identity rest orientations): validates skinning now and
## gives the hero a living idle until authored animations arrive. Imported rigs are left untouched.

enum Pose { A_POSE, IDLE, WALK_TEST, T_POSE }
const POSE_NAMES := ["A-pose (rest)", "Idle", "Walk test", "T-pose"]

@export var hero_path: NodePath = ^".."
@export var pose: Pose = Pose.IDLE
@export var blend_speed := 6.0

var _time := 0.0
var _current := {}


func cycle_pose() -> String:
	pose = ((int(pose) + 1) % Pose.size()) as Pose
	return POSE_NAMES[pose]


func _process(delta: float) -> void:
	var hero := get_node_or_null(hero_path) as Hero
	if hero == null or hero.skeleton == null or not hero.is_procedural:
		return
	_time += delta
	var target := _target_pose()
	var sk := hero.skeleton
	var k := 1.0 - exp(-blend_speed * delta)
	for bone in range(sk.get_bone_count()):
		var q: Quaternion = target.get(bone, Quaternion.IDENTITY)
		var cur: Quaternion = _current.get(bone, Quaternion.IDENTITY)
		cur = cur.slerp(q, k)
		_current[bone] = cur
		sk.set_bone_pose_rotation(bone, cur)


static func _arm_dir(side: float) -> Vector3:
	var s := HeroRig.joint(HeroRig.L_UPPER_ARM if side > 0.0 else HeroRig.R_UPPER_ARM)
	var e := HeroRig.joint(HeroRig.L_LOWER_ARM if side > 0.0 else HeroRig.R_LOWER_ARM)
	return (e - s).normalized()


func _target_pose() -> Dictionary:

	var t := _time
	var p := {}
	match pose:
		Pose.A_POSE:
			pass
		Pose.T_POSE:
			p[HeroRig.L_UPPER_ARM] = Quaternion(Vector3.BACK, 0.785)
			p[HeroRig.R_UPPER_ARM] = Quaternion(Vector3.BACK, -0.785)
		Pose.IDLE, Pose.WALK_TEST:
			var walk := pose == Pose.WALK_TEST
			var breath := sin(t * 1.7)
			p[HeroRig.SPINE] = Quaternion(Vector3.RIGHT, 0.012 * breath)
			p[HeroRig.UPPER_CHEST] = Quaternion(Vector3.RIGHT, -0.02 * breath)
			p[HeroRig.NECK] = Quaternion(Vector3.RIGHT, 0.015 * breath)
			p[HeroRig.HEAD] = Quaternion(Vector3.UP, 0.06 * sin(t * 0.37)) * Quaternion(Vector3.BACK, 0.035 * sin(t * 0.53))
			p[HeroRig.HIPS] = Quaternion(Vector3.BACK, 0.02 * sin(t * 0.8))
			for side in [1.0, -1.0]:
				var dir := _arm_dir(side)
				var bend_axis := dir.cross(Vector3.BACK).normalized()
				var down := Quaternion(Vector3.BACK, -0.64 * side)
				var swing := Quaternion(Vector3.RIGHT, 0.45 * side if walk else 0.0)
				p[HeroRig.L_UPPER_ARM if side > 0.0 else HeroRig.R_UPPER_ARM] = swing * down * Quaternion(dir, 0.25 * side)
				p[HeroRig.L_LOWER_ARM if side > 0.0 else HeroRig.R_LOWER_ARM] = Quaternion(bend_axis, 0.28 + 0.03 * breath + (0.25 if walk else 0.0))
				p[HeroRig.L_HAND if side > 0.0 else HeroRig.R_HAND] = Quaternion(bend_axis, 0.12)
			if walk:
				p[HeroRig.L_UPPER_LEG] = Quaternion(Vector3.LEFT, 0.42)
				p[HeroRig.L_LOWER_LEG] = Quaternion(Vector3.RIGHT, 0.32)
				p[HeroRig.L_FOOT] = Quaternion(Vector3.RIGHT, -0.12)
				p[HeroRig.R_UPPER_LEG] = Quaternion(Vector3.LEFT, -0.32)
				p[HeroRig.R_LOWER_LEG] = Quaternion(Vector3.RIGHT, 0.55)
				p[HeroRig.R_FOOT] = Quaternion(Vector3.RIGHT, 0.25)
				p[HeroRig.SPINE] = Quaternion(Vector3.UP, -0.08) * Quaternion(Vector3.RIGHT, 0.04)
			else:
				p[HeroRig.L_UPPER_LEG] = Quaternion(Vector3.BACK, 0.03) * Quaternion(Vector3.LEFT, 0.04)
				p[HeroRig.L_LOWER_LEG] = Quaternion(Vector3.RIGHT, 0.08)
				p[HeroRig.R_UPPER_LEG] = Quaternion(Vector3.BACK, 0.015)
	return p
