@tool
class_name Spinner
extends Node3D
## Rotates (and optionally bobs) its children - used for the Echo Core and rune rings.

@export var speed := Vector3(0.0, 0.3, 0.0)   ## Radians per second around each local axis.
@export var bob := 0.0                         ## Vertical bob amplitude in metres.
@export var bob_speed := 0.8

var _base_y := 0.0
var _time := 0.0


func _ready() -> void:
	_base_y = position.y


func _process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	_time += delta
	rotate_object_local(Vector3.RIGHT, speed.x * delta)
	rotate_object_local(Vector3.UP, speed.y * delta)
	rotate_object_local(Vector3.BACK, speed.z * delta)
	if bob != 0.0:
		position.y = _base_y + sin(_time * bob_speed) * bob
