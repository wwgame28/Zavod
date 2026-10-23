@tool
class_name RuinFactory
extends RefCounted
## Kit of ancient Skyborn architecture built from bevelled stone blocks.
## Vertex color alpha selects the stone shader layer: 1 = stone, 0.5 = gold trim, 0 = glowing rune.

const STONE := Color(0.9, 0.86, 0.78, 1.0)
const TRIM_A := 0.5
const RUNE_A := 0.0


static func stone_color(rng: RandomNumberGenerator, base: Color = STONE) -> Color:
	var v := rng.randf_range(-0.06, 0.04)
	var c := Color(base.r + v, base.g + v, base.b + v * 1.4, 1.0)
	return c


static func trim_color() -> Color:
	return Color(0.95, 0.76, 0.4, TRIM_A)


static func rune_color() -> Color:
	return Color(0.5, 0.95, 1.0, RUNE_A)


static func block(kit: MeshKit, rng: RandomNumberGenerator, xform: Transform3D, size: Vector3,
		color: Color = Color(0, 0, 0, -1)) -> void:
	var c := color if color.a >= 0.0 else stone_color(rng)
	var bevel := minf(size.x, minf(size.y, size.z)) * 0.14
	kit.add_rounded_box(xform, size, bevel, c, bevel * 0.12, rng)


## Column on a plinth; broken columns lose drums and get a jagged top.
static func column(rng: RandomNumberGenerator, height: float, radius: float, broken: bool) -> MeshKit:
	var kit := MeshKit.new()
	var plinth_h := radius * 0.7
	block(kit, rng, Transform3D(Basis(), Vector3(0.0, plinth_h * 0.5, 0.0)), Vector3(radius * 2.7, plinth_h, radius * 2.7))
	block(kit, rng, Transform3D(Basis(), Vector3(0.0, plinth_h * 1.25, 0.0)), Vector3(radius * 2.3, plinth_h * 0.5, radius * 2.3))
	kit.add_cylinder(Transform3D(Basis(), Vector3(0.0, plinth_h * 1.5, 0.0)), radius * 1.08, radius * 1.08, radius * 0.18, 16, trim_color())
	var shaft_h := height - plinth_h * 1.7 - (0.0 if broken else radius * 1.3)
	var drum_h := radius * 2.2
	var drums := maxi(1, int(round(shaft_h / drum_h)))
	drum_h = shaft_h / float(drums)
	var keep := drums
	if broken:
		keep = maxi(1, int(drums * rng.randf_range(0.35, 0.8)))
	var y := plinth_h * 1.5 + radius * 0.18
	var col := stone_color(rng)
	for d in keep:
		var last := broken and d == keep - 1
		var yaw := Basis(Vector3.UP, rng.randf() * TAU)
		var off := Vector3(rng.randf_range(-1, 1), 0.0, rng.randf_range(-1, 1)) * radius * 0.03
		var r := radius * (1.0 - 0.04 * float(d) / float(drums))
		kit.add_cylinder(Transform3D(yaw, Vector3(0.0, y, 0.0) + off), r, r * 0.985, drum_h - 0.04,
				16, col.lerp(stone_color(rng), 0.4), false, true, 0.07, radius * 1.1 if last else 0.0, rng)
		y += drum_h
	if not broken:
		kit.add_cylinder(Transform3D(Basis(), Vector3(0.0, y, 0.0)), radius * 1.0, radius * 1.25, radius * 0.4, 16, col)
		kit.add_cylinder(Transform3D(Basis(), Vector3(0.0, y + radius * 0.4, 0.0)), radius * 1.3, radius * 1.3, radius * 0.16, 16, trim_color())
		block(kit, rng, Transform3D(Basis(), Vector3(0.0, y + radius * 0.85, 0.0)), Vector3(radius * 2.9, radius * 0.6, radius * 2.9))
	return kit


