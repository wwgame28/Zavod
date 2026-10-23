@tool
class_name HeightGrid
extends RefCounted
## Baked samples of an IslandShape (height, path mask, meadow mask) on a regular grid.
## Prop scattering queries thousands of points; bilinear lookups here are far cheaper than
## evaluating the analytic shape each time.

var origin := Vector2.ZERO
var cell := 2.0
var nx := 0
var nz := 0
var heights := PackedFloat32Array()
var paths := PackedFloat32Array()
var meadow := PackedFloat32Array()
var inside := PackedByteArray()


static func bake(shape: IslandShape, cell_size: float) -> HeightGrid:
	var g := HeightGrid.new()
	var ext := Vector2(shape.radius * shape.aspect.x, shape.radius * shape.aspect.y) * (1.0 + shape.coast_noise * 1.6)
	g.cell = cell_size
	g.origin = -ext
	g.nx = int(ext.x * 2.0 / cell_size) + 2
	g.nz = int(ext.y * 2.0 / cell_size) + 2
	var count := g.nx * g.nz
	g.heights.resize(count)
	g.paths.resize(count)
	g.meadow.resize(count)
	g.inside.resize(count)
	for j in g.nz:
		for i in g.nx:
			var x := g.origin.x + float(i) * cell_size
			var z := g.origin.y + float(j) * cell_size
			var k := j * g.nx + i
			var rn := shape.radial_norm(x, z)
			g.inside[k] = 1 if rn < 1.0 else 0
			if rn < 1.05:
				g.heights[k] = shape.height(x, z)
				g.paths[k] = shape.path_mask(x, z)
				g.meadow[k] = shape.meadow_mask(x, z)
			else:
				g.heights[k] = -50.0
	return g


func _lookup(arr: PackedFloat32Array, x: float, z: float) -> float:
	var fx := clampf((x - origin.x) / cell, 0.0, float(nx - 1) - 0.001)
	var fz := clampf((z - origin.y) / cell, 0.0, float(nz - 1) - 0.001)
	var i := int(fx)
	var j := int(fz)
	var tx := fx - float(i)
	var tz := fz - float(j)
	var k := j * nx + i
	var a := lerpf(arr[k], arr[k + 1], tx)
	var b := lerpf(arr[k + nx], arr[k + nx + 1], tx)
	return lerpf(a, b, tz)


func height(x: float, z: float) -> float:
	return _lookup(heights, x, z)


func path(x: float, z: float) -> float:
	return _lookup(paths, x, z)


func meadow_at(x: float, z: float) -> float:
	return _lookup(meadow, x, z)


func normal(x: float, z: float) -> Vector3:
	var e := cell
	return Vector3(height(x - e, z) - height(x + e, z), 2.0 * e, height(x, z - e) - height(x, z + e)).normalized()


## Lowest height under a footprint, so props never float above slopes.
func ground_min(x: float, z: float, r: float) -> float:
	var h := height(x, z)
	h = minf(h, height(x + r, z))
	h = minf(h, height(x - r, z))
	h = minf(h, height(x, z + r))
	return minf(h, height(x, z - r))
