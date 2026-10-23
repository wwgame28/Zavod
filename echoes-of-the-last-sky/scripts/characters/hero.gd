@tool
class_name Hero
extends Node3D
## Visual model of the hero. Builds the procedural sky wanderer, or uses an imported humanoid
## (e.g. a Tripo3D GLB) when `model_scene` is set: it is scaled to `target_height`, grounded,
## and its materials are converted to the game's toon shading with ink outlines.

const CHARACTER_SHADER := preload("res://shaders/character.gdshader")
const OUTLINE := preload("res://materials/character/outline_body.tres")

## Imported model (GLB/FBX scene). Leave empty to use the procedural hero.
@export var model_scene: PackedScene:
	set(value):
		model_scene = value
		if is_inside_tree():
			rebuild_model()
@export var target_height := 1.68
@export var blink_enabled := true

var skeleton: Skeleton3D
var meshes: Array[MeshInstance3D] = []
var is_procedural := true

var _blink_wait := 2.5
var _blink_t := -1.0


func _ready() -> void:
	rebuild_model()


func rebuild_model() -> void:
	for child in get_children():
		if child.owner == null and child.name == "Model":
			remove_child(child)
			child.queue_free()
	meshes.clear()
	skeleton = null
	var model := Node3D.new()
	model.name = "Model"
	add_child(model)
	if model_scene:
		_use_imported(model)
	else:
		_use_procedural(model)


func _use_procedural(model: Node3D) -> void:
	is_procedural = true
	var res := HeroBuilder.build()
	skeleton = res["skeleton"]
	model.add_child(skeleton)
	var mi := MeshInstance3D.new()
	mi.name = "Body"
	mi.mesh = res["mesh"]
	skeleton.add_child(mi)
	mi.skeleton = NodePath("..")
	meshes.append(mi)


func _use_imported(model: Node3D) -> void:
	is_procedural = false
	var inst := model_scene.instantiate() as Node3D
	model.add_child(inst)
	_collect(inst)
	var box := _bounds(inst)
	if box.size.y > 0.001:
		var s := target_height / box.size.y
		inst.scale = Vector3.ONE * s
		inst.position = -Vector3(box.get_center().x, box.position.y, box.get_center().z) * s
	for mi in meshes:
		for i in mi.mesh.get_surface_count():
			mi.set_surface_override_material(i, toon_material(mi.get_active_material(i)))


func _collect(node: Node) -> void:
	if node is Skeleton3D and skeleton == null:
		skeleton = node
	if node is MeshInstance3D:
		meshes.append(node)
	for c in node.get_children():
		_collect(c)


func _bounds(root: Node3D) -> AABB:
	var box := AABB()
	var first := true
	var inv := root.global_transform.affine_inverse()
	for mi in meshes:
		var b: AABB = (inv * mi.global_transform) * mi.get_aabb()
		box = b if first else box.merge(b)
		first = false
	return box


## Toon material that keeps an imported albedo texture/colour.
static func toon_material(src: Material) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = CHARACTER_SHADER
	m.set_shader_parameter("use_texture", true)
	if src is BaseMaterial3D:
		var bm := src as BaseMaterial3D
		if bm.albedo_texture:
			m.set_shader_parameter("albedo_tex", bm.albedo_texture)
		m.set_shader_parameter("albedo_tint", bm.albedo_color)
	m.next_pass = OUTLINE
	return m


func _process(delta: float) -> void:
	if Engine.is_editor_hint() or not blink_enabled or not is_procedural or meshes.is_empty():
		return
	if _blink_t < 0.0:
		_blink_wait -= delta
		if _blink_wait <= 0.0:
			_blink_t = 0.0
			_blink_wait = randf_range(2.0, 5.0)
		return
	_blink_t += delta
	var k := clampf(1.0 - absf(_blink_t / 0.07 - 1.0), 0.0, 1.0)
	meshes[0].set_instance_shader_parameter("blink", k)
	if _blink_t > 0.14:
		_blink_t = -1.0
		meshes[0].set_instance_shader_parameter("blink", 0.0)
