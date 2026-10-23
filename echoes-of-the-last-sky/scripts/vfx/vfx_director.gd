extends Node
## Autoload `Vfx`: plays one-shot effects from VfxLibrary with pooling, so frequent effects
## (footsteps, impacts) never allocate during play. Usage: Vfx.play("land", position, intensity).

const POOL_LIMIT := 12

var _pools := {}      # name -> Array[Node3D] (idle)
var _root: Node3D


func _ready() -> void:
	_root = Node3D.new()
	_root.name = "VfxPool"
	add_child(_root)


## Plays `effect_name` at `pos`. `intensity` (0..1+) scales how many particles spawn.
func play(effect_name: String, pos: Vector3, intensity: float = 1.0, yaw: float = 0.0) -> Node3D:
	var fx := _take(effect_name)
	fx.global_position = pos
	fx.rotation = Vector3(0.0, yaw, 0.0)
	fx.visible = true
	for c in fx.get_children():
		if c is GPUParticles3D:
			var p := c as GPUParticles3D
			p.amount_ratio = clampf(intensity, 0.05, 1.0)
			p.restart()
			p.emitting = true
		elif c is OmniLight3D:
			_flash(c as OmniLight3D, intensity)
	get_tree().create_timer(VfxBuilder.duration(fx), false).timeout.connect(_release.bind(effect_name, fx))
	return fx


func _take(effect_name: String) -> Node3D:
	var pool: Array = _pools.get(effect_name, [])
	if not pool.is_empty():
		return pool.pop_back()
	var fx := VfxLibrary.build(effect_name)
	_root.add_child(fx)
	return fx


func _release(effect_name: String, fx: Node3D) -> void:
	if not is_instance_valid(fx):
		return
	var pool: Array = _pools.get(effect_name, [])
	if pool.size() >= POOL_LIMIT:
		fx.queue_free()
		return
	fx.visible = false
	pool.append(fx)
	_pools[effect_name] = pool


func _flash(light: OmniLight3D, intensity: float) -> void:
	var peak := float(light.get_meta("peak", 3.0)) * clampf(intensity, 0.2, 1.5)
	var t := float(light.get_meta("time", 0.6))
	light.light_energy = peak
	var tw := light.create_tween()
	tw.tween_property(light, "light_energy", 0.0, t).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
