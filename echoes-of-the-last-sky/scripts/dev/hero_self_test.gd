extends Node
## Character smoke test. Run the showcase with `-- --selftest`: validates the rig (humanoid bone
## names), skin data, proportions, grounding and that poses move the skeleton as expected.
## With `--model=<res://path.glb>` it checks the imported-model path instead.

@export var hero_path: NodePath

var _failures := 0


func _ready() -> void:
	if "--selftest" in OS.get_cmdline_user_args():
		_run()


func _check(ok: bool, label: String) -> void:
	print("[hero-test] %s  %s" % ["PASS" if ok else "FAIL", label])
	if not ok:
		_failures += 1


func _run() -> void:
	var hero := get_node(hero_path) as Hero
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--model="):
			hero.model_scene = load(arg.substr(8))
	for i in 6:
		await get_tree().physics_frame
	if hero.is_procedural:
		await _check_procedural(hero)
	else:
		_check_imported(hero)
	print("[hero-test] %s" % ("ALL PASSED" if _failures == 0 else "%d FAILED" % _failures))
	get_tree().quit(1 if _failures > 0 else 0)


func _check_procedural(hero: Hero) -> void:
	var sk := hero.skeleton
	_check(sk != null and sk.get_bone_count() == HeroRig.BONES.size(), "skeleton has %d bones" % HeroRig.BONES.size())
	var profile := SkeletonProfileHumanoid.new()
	var missing := []
	for i in profile.bone_size:
		if sk.find_bone(profile.get_bone_name(i)) < 0 and not String(profile.get_bone_name(i)).contains("Thumb") \
				and not String(profile.get_bone_name(i)).contains("Index") and not String(profile.get_bone_name(i)).contains("Middle") \
				and not String(profile.get_bone_name(i)).contains("Ring") and not String(profile.get_bone_name(i)).contains("Little") \
				and not String(profile.get_bone_name(i)).contains("Eye") and profile.get_bone_name(i) != &"Jaw":
			missing.append(profile.get_bone_name(i))
	_check(missing.is_empty(), "humanoid body bones present (missing: %s)" % str(missing))
	var mesh := hero.meshes[0].mesh as ArrayMesh
	_check(mesh.get_surface_count() == 4, "mesh surfaces: body, face, hair, crystal")
	var verts := 0
	var bad_weights := 0
	for s in mesh.get_surface_count():
		var arr := mesh.surface_get_arrays(s)
		var w: PackedFloat32Array = arr[Mesh.ARRAY_WEIGHTS]
		var b: PackedInt32Array = arr[Mesh.ARRAY_BONES]
		verts += (arr[Mesh.ARRAY_VERTEX] as PackedVector3Array).size()
		for v in range(0, w.size(), 4):
			var total := w[v] + w[v + 1] + w[v + 2] + w[v + 3]
			if absf(total - 1.0) > 0.01:
				bad_weights += 1
			for k in 4:
				if b[v + k] < 0 or b[v + k] >= sk.get_bone_count():
					bad_weights += 1
	_check(bad_weights == 0, "skin weights normalized, bone indices valid (%d vertices)" % verts)
	_check(verts < 60000, "geometry budget (%d vertices < 60k)" % verts)
	var box := mesh.get_aabb()
	_check(absf(box.end.y - HeroRig.HEIGHT) < 0.06 and box.position.y > -0.01 and box.position.y < 0.02,
			"height %.2f m, feet on the ground (min y %.3f)" % [box.end.y, box.position.y])
	_check(absf(box.position.x + box.end.x) < 0.05, "left/right balanced (%.3f)" % (box.position.x + box.end.x))
	var space := hero.get_world_3d().direct_space_state
	var p := hero.global_position
	var hit := space.intersect_ray(PhysicsRayQueryParameters3D.create(p + Vector3(0, 2, 0), p - Vector3(0, 4, 0), 0xFFFFFFFF))
	_check(not hit.is_empty() and absf(hit.position.y - p.y) < 0.05, "hero stands on the ground")
	# Poses must move the skeleton: in a T-pose the left hand is level with the shoulder.
	var anim := hero.get_node("Animator") as HeroAnimator
	anim.pose = HeroAnimator.Pose.T_POSE
	anim.blend_speed = 1000.0
	for i in 3:
		await get_tree().process_frame
	var hand := sk.get_bone_global_pose(HeroRig.L_HAND).origin
	var shoulder := sk.get_bone_global_pose(HeroRig.L_UPPER_ARM).origin
	_check(absf(hand.y - shoulder.y) < 0.03 and hand.x > shoulder.x + 0.3, "T-pose raises the arm (hand %s)" % str(hand))
	anim.pose = HeroAnimator.Pose.IDLE
	for i in 3:
		await get_tree().process_frame
	hand = sk.get_bone_global_pose(HeroRig.L_HAND).origin
	_check(hand.y < shoulder.y - 0.35 and absf(hand.x) < 0.35, "idle lowers the arms (hand %s)" % str(hand))


func _check_imported(hero: Hero) -> void:
	_check(hero.skeleton != null, "imported skeleton found")
	_check(not hero.meshes.is_empty(), "imported meshes found (%d)" % hero.meshes.size())
	var model := hero.get_node("Model") as Node3D
	var inv := model.global_transform.affine_inverse()
	var box := AABB()
	for i in hero.meshes.size():
		var mi := hero.meshes[i]
		var b: AABB = (inv * mi.global_transform) * mi.get_aabb()
		box = b if i == 0 else box.merge(b)
	_check(absf(box.size.y - hero.target_height) < 0.02 and absf(box.position.y) < 0.02,
			"scaled to %.2f m and grounded (min y %.3f)" % [box.size.y, box.position.y])
	var toon := true
	for mi in hero.meshes:
		for s in mi.mesh.get_surface_count():
			var m := mi.get_surface_override_material(s) as ShaderMaterial
			toon = toon and m != null and m.next_pass != null
	_check(toon, "imported materials converted to toon + outline")