## Semicircular arch on two piers. `broken` removes the upper-right voussoirs and shortens a pier.
static func arch(rng: RandomNumberGenerator, span: float, pier_h: float, depth: float, broken: bool) -> MeshKit:
	var kit := MeshKit.new()
	var pier_w := span * 0.22
	var course := pier_w * 0.55
	for side in [-1.0, 1.0]:
		var x: float = side * (span * 0.5 + pier_w * 0.5)
		var courses := int(pier_h / course)
		if broken and side > 0.0:
			courses = int(courses * 0.75)
		block(kit, rng, Transform3D(Basis(), Vector3(x, course * 0.35, 0.0)), Vector3(pier_w * 1.3, course * 0.7, depth * 1.25))
		for c in courses:
			var yy := course * 0.7 + course * (float(c) + 0.5)
			var sz := Vector3(pier_w * rng.randf_range(0.97, 1.03), course * 0.96, depth)
			block(kit, rng, Transform3D(Basis(Vector3.UP, rng.randf_range(-0.03, 0.03)), Vector3(x, yy, 0.0)), sz)
	var spring := course * 0.7 + course * int(pier_h / course)
	var ring_r := span * 0.5 + pier_w * 0.5
	var stones := 11
	var arc_len := PI * ring_r / float(stones)
	for k in stones:
		var a := PI * (float(k) + 0.5) / float(stones)
		if broken and a < PI * 0.42:
			continue
		var pos := Vector3(cos(a) * ring_r, spring + sin(a) * ring_r, 0.0)
		var basis := Basis(Vector3(0, 0, 1), a - PI * 0.5)
		var key := k == stones / 2
		var sz := Vector3(arc_len * 0.94, pier_w * (1.25 if key else 1.0), depth * (1.12 if key else 1.0))
		block(kit, rng, Transform3D(basis, pos), sz)
		if key:
			block(kit, rng, Transform3D(basis, pos + Vector3(0.0, 0.0, depth * 0.57)),
					Vector3(arc_len * 0.45, pier_w * 0.6, 0.08), rune_color())
	# Gold string course along the arch face.
	if not broken:
		kit.add_torus(Transform3D(Basis(Vector3.RIGHT, -PI * 0.5), Vector3(0.0, spring, depth * 0.5)),
				ring_r + pier_w * 0.55, 0.06, 32, 5, trim_color(), PI)
	return kit


## Wall of offset block courses with a ruined top edge.
static func wall(rng: RandomNumberGenerator, length: float, height: float, thickness: float, ruin: float = 0.6) -> MeshKit:
	var kit := MeshKit.new()
	var bh := thickness * 0.75
	var courses := maxi(1, int(height / bh))
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 1.0
	for c in courses:
		var bl := thickness * rng.randf_range(1.6, 2.2)
		var x := -length * 0.5 + (bl * 0.5 if c % 2 == 0 else 0.0)
		while x < length * 0.5:
			var w := minf(bl * rng.randf_range(0.85, 1.15), length * 0.5 - x)
			if w < bl * 0.3:
				break
			var cx := x + w * 0.5
			var limit := float(courses) * (1.0 - ruin * (0.5 + 0.5 * noise.get_noise_1d(cx * 0.35)))
			if float(c) < limit and rng.randf() > 0.04:
				block(kit, rng, Transform3D(Basis(Vector3.UP, rng.randf_range(-0.02, 0.02)), Vector3(cx, bh * (c + 0.5), 0.0)),
						Vector3(w * 0.97, bh * 0.95, thickness * rng.randf_range(0.95, 1.0)))
			x += w
	return kit


