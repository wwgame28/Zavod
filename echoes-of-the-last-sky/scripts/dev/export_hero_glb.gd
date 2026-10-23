extends SceneTree
## Exports the procedural hero (mesh + skeleton) to glTF binary, e.g. for Blender/Mixamo or to
## test the imported-model path. Usage:
##   godot --headless --path . --script res://scripts/dev/export_hero_glb.gd -- <output.glb>


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out := args[0] if args.size() > 0 else "user://hero_procedural.glb"
	var root := Node3D.new()
	root.name = "Hero"
	var res := HeroBuilder.build()
	var sk: Skeleton3D = res["skeleton"]
	root.add_child(sk)
	sk.owner = root
	var mi := MeshInstance3D.new()
	mi.name = "Body"
	mi.mesh = res["mesh"]
	sk.add_child(mi)
	mi.owner = root
	mi.skeleton = NodePath("..")
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var err := doc.append_from_scene(root, state)
	if err == OK:
		err = doc.write_to_filesystem(state, out)
	print("[export] %s -> %s" % [out, error_string(err)])
	root.free()
	quit(0 if err == OK else 1)
