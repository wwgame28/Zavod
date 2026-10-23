@tool
class_name VfxBuilder
extends RefCounted
## Turns emitter recipes (plain dictionaries, Niagara-style "modules": spawn, shape, velocity,
## forces, size/colour over life, renderer) into configured GPUParticles3D nodes.
## Materials are cached per renderer setup so many effects share the same GPU resources.

const ADD := preload("res://shaders/vfx/vfx_add.gdshader")
const MIX := preload("res://shaders/vfx/vfx_mix.gdshader")
const SPARK := preload("res://shaders/vfx/vfx_spark.gdshader")
const RING := preload("res://shaders/vfx/vfx_ring.gdshader")
const NOISE := preload("res://materials/textures/noise_soft.tres")

enum Sprite { GLOW, SMOKE, STAR, DROPLET, BEAM, LEAF, RING }

static var _materials := {}


static func emitter(e: Dictionary) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.name = String(e.get("name", "Emitter"))
	p.amount = int(e.get("amount", 16))
	p.lifetime = float(e.get("lifetime", 1.0))
	p.one_shot = bool(e.get("one_shot", true))
	p.explosiveness = float(e.get("explosiveness", 1.0 if p.one_shot else 0.0))
	p.randomness = float(e.get("randomness", 0.35))
	p.preprocess = float(e.get("preprocess", 0.0))
	p.fixed_fps = 60
	p.local_coords = bool(e.get("local", false))
	p.emitting = not p.one_shot
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	p.draw_order = GPUParticles3D.DRAW_ORDER_VIEW_DEPTH if e.get("render", "add") == "mix" else GPUParticles3D.DRAW_ORDER_INDEX
	var ext: Vector3 = e.get("bounds", Vector3(6, 6, 6))
	p.visibility_aabb = AABB(-ext, ext * 2.0)
	if e.has("offset"):
		p.position = e["offset"]
	p.process_material = _process(e)
	p.draw_pass_1 = _mesh(e)
	return p


static func _process(e: Dictionary) -> ParticleProcessMaterial:
	var m := ParticleProcessMaterial.new()
	match String(e.get("shape", "point")):
		"sphere":
			m.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
			m.emission_sphere_radius = float(e.get("radius", 0.5))
		"box":
			m.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
			m.emission_box_extents = e.get("box", Vector3.ONE)
		"ring":
			m.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
			m.emission_ring_axis = e.get("ring_axis", Vector3.UP)
			m.emission_ring_radius = float(e.get("radius", 0.5))
			m.emission_ring_inner_radius = float(e.get("inner", 0.0))
			m.emission_ring_height = float(e.get("height", 0.0))
	m.direction = e.get("dir", Vector3.UP)
	m.spread = float(e.get("spread", 45.0))
	m.flatness = float(e.get("flatness", 0.0))
	var v: Vector2 = e.get("speed", Vector2.ZERO)
	m.initial_velocity_min = v.x
	m.initial_velocity_max = v.y
	var rv: Vector2 = e.get("radial", Vector2.ZERO)
	m.radial_velocity_min = rv.x
	m.radial_velocity_max = rv.y
	m.gravity = e.get("gravity", Vector3.ZERO)
	var d: Vector2 = e.get("damping", Vector2.ZERO)
	m.damping_min = d.x
	m.damping_max = d.y
	var ta: Vector2 = e.get("tangential", Vector2.ZERO)
	m.tangential_accel_min = ta.x
	m.tangential_accel_max = ta.y
	var ra: Vector2 = e.get("radial_accel", Vector2.ZERO)
	m.radial_accel_min = ra.x
	m.radial_accel_max = ra.y
	var sc: Vector2 = e.get("scale", Vector2.ONE)
	m.scale_min = sc.x
	m.scale_max = sc.y
	if e.has("scale_curve"):
		var curve := Curve.new()
		curve.max_value = 4.0
		for pt in e["scale_curve"]:
			curve.add_point(pt)
		var ct := CurveTexture.new()
		ct.curve = curve
		m.scale_curve = ct
	var a: Vector2 = e.get("angle", Vector2(0, 360))
	m.angle_min = a.x
	m.angle_max = a.y
	var spin: Vector2 = e.get("spin", Vector2.ZERO)
	m.angular_velocity_min = spin.x
	m.angular_velocity_max = spin.y
	m.color = e.get("color", Color.WHITE)
	var g := Gradient.new()
	var ramp: Array = e.get("ramp", [[0.0, Color(1, 1, 1, 0)], [0.15, Color.WHITE], [1.0, Color(1, 1, 1, 0)]])
	var offsets := PackedFloat32Array()
	var colors := PackedColorArray()
	for k in ramp:
		offsets.push_back(k[0])
		colors.push_back(k[1])
	g.offsets = offsets
	g.colors = colors
	var gt := GradientTexture1D.new()
	gt.gradient = g
	m.color_ramp = gt
	if float(e.get("turbulence", 0.0)) > 0.0:
		m.turbulence_enabled = true
		m.turbulence_noise_strength = float(e["turbulence"])
		m.turbulence_noise_scale = float(e.get("turbulence_scale", 4.0))
		m.turbulence_influence_min = 0.05
		m.turbulence_influence_max = 0.2
	m.anim_offset_min = 0.0
	m.anim_offset_max = 1.0
	m.particle_flag_align_y = bool(e.get("align", false))
	return m


