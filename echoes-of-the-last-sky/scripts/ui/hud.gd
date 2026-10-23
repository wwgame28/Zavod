class_name WorldHud
extends CanvasLayer
## Minimal exploration overlay: title, controls (H to toggle) and viewpoint toasts.

@export var camera_path: NodePath
@export var subtitle := "The Shattered Reach  ·  world preview"
@export_multiline var extra_help := ""
## Scene opened with Tab (world preview <-> character viewer).
@export_file("*.tscn") var switch_scene := ""
@export var switch_label := ""

var _help: PanelContainer
var _toast: Label
var _speed: Label
var _toast_tween: Tween

const GOLD := Color(0.98, 0.86, 0.58)
const INK := Color(0.07, 0.08, 0.16, 0.62)


func _ready() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	var title := Label.new()
	title.text = "ECHOES OF THE LAST SKY"
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", GOLD)
	title.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	title.add_theme_constant_override("shadow_offset_y", 2)
	title.position = Vector2(28, 20)
	root.add_child(title)
	var sub := Label.new()
	sub.text = subtitle
	sub.add_theme_font_size_override("font_size", 14)
	sub.add_theme_color_override("font_color", Color(1, 1, 1, 0.85))
	sub.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.5))
	sub.position = Vector2(30, 52)
	root.add_child(sub)

	_help = PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = INK
	style.border_color = Color(GOLD, 0.5)
	style.set_border_width_all(1)
	style.set_corner_radius_all(10)
	style.content_margin_left = 16
	style.content_margin_right = 16
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	_help.add_theme_stylebox_override("panel", style)
	_help.anchor_top = 1.0
	_help.anchor_bottom = 1.0
	_help.offset_left = 24
	_help.offset_top = -250
	_help.offset_bottom = -24
	root.add_child(_help)
	var help_text := Label.new()
	help_text.text = "Click — capture mouse   ·   Esc — release\nRMB hold — look   ·   WASD / arrows — move\nE / Space — up   ·   Q / Ctrl — down\nShift — fast   ·   Alt — slow   ·   Wheel — speed\n1–9 — viewpoints   ·   O — cinematic orbit\nF12 — screenshot   ·   H / F1 — hide help"
	if switch_scene != "":
		extra_help = ("Tab — %s" % switch_label) + ("\n" + extra_help if extra_help != "" else "")
	if extra_help != "":
		help_text.text += "\n" + extra_help
		_help.offset_top -= 22 * (extra_help.count("\n") + 1)
	help_text.add_theme_font_size_override("font_size", 14)
	help_text.add_theme_color_override("font_color", Color(1, 1, 1, 0.92))
	help_text.add_theme_constant_override("line_spacing", 4)
	_help.add_child(help_text)

	_speed = Label.new()
	_speed.add_theme_font_size_override("font_size", 13)
	_speed.add_theme_color_override("font_color", Color(1, 1, 1, 0.7))
	_speed.anchor_left = 1.0
	_speed.anchor_right = 1.0
	_speed.offset_left = -220
	_speed.offset_top = 22
	_speed.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_speed.offset_right = -28
	root.add_child(_speed)

	_toast = Label.new()
	_toast.add_theme_font_size_override("font_size", 26)
	_toast.add_theme_color_override("font_color", GOLD)
	_toast.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	_toast.add_theme_constant_override("shadow_offset_y", 2)
	_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_toast.anchor_left = 0.0
	_toast.anchor_right = 1.0
	_toast.offset_top = 70
	_toast.modulate.a = 0.0
	root.add_child(_toast)

	var cam := get_node_or_null(camera_path) as FreeCamera
	if cam:
		cam.viewpoint_changed.connect(_on_viewpoint)
		cam.speed_changed.connect(_on_speed)
		_on_speed(cam.base_speed)


func _on_viewpoint(index: int, label: String) -> void:
	toast("%d · %s" % [index + 1, label])


func toast(text: String) -> void:
	_toast.text = text
	if _toast_tween:
		_toast_tween.kill()
	_toast_tween = create_tween()
	_toast_tween.tween_property(_toast, "modulate:a", 1.0, 0.35)
	_toast_tween.tween_interval(1.8)
	_toast_tween.tween_property(_toast, "modulate:a", 0.0, 0.8)


func _on_speed(speed: float) -> void:
	_speed.text = "fly speed %.0f m/s" % speed


func set_overlay_visible(v: bool) -> void:
	for c in get_children():
		if c is Control:
			c.visible = v


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_help"):
		_help.visible = not _help.visible
	elif event.is_action_pressed("switch_scene") and switch_scene != "":
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		toast("Loading…")
		await get_tree().process_frame
		get_tree().change_scene_to_file(switch_scene)
	elif event.is_action_pressed("take_screenshot"):
		_save_screenshot()


func _save_screenshot() -> void:
	DirAccess.make_dir_recursive_absolute("user://screenshots")
	var path := "user://screenshots/reach_%s.png" % Time.get_datetime_string_from_system().replace(":", "-")
	get_viewport().get_texture().get_image().save_png(path)
	print("[ShatteredReach] screenshot saved: ", ProjectSettings.globalize_path(path))
