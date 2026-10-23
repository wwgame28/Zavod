@tool
class_name VfxLibrary
extends RefCounted
## All visual effects of the game as data: each recipe is a list of emitters (spawn, shape, motion,
## colour and size over life, renderer) plus an optional light flash. Gameplay code asks for an
## effect by name; it never builds particles itself (keeps logic and visuals separate).

const S := VfxBuilder.Sprite

const DUST := Color(0.9, 0.84, 0.72)
const GRASS := Color(0.62, 0.8, 0.42)
const ECHO := Color(0.48, 0.98, 1.0)
const WATER := Color(0.85, 0.97, 1.0)


static func fade(peak: float = 1.0, in_at: float = 0.12) -> Array:
	return [[0.0, Color(1, 1, 1, 0)], [in_at, Color(1, 1, 1, peak)], [1.0, Color(1, 1, 1, 0)]]


static func recipe(effect_name: String) -> Dictionary:
	match effect_name:
		"step_grass":
			return {"emitters": [
				{"name": "Puff", "amount": 5, "lifetime": 0.6, "shape": "sphere", "radius": 0.1, "spread": 70.0,
					"speed": Vector2(0.3, 0.8), "gravity": Vector3(0, 0.2, 0), "damping": Vector2(2, 3), "size": 0.5,
					"scale": Vector2(0.5, 0.9), "scale_curve": [Vector2(0, 0.4), Vector2(0.4, 1.0), Vector2(1, 1.2)],
					"color": Color(0.82, 0.9, 0.64), "ramp": fade(0.6), "render": "mix", "sprite": S.SMOKE},
				{"name": "Blades", "amount": 6, "lifetime": 0.65, "spread": 50.0, "speed": Vector2(1.3, 2.2),
					"gravity": Vector3(0, -6, 0), "size": 0.11, "spin": Vector2(-400, 400), "color": GRASS,
					"ramp": [[0.0, Color.WHITE], [0.7, Color.WHITE], [1.0, Color(1, 1, 1, 0)]], "render": "mix", "sprite": S.LEAF},
			]}
		"step_dust":
			return {"emitters": [
				{"name": "Puff", "amount": 8, "lifetime": 1.0, "shape": "ring", "radius": 0.12, "spread": 60.0,
					"speed": Vector2(0.3, 0.8), "radial": Vector2(0.4, 1.0), "gravity": Vector3(0, 0.25, 0), "damping": Vector2(2, 3),
					"size": 0.72, "scale": Vector2(0.5, 1.0), "scale_curve": [Vector2(0, 0.3), Vector2(0.35, 1.0), Vector2(1, 1.5)],
					"color": DUST, "ramp": fade(0.7), "render": "mix", "sprite": S.SMOKE},
			]}
		"step_stone":
			return {"emitters": [
				{"name": "Puff", "amount": 4, "lifetime": 0.6, "shape": "sphere", "radius": 0.08, "spread": 70.0,
					"speed": Vector2(0.2, 0.6), "gravity": Vector3(0, 0.2, 0), "damping": Vector2(2, 3), "size": 0.32,
					"scale_curve": [Vector2(0, 0.3), Vector2(0.4, 1.0), Vector2(1, 1.3)], "color": Color(0.9, 0.88, 0.86),
					"ramp": fade(0.4), "render": "mix", "sprite": S.SMOKE},
			]}
		"step_water":
			return {"emitters": [
				{"name": "Droplets", "amount": 9, "lifetime": 0.55, "spread": 35.0, "speed": Vector2(1.6, 2.8),
					"gravity": Vector3(0, -9, 0), "size": 0.05, "align": true, "stretch": 3.0, "color": WATER,
					"ramp": fade(0.9, 0.05), "render": "spark", "energy": 1.0},
				{"name": "Ripple", "amount": 1, "lifetime": 0.8, "size": 1.0, "angle": Vector2.ZERO,
					"scale_curve": [Vector2(0, 0.3), Vector2(1, 1.6)], "color": Color(0.85, 0.96, 1.0, 0.6),
					"ramp": fade(1.0, 0.05), "render": "ring", "energy": 0.6, "offset": Vector3(0, 0.03, 0)},
			]}
		"jump":
			return {"emitters": [
				{"name": "DustRing", "amount": 14, "lifetime": 0.8, "shape": "ring", "radius": 0.25, "inner": 0.15,
					"speed": Vector2(0.0, 0.3), "radial": Vector2(1.8, 3.0), "damping": Vector2(4, 6), "gravity": Vector3(0, 0.4, 0),
					"size": 0.62, "scale_curve": [Vector2(0, 0.5), Vector2(1, 1.4)], "color": DUST, "ramp": fade(0.65),
					"render": "mix", "sprite": S.SMOKE},
			]}
		"land":
			return {"emitters": [
				{"name": "DustRing", "amount": 20, "lifetime": 1.0, "shape": "ring", "radius": 0.3, "inner": 0.2,
					"speed": Vector2(0.0, 0.4), "radial": Vector2(2.4, 4.4), "damping": Vector2(5, 7), "gravity": Vector3(0, 0.5, 0),
					"size": 0.85, "scale_curve": [Vector2(0, 0.5), Vector2(1, 1.6)], "color": DUST, "ramp": fade(0.7),
					"render": "mix", "sprite": S.SMOKE},
				{"name": "Shock", "amount": 1, "lifetime": 0.45, "size": 2.4, "angle": Vector2.ZERO,
					"scale_curve": [Vector2(0, 0.25), Vector2(1, 1.3)], "color": Color(1.0, 0.97, 0.9, 0.6),
					"ramp": fade(1.0, 0.05), "render": "ring", "energy": 0.7, "offset": Vector3(0, 0.05, 0)},
				{"name": "Pebbles", "amount": 5, "lifetime": 0.6, "spread": 60.0, "speed": Vector2(2.0, 3.4),
					"gravity": Vector3(0, -14, 0), "size": 0.06, "color": Color(0.7, 0.62, 0.52), "spin": Vector2(-300, 300),
					"ramp": [[0.0, Color.WHITE], [0.8, Color.WHITE], [1.0, Color(1, 1, 1, 0)]], "render": "mix", "sprite": S.DROPLET},
			]}
		"respawn":
			return {"emitters": [
				{"name": "Beam", "amount": 1, "lifetime": 1.3, "size": Vector2(1.3, 7.0), "angle": Vector2.ZERO,
					"color": ECHO, "ramp": fade(0.9, 0.1), "render": "add", "sprite": S.BEAM, "energy": 2.2, "offset": Vector3(0, 3.2, 0),
					"billboard": true},
				{"name": "Sparkles", "amount": 32, "lifetime": 1.5, "shape": "sphere", "radius": 0.7, "spread": 25.0,
					"speed": Vector2(1.0, 3.0), "gravity": Vector3(0, 0.6, 0), "damping": Vector2(0.5, 1.5), "size": 0.2,
					"scale_curve": [Vector2(0, 1.0), Vector2(1, 0.0)], "color": Color(0.8, 1.0, 1.0), "ramp": fade(1.0, 0.05),
					"render": "add", "sprite": S.STAR, "energy": 2.6, "spin": Vector2(-90, 90), "offset": Vector3(0, 0.8, 0)},
				{"name": "Ring", "amount": 1, "lifetime": 0.9, "size": 3.6, "angle": Vector2.ZERO,
					"scale_curve": [Vector2(0, 0.2), Vector2(1, 1.2)], "color": ECHO, "ramp": fade(1.0, 0.05),
					"render": "ring", "energy": 1.4, "offset": Vector3(0, 0.05, 0)},
			], "light": {"color": ECHO, "energy": 5.0, "range": 9.0, "time": 1.0}}
		"sprint_streaks":
			return {"emitters": [
				{"name": "Streaks", "amount": 36, "lifetime": 0.4, "one_shot": false, "shape": "box", "box": Vector3(0.75, 0.8, 0.55),
					"spread": 4.0, "speed": Vector2(2.0, 3.2), "size": 0.05, "align": true, "stretch": 14.0,
					"color": Color(0.85, 0.97, 1.0, 0.65), "ramp": fade(1.0, 0.25), "render": "spark", "energy": 1.2,
					"offset": Vector3(0, 0.95, 0)},
			]}
		"core_swirl":
			return {"emitters": [
				{"name": "Orbit", "amount": 70, "lifetime": 3.0, "one_shot": false, "preprocess": 3.0, "shape": "ring",
					"radius": 3.5, "inner": 2.9, "height": 0.5, "speed": Vector2.ZERO, "tangential": Vector2(1.6, 2.6),
					"radial_accel": Vector2(-0.6, -0.2), "gravity": Vector3(0, 0.35, 0), "size": 0.2,
					"scale_curve": [Vector2(0, 0.0), Vector2(0.2, 1.0), Vector2(1, 0.2)], "color": ECHO, "ramp": fade(1.0),
					"render": "add", "sprite": S.GLOW, "energy": 2.4, "bounds": Vector3(8, 8, 8)},
				{"name": "Rising", "amount": 22, "lifetime": 1.8, "one_shot": false, "preprocess": 2.0, "shape": "sphere",
					"radius": 1.1, "spread": 15.0, "speed": Vector2(1.0, 2.2), "size": 0.05, "align": true, "stretch": 7.0,
					"color": Color(0.7, 1.0, 1.0), "ramp": fade(1.0), "render": "spark", "energy": 1.8, "offset": Vector3(0, -2.5, 0)},
				{"name": "Halo", "amount": 2, "lifetime": 4.0, "one_shot": false, "preprocess": 4.0, "size": 9.0,
					"spin": Vector2(-8, 8), "color": Color(0.5, 0.95, 1.0, 0.35), "ramp": fade(1.0, 0.4), "render": "add",
					"sprite": S.GLOW, "energy": 0.6, "soft": 2.0},
			]}
		"core_pulse":
			return {"emitters": [
				{"name": "Pulse", "amount": 2, "lifetime": 2.6, "one_shot": false, "preprocess": 2.6, "size": 10.0,
					"angle": Vector2.ZERO, "scale_curve": [Vector2(0, 0.15), Vector2(1, 1.25)], "color": Color(0.5, 1.0, 1.0, 0.55),
					"ramp": fade(1.0, 0.08), "render": "ring", "energy": 1.1, "bounds": Vector3(8, 2, 8)},
			]}
		"crystal_glint":
			return {"emitters": [
				{"name": "Glints", "amount": 6, "lifetime": 1.1, "one_shot": false, "preprocess": 1.1, "randomness": 1.0,
					"shape": "sphere", "radius": 1.0, "size": 0.4, "scale_curve": [Vector2(0, 0.0), Vector2(0.5, 1.0), Vector2(1, 0.0)],
					"spin": Vector2(-40, 40), "color": Color(0.8, 1.0, 1.0), "ramp": fade(1.0, 0.3), "render": "add",
					"sprite": S.STAR, "energy": 3.0},
			]}
		"falls_splash":
			return {"emitters": [
				{"name": "Spray", "amount": 46, "lifetime": 0.9, "one_shot": false, "preprocess": 1.0, "shape": "box",
					"box": Vector3(2.2, 0.2, 0.6), "spread": 55.0, "speed": Vector2(2.0, 4.0), "gravity": Vector3(0, -9, 0),
					"size": 0.06, "align": true, "stretch": 3.0, "color": WATER, "ramp": fade(0.9, 0.05), "render": "spark",
					"energy": 0.8, "bounds": Vector3(8, 8, 8)},
				{"name": "Mist", "amount": 14, "lifetime": 2.2, "one_shot": false, "preprocess": 2.2, "shape": "box",
					"box": Vector3(2.5, 0.5, 1.0), "spread": 40.0, "speed": Vector2(0.4, 1.2), "gravity": Vector3(0, -0.6, 0),
					"size": 2.6, "scale_curve": [Vector2(0, 0.4), Vector2(1, 1.3)], "color": Color(0.96, 0.99, 1.0),
					"ramp": fade(0.35), "render": "mix", "sprite": S.SMOKE, "soft": 1.2, "bounds": Vector3(10, 10, 10)},
			]}
		"pond_ripples":
			return {"emitters": [
				{"name": "Ripples", "amount": 7, "lifetime": 2.6, "one_shot": false, "preprocess": 2.6, "shape": "box",
					"box": Vector3(8.5, 0.0, 8.5), "size": 2.0, "angle": Vector2.ZERO, "scale_curve": [Vector2(0, 0.2), Vector2(1, 1.3)],
					"color": Color(0.9, 1.0, 1.0, 0.4), "ramp": fade(1.0, 0.1), "render": "ring", "energy": 0.5,
					"bounds": Vector3(12, 2, 12)},
				{"name": "Glints", "amount": 16, "lifetime": 1.0, "one_shot": false, "preprocess": 1.0, "randomness": 1.0,
					"shape": "box", "box": Vector3(9.0, 0.0, 9.0), "size": 0.26, "scale_curve": [Vector2(0, 0.0), Vector2(0.5, 1.0), Vector2(1, 0.0)],
					"color": Color(1.0, 1.0, 0.92), "ramp": fade(1.0, 0.3), "render": "add", "sprite": S.STAR, "energy": 2.0,
					"bounds": Vector3(12, 2, 12)},
			]}
		"leaf_gust":
			return {"emitters": [
				{"name": "Leaves", "amount": 46, "lifetime": 9.0, "one_shot": false, "preprocess": 9.0, "shape": "box",
					"box": Vector3(60, 5, 40), "dir": Vector3(1, 0.1, 0.45), "spread": 18.0, "speed": Vector2(2.5, 5.5),
					"gravity": Vector3(0, -0.12, 0), "turbulence": 1.4, "size": 0.17, "spin": Vector2(-220, 220),
					"color": Color(0.7, 0.85, 0.42), "ramp": fade(1.0, 0.08), "render": "mix", "sprite": S.LEAF,
					"bounds": Vector3(90, 20, 70)},
			]}
		"light_shafts":
			return {"emitters": [
				{"name": "Shafts", "amount": 5, "lifetime": 9.0, "one_shot": false, "preprocess": 9.0, "shape": "box",
					"box": Vector3(10, 0.5, 10), "size": Vector2(2.4, 15.0), "angle": Vector2(-6, 6),
					"color": Color(1.0, 0.95, 0.8, 0.22), "ramp": fade(1.0, 0.3), "render": "add", "sprite": S.BEAM,
					"energy": 0.6, "soft": 3.0, "bounds": Vector3(16, 16, 16)},
			]}
	push_warning("Unknown VFX recipe: %s" % effect_name)
	return {}


## Builds a ready effect node (looping recipes start emitting immediately).
static func build(effect_name: String) -> Node3D:
	return VfxBuilder.effect(recipe(effect_name), effect_name)