static func _mesh(e: Dictionary) -> Mesh:
	var render := String(e.get("render", "add"))
	var size = e.get("size", 0.3)
	var mesh: PrimitiveMesh
	if render == "ring":
		var plane := PlaneMesh.new()
		plane.size = Vector2.ONE * float(size)
		mesh = plane
	else:
		var quad := QuadMesh.new()
		quad.size = size if size is Vector2 else Vector2.ONE * float(size)
		mesh = quad
	mesh.material = _material(e, render)
	return mesh


static func _material(e: Dictionary, render: String) -> ShaderMaterial:
	var sprite := int(e.get("sprite", Sprite.GLOW))
	var energy := float(e.get("energy", 1.0))
	var key := "%s|%d|%.2f|%.2f|%.2f|%s" % [render, sprite, energy, float(e.get("stretch", 4.0)), float(e.get("soft", 0.4)), str(e.get("billboard", true))]
	if _materials.has(key):
		return _materials[key]
	var m := ShaderMaterial.new()
	match render:
		"mix":
			m.shader = MIX
		"spark":
			m.shader = SPARK
			m.set_shader_parameter("stretch", float(e.get("stretch", 4.0)))
		"ring":
			m.shader = RING
		_:
			m.shader = ADD
	m.set_shader_parameter("energy", energy)
	if render == "add" or render == "mix":
		m.set_shader_parameter("shape", sprite)
		m.set_shader_parameter("noise_tex", NOISE)
		m.set_shader_parameter("soft_distance", float(e.get("soft", 0.4)))
		m.set_shader_parameter("billboard", bool(e.get("billboard", true)))
	_materials[key] = m
	return m


## Builds a whole effect (several emitters + optional flash light) under one Node3D.
static func effect(recipe: Dictionary, effect_name: String = "Vfx") -> Node3D:
	var root := Node3D.new()
	root.name = effect_name
	for e in recipe.get("emitters", []):
		root.add_child(emitter(e))
	if recipe.has("light"):
		var l: Dictionary = recipe["light"]
		var light := OmniLight3D.new()
		light.name = "Flash"
		light.light_color = l.get("color", Color.WHITE)
		light.light_energy = 0.0
		light.omni_range = float(l.get("range", 6.0))
		light.position = l.get("offset", Vector3(0, 1, 0))
		light.set_meta("peak", float(l.get("energy", 3.0)))
		light.set_meta("time", float(l.get("time", 0.6)))
		root.add_child(light)
	return root


## Longest lifetime in an effect (how long a one-shot instance stays busy).
static func duration(fx: Node3D) -> float:
	var t := 0.0
	for c in fx.get_children():
		if c is GPUParticles3D:
			t = maxf(t, (c as GPUParticles3D).lifetime * (1.0 + (c as GPUParticles3D).randomness))
		elif c is OmniLight3D:
			t = maxf(t, float(c.get_meta("time", 0.0)))
	return t + 0.1
