class_name CaptureTool
extends Node
## QA helper. Run with `-- --capture=<dir> [--views=1,4] [--frames=N] [--hud]` to render viewpoints to PNG
## and quit; prints frame timings so regressions are visible from the command line.

@export var camera_path: NodePath
@export var hud_path: NodePath


func _ready() -> void:
	var dir := ""
	var frames := 45
	var show_hud := false
	var views := PackedInt32Array()
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--capture="):
			dir = arg.substr(10)
		elif arg.begins_with("--frames="):
			frames = int(arg.substr(9))
		elif arg.begins_with("--views="):
			for v in arg.substr(8).split(","):
				views.push_back(int(v) - 1)
		elif arg == "--hud":
			show_hud = true
	if dir == "":
		return
	_run(dir, frames, show_hud, views)


func _run(dir: String, frames: int, show_hud: bool, views: PackedInt32Array) -> void:
	var cam := get_node(camera_path) as FreeCamera
	var hud := get_node_or_null(hud_path) as WorldHud
	if hud:
		hud.set_overlay_visible(show_hud)
	DirAccess.make_dir_recursive_absolute(dir)
	for i in cam.viewpoint_count():
		if not views.is_empty() and not views.has(i):
			continue
		cam.jump_to(i, false)
		var t0 := Time.get_ticks_usec()
		for f in frames:
			await get_tree().process_frame
		var ms := float(Time.get_ticks_usec() - t0) / 1000.0 / float(frames)
		var img := get_viewport().get_texture().get_image()
		var path := "%s/%02d_%s.png" % [dir, i + 1, cam.viewpoint_label(i).to_lower().replace(" ", "_")]
		img.save_png(path)
		var prims := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)
		var calls := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
		print("[capture] %s  (%.1f ms/frame, %d draw calls, %.2fM primitives)" % [path, ms, calls, prims / 1.0e6])
	get_tree().quit()