## Circular plaza: rings of tiles with gaps, a raised dais and gold inlay.
static func plaza(rng: RandomNumberGenerator, radius: float) -> MeshKit:
	var kit := MeshKit.new()
	var ring_w := 1.6
	var r := 3.4
	var ring := 0
	while r < radius:
		var circ := TAU * r
		var count := maxi(8, int(circ / 1.7))
		var arc := TAU / float(count)
		for i in count:
			var missing := 0.03 + 0.25 * smoothstep(radius * 0.6, radius, r)
			if rng.randf() < missing:
				continue
			var a := arc * (float(i) + 0.5 * float(ring % 2))
			var pos := Vector3(cos(a) * r, rng.randf_range(-0.04, 0.03), sin(a) * r)
			var basis := Basis(Vector3.UP, -a) * Basis(Vector3.FORWARD, rng.randf_range(-0.02, 0.02))
			var c := Color(0, 0, 0, -1)
			if ring == 2:
				c = trim_color()
			block(kit, rng, Transform3D(basis, pos), Vector3(ring_w * 0.92, 0.3, circ / float(count) * 0.92), c)
		r += ring_w
		ring += 1
	# Dais: three stepped drums.
	for k in 3:
		var dr := 3.2 - float(k) * 0.9
		kit.add_cylinder(Transform3D(Basis(), Vector3(0.0, -0.1 + float(k) * 0.35, 0.0)), dr, dr, 0.36, 24, stone_color(rng))
	kit.add_cylinder(Transform3D(Basis(), Vector3(0.0, 0.95, 0.0)), 1.45, 1.45, 0.08, 24, rune_color())
	return kit


## Straight flight of steps climbing along local -Z from the origin.
static func stairs(rng: RandomNumberGenerator, width: float, rise: float, run: float, steps: int) -> MeshKit:
	var kit := MeshKit.new()
	var sh := rise / float(steps)
	var sd := run / float(steps)
	for i in steps:
		var top := sh * float(i + 1)
		var depth := 1.2
		var pos := Vector3(0.0, top - depth * 0.5, -sd * (float(i) + 0.5))
		if rng.randf() < 0.06:
			pos.y -= sh * 0.4
		var seg := 3
		for s in seg:
			var w := width / float(seg)
			var px := -width * 0.5 + w * (float(s) + 0.5)
			block(kit, rng, Transform3D(Basis(Vector3.UP, rng.randf_range(-0.015, 0.015)), pos + Vector3(px, 0.0, 0.0)),
					Vector3(w * 0.98, depth, sd * 1.02))
	# Balustrade posts.
	for side in [-1.0, 1.0]:
		var posts := int(steps / 3)
		for p in posts:
			if rng.randf() < 0.25:
				continue
			var i := p * 3 + 1
			var base := Vector3(side * (width * 0.5 + 0.35), sh * float(i), -sd * (float(i) + 0.5))
			var ph := rng.randf_range(0.6, 1.3)
			block(kit, rng, Transform3D(Basis(), base + Vector3(0.0, ph * 0.5, 0.0)), Vector3(0.5, ph, 0.5))
	return kit


## Ruined round watchtower made of block courses, with doorway, windows and a broken crown.
static func tower(rng: RandomNumberGenerator, radius: float, height: float) -> MeshKit:
	var kit := MeshKit.new()
	var bh := 0.85
	var courses := int(height / bh)
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 1.0
	var thickness := 1.1
	for c in courses:
		var count := int(TAU * radius / 1.9)
		for i in count:
			var a := TAU * (float(i) + 0.5 * float(c % 2)) / float(count)
			var limit := float(courses) * (0.62 + 0.38 * (0.5 + 0.5 * noise.get_noise_1d(cos(a) * 2.0 + sin(a))))
			if float(c) > limit:
				continue
			var door := c < 4 and absf(wrapf(a - PI * 0.5, -PI, PI)) < 0.32
			var window := (c >= 8 and c <= 10) and fposmod(a + 0.4, TAU / 3.0) < 0.3
			if door or window:
				continue
			var pos := Vector3(cos(a) * radius, bh * (float(c) + 0.5), sin(a) * radius)
			var basis := Basis(Vector3.UP, -a + PI * 0.5)
			var col := Color(0, 0, 0, -1)
			if c == 6:
				col = trim_color()
			block(kit, rng, Transform3D(basis, pos), Vector3(TAU * radius / float(count) * 0.97, bh * 0.95, thickness))
			if col.a >= 0.0:
				block(kit, rng, Transform3D(basis, pos + basis.z * (thickness * 0.5)), Vector3(TAU * radius / float(count) * 0.98, 0.18, 0.1), col)
	# Base plinth ring.
	kit.add_cylinder(Transform3D(Basis(), Vector3(0.0, -0.6, 0.0)), radius + 1.2, radius + 0.9, 0.9, 28, stone_color(rng))
	return kit


