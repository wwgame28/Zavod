@tool
class_name Viewpoint
extends Marker3D
## Named camera bookmark. Orients itself toward `target` so poses are easy to author.

@export var label := "Viewpoint"
@export var target := Vector3.ZERO:
	set(value):
		target = value
		_orient()


func _ready() -> void:
	_orient()


func _orient() -> void:
	if is_inside_tree() and global_position.distance_to(target) > 0.01:
		look_at(target, Vector3.UP)
