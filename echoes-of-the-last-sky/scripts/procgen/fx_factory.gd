@tool
class_name FxFactory
extends RefCounted
## Ambient particle effects: light motes, falling petals, mist.

const MIST_SHADER := preload("res://shaders/mist.gdshader")


static func _fade_ramp(peak_alpha: float = 1.0) -> GradientTexture1D:
	var g := Gradient.new()
	g.offsets = PackedFloat32Array([0.0, 0.2, 0.75, 1.0])
	g.colors = PackedColorArray([Color(1, 1, 1, 0), Color(1, 1, 1, peak_alpha), Color(1, 1, 1, peak_alpha), Color(1, 1, 1, 0)])
	var t := GradientTexture1D.new()
	t.gradient = g
	return t


static func _base(amount: int, lifetime: float, box: Vector3) -> Array:
	var p := GPUParticles3D.new()
	p.amount = amount
	p.lifetime = lifetime
	p.preprocess = lifetime
	p.randomness = 0.5
	var ext := box + Vector3.ONE * 30.0
	p.visibility_aabb = AABB(-ext, ext * 2.0)
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = box
	pm.color_ramp = _fade_ramp()
	p.process_material = pm
	return [p, pm]


## Floating glowing motes drifting upward (Echo energy, pollen in sunlight).
static func motes(amount: int, box: Vector3, color: Color, size: float, rise: float, lifetime: float = 8.0) -> GPUParticles3D:
	var res := _base(amount, lifetime, box)
	var p: GPUParticles3D = res[0]
	var pm: ParticleProcessMaterial = res[1]
	pm.gravity = Vector3(0.0, rise, 0.0)
	pm.direction = Vector3.UP
	pm.spread = 180.0
	pm.initial_velocity_min = 0.05
	pm.initial_velocity_max = 0.4
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 0.6
	pm.turbulence_noise_scale = 6.0
	pm.turbulence_influence_min = 0.05
	pm.turbulence_influence_max = 0.15
	pm.scale_min = 0.5
	pm.scale_max = 1.2
	pm.color = color
	var quad := QuadMesh.new()
	quad.size = Vector2(size, size)
	quad.material = WorldPalette.MOTE
	p.draw_pass_1 = quad
	return p


## Tumbling petals drifting down from a blossom canopy.
static func petals(amount: int, box: Vector3, color: Color, drift: Vector3, lifetime: float = 12.0) -> GPUParticles3D:
	var res := _base(amount, lifetime, box)
	var p: GPUParticles3D = res[0]
	var pm: ParticleProcessMaterial = res[1]
	pm.gravity = drift
	pm.direction = Vector3(1.0, -0.3, 0.4)
	pm.spread = 60.0
	pm.initial_velocity_min = 0.2
	pm.initial_velocity_max = 0.8
	pm.angular_velocity_min = -120.0
	pm.angular_velocity_max = 120.0
	pm.angle_min = 0.0
	pm.angle_max = 360.0
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 1.2
	pm.turbulence_noise_scale = 4.0
	pm.particle_flag_rotate_y = true
	pm.scale_min = 0.7
	pm.scale_max = 1.3
	pm.color = color
	pm.color_ramp = _fade_ramp()
	var quad := QuadMesh.new()
	quad.size = Vector2(0.22, 0.14)
	quad.material = WorldPalette.PETAL
	p.draw_pass_1 = quad
	return p


## Soft billowing mist puffs (waterfall spray).
static func mist(amount: int, box: Vector3, size: float, velocity: Vector3, lifetime: float = 4.0, opacity: float = 0.5) -> GPUParticles3D:
	var res := _base(amount, lifetime, box)
	var p: GPUParticles3D = res[0]
	var pm: ParticleProcessMaterial = res[1]
	pm.gravity = velocity
	pm.direction = velocity.normalized() if velocity.length() > 0.0 else Vector3.UP
	pm.spread = 35.0
	pm.initial_velocity_min = 0.5
	pm.initial_velocity_max = 2.0
	pm.scale_min = 0.6
	pm.scale_max = 1.4
	pm.scale_curve = _grow_curve()
	pm.color_ramp = _fade_ramp(opacity)
	var mat := ShaderMaterial.new()
	mat.shader = MIST_SHADER
	var quad := QuadMesh.new()
	quad.size = Vector2(size, size)
	quad.material = mat
	p.draw_pass_1 = quad
	return p


static func _grow_curve() -> CurveTexture:
	var c := Curve.new()
	c.add_point(Vector2(0.0, 0.4))
	c.add_point(Vector2(1.0, 1.0))
	var t := CurveTexture.new()
	t.curve = c
	return t
