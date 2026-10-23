@tool
class_name ProceduralNode
extends Node3D
## Base for nodes that generate their content from code. Generated children are not owned by the
## scene, so they are never saved into .tscn files; they are rebuilt on load (in game and editor).

## Editor button: regenerate this node's content.
@export var rebuild: bool = false:
	set(value):
		if value and is_inside_tree():
			build()
@export var build_in_editor: bool = true
@export var world_seed: int = 20261023

var rng := RandomNumberGenerator.new()


func _ready() -> void:
	if Engine.is_editor_hint() and not build_in_editor:
		return
	build()


func build() -> void:
	clear()
	rng.seed = world_seed
	var t0 := Time.get_ticks_msec()
	_build()
	print("[ShatteredReach] %s generated in %d ms" % [name, Time.get_ticks_msec() - t0])


## Override in subclasses.
func _build() -> void:
	pass


func clear() -> void:
	for child in get_children():
		if child.owner == null:
			remove_child(child)
			child.queue_free()


func add_mesh(mesh: Mesh, xform: Transform3D, node_name: String = "", shadows: bool = true,
		parent: Node3D = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.transform = xform
	if node_name != "":
		mi.name = node_name
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadows else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	(parent if parent else self).add_child(mi)
	return mi


func add_group(node_name: String, parent: Node3D = null) -> Node3D:
	var n := Node3D.new()
	n.name = node_name
	(parent if parent else self).add_child(n)
	return n


## Static trimesh collision for a generated mesh (used later by the character controller).
func add_collision(mesh: Mesh, xform: Transform3D, node_name: String, parent: Node3D = null) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = node_name
	body.transform = xform
	var cs := CollisionShape3D.new()
	cs.shape = mesh.create_trimesh_shape()
	body.add_child(cs)
	(parent if parent else self).add_child(body)
	return body


static func yaw_basis(yaw: float, scale: float = 1.0) -> Basis:
	return Basis(Vector3.UP, yaw).scaled(Vector3.ONE * scale)


## Basis whose +Y axis points along `up` (for crystals growing out of surfaces).
static func basis_from_up(up: Vector3, twist: float = 0.0) -> Basis:
	var y := up.normalized()
	var ref := Vector3.FORWARD if absf(y.dot(Vector3.FORWARD)) < 0.95 else Vector3.RIGHT
	var x := ref.cross(y).normalized()
	var z := x.cross(y).normalized()
	return Basis(x, y, z) * Basis(Vector3.UP, twist)