## Standing stone with glowing rune channels.
static func menhir(rng: RandomNumberGenerator, height: float, width: float) -> MeshKit:
	var kit := MeshKit.new()
	var segs := 3
	var y := 0.0
	for s in segs:
		var f := float(s) / float(segs)
		var h := height / float(segs)
		var w := width * lerpf(1.0, 0.7, f)
		block(kit, rng, Transform3D(Basis(Vector3.UP, rng.randf_range(-0.05, 0.05)), Vector3(0.0, y + h * 0.5, 0.0)), Vector3(w, h * 1.02, w * 0.62))
		y += h
	var cap := MeshKit.new()
	cap.add_cylinder(Transform3D(Basis(Vector3.UP, PI * 0.25), Vector3.ZERO), width * 0.5, 0.02, width * 0.55, 4, stone_color(rng))
	kit.append(cap, Transform3D(Basis().scaled(Vector3(1.0, 1.0, 0.62)), Vector3(0.0, y, 0.0)))
	for k in 3:
		var yy := height * (0.25 + 0.22 * float(k))
		block(kit, rng, Transform3D(Basis(), Vector3(0.0, yy, width * 0.62 * lerpf(1.0, 0.7, yy / height) * 0.5)),
				Vector3(width * 0.12, height * 0.14, 0.06), rune_color())
	return kit


## Arched stone bridge running along local -Z. `broken_after` (0..1) drops the far end.
static func bridge(rng: RandomNumberGenerator, length: float, width: float, spans: int, broken_after: float) -> MeshKit:
	var kit := MeshKit.new()
	var deck_y := 0.0
	var span_len := length / float(spans)
	var tile := 1.4
	var z := 0.0
	while z < length * broken_after:
		var cols := int(width / tile)
		for cx in cols:
			if rng.randf() < 0.05:
				continue
			var x := -width * 0.5 + tile * (float(cx) + 0.5)
			block(kit, rng, Transform3D(Basis(Vector3.UP, rng.randf_range(-0.03, 0.03)), Vector3(x, deck_y - 0.2, -z - tile * 0.5)),
					Vector3(tile * 0.95, 0.4, tile * 0.95))
		z += tile
	# Under-structure: deck beam and arches between piers.
	var built := length * broken_after
	for s in spans:
		var z0 := span_len * float(s)
		if z0 > built:
			break
		var z1 := minf(z0 + span_len, built)
		var mid := (z0 + z1) * 0.5
		block(kit, rng, Transform3D(Basis(), Vector3(0.0, deck_y - 0.9, -mid)), Vector3(width * 0.92, 1.0, z1 - z0))
		if z1 - z0 > span_len * 0.9:
			var a := arch(rng, span_len * 0.62, 0.1, width * 0.8, false)
			kit.append(a, Transform3D(Basis(Vector3.UP, PI * 0.5), Vector3(0.0, deck_y - span_len * 0.62 * 0.5 - 2.2, -mid)))
		# Pier below each span start.
		var pier_h := 9.0
		block(kit, rng, Transform3D(Basis(), Vector3(0.0, deck_y - 1.4 - pier_h * 0.5, -z0)), Vector3(width * 0.7, pier_h, 1.8))
	# Low parapets in long runs, with a few collapsed stretches.
	for side in [-1.0, 1.0]:
		var pz := 0.4
		while pz < built - 1.0:
			var run := minf(rng.randf_range(2.6, 3.4), built - pz)
			if rng.randf() > 0.18:
				var ph := rng.randf_range(0.75, 0.95)
				block(kit, rng, Transform3D(Basis(), Vector3(side * (width * 0.5 - 0.25), deck_y + ph * 0.5, -pz - run * 0.5)), Vector3(0.5, ph, run * 0.97))
			pz += run
	return kit
