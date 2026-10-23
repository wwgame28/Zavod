@tool
class_name HeroRig
extends RefCounted
## Humanoid skeleton of the procedural hero. Bone names follow Godot's SkeletonProfileHumanoid,
## so animations retargeted from other humanoid rigs (Mixamo, Tripo3D) map onto it.
## Rest pose is an A-pose with identity bone orientations; the character faces +Z (glTF convention).

enum {
	ROOT, HIPS, SPINE, CHEST, UPPER_CHEST, NECK, HEAD,
	L_SHOULDER, L_UPPER_ARM, L_LOWER_ARM, L_HAND,
	R_SHOULDER, R_UPPER_ARM, R_LOWER_ARM, R_HAND,
	L_UPPER_LEG, L_LOWER_LEG, L_FOOT, L_TOES,
	R_UPPER_LEG, R_LOWER_LEG, R_FOOT, R_TOES,
}

## [name, parent, global rest position]. Character's left side is +X.
const BONES := [
	["Root", -1, Vector3(0.0, 0.0, 0.0)],
	["Hips", ROOT, Vector3(0.0, 0.9, 0.0)],
	["Spine", HIPS, Vector3(0.0, 0.98, 0.0)],
	["Chest", SPINE, Vector3(0.0, 1.1, 0.0)],
	["UpperChest", CHEST, Vector3(0.0, 1.22, 0.0)],
	["Neck", UPPER_CHEST, Vector3(0.0, 1.385, -0.006)],
	["Head", NECK, Vector3(0.0, 1.455, 0.0)],
	["LeftShoulder", UPPER_CHEST, Vector3(0.03, 1.34, 0.0)],
	["LeftUpperArm", L_SHOULDER, Vector3(0.165, 1.355, 0.0)],
	["LeftLowerArm", L_UPPER_ARM, Vector3(0.349, 1.171, 0.0)],
	["LeftHand", L_LOWER_ARM, Vector3(0.515, 1.005, 0.0)],
	["RightShoulder", UPPER_CHEST, Vector3(-0.03, 1.34, 0.0)],
	["RightUpperArm", R_SHOULDER, Vector3(-0.165, 1.355, 0.0)],
	["RightLowerArm", R_UPPER_ARM, Vector3(-0.349, 1.171, 0.0)],
	["RightHand", R_LOWER_ARM, Vector3(-0.515, 1.005, 0.0)],
	["LeftUpperLeg", HIPS, Vector3(0.085, 0.86, 0.0)],
	["LeftLowerLeg", L_UPPER_LEG, Vector3(0.09, 0.47, 0.005)],
	["LeftFoot", L_LOWER_LEG, Vector3(0.095, 0.075, -0.01)],
	["LeftToes", L_FOOT, Vector3(0.095, 0.02, 0.1)],
	["RightUpperLeg", HIPS, Vector3(-0.085, 0.86, 0.0)],
	["RightLowerLeg", R_UPPER_LEG, Vector3(-0.09, 0.47, 0.005)],
	["RightFoot", R_LOWER_LEG, Vector3(-0.095, 0.075, -0.01)],
	["RightToes", R_FOOT, Vector3(-0.095, 0.02, 0.1)],
]

## Cranium centre (face/hair are authored around it) and overall height.
const HEAD_CENTER := Vector3(0.0, 1.548, 0.012)
const HEIGHT := 1.68


static func joint(bone: int) -> Vector3:
	return BONES[bone][2]


## Mirrors a left-side bone index to the right side (and vice versa); others unchanged.
static func mirror(bone: int) -> int:
	if bone >= L_SHOULDER and bone <= L_HAND:
		return bone + 4
	if bone >= R_SHOULDER and bone <= R_HAND:
		return bone - 4
	if bone >= L_UPPER_LEG and bone <= L_TOES:
		return bone + 4
	if bone >= R_UPPER_LEG and bone <= R_TOES:
		return bone - 4
	return bone


static func build_skeleton() -> Skeleton3D:
	var sk := Skeleton3D.new()
	sk.name = "Skeleton3D"
	for b in BONES:
		sk.add_bone(b[0])
	for i in BONES.size():
		var parent: int = BONES[i][1]
		sk.set_bone_parent(i, parent)
		var offset: Vector3 = BONES[i][2] - (BONES[parent][2] if parent >= 0 else Vector3.ZERO)
		sk.set_bone_rest(i, Transform3D(Basis(), offset))
	sk.reset_bone_poses()
	return sk
