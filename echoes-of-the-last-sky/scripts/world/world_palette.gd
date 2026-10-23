@tool
class_name WorldPalette
extends RefCounted
## Shared materials and colours for the Shattered Reach, so every generator speaks the same style.

const TERRAIN := preload("res://materials/terrain.tres")
const ROCK := preload("res://materials/rock.tres")
const RUIN := preload("res://materials/ruin.tres")
const BARK := preload("res://materials/bark.tres")
const FOLIAGE := preload("res://materials/foliage.tres")
const BLOSSOM := preload("res://materials/foliage_blossom.tres")
const GRASS := preload("res://materials/grass.tres")
const FLOWER := preload("res://materials/flower.tres")
const CRYSTAL := preload("res://materials/crystal.tres")
const WATER := preload("res://materials/water.tres")
const WATERFALL := preload("res://materials/waterfall.tres")
const CLOUD_SEA := preload("res://materials/cloud_sea.tres")
const CLOUD_PUFF := preload("res://materials/cloud_puff.tres")
const WISP := preload("res://materials/wisp.tres")
const GLOW := preload("res://materials/glow.tres")
const MOTE := preload("res://materials/mote.tres")
const PETAL := preload("res://materials/petal.tres")

const LEAF_GREEN := Color(0.4, 0.68, 0.3)
const LEAF_DEEP := Color(0.24, 0.52, 0.37)
const LEAF_LIME := Color(0.62, 0.8, 0.33)
const LEAF_TEAL := Color(0.36, 0.74, 0.66)
const LEAF_BLOSSOM := Color(1.0, 0.74, 0.85)
const LEAF_PINE := Color(0.2, 0.45, 0.4)
const BARK_BROWN := Color(0.5, 0.38, 0.31)
const BARK_PALE := Color(0.78, 0.7, 0.66)
const ROCK_A := Color(0.88, 0.82, 0.72)
const ROCK_B := Color(0.76, 0.67, 0.6)
const ROCK_UNDER := Color(0.5, 0.42, 0.55)
const ROCK_DEEP := Color(0.3, 0.27, 0.43)
const FLOWER_COLORS: Array[Color] = [
	Color(1.0, 0.98, 0.92), Color(0.62, 0.8, 1.0), Color(1.0, 0.88, 0.45), Color(1.0, 0.68, 0.8),
]


## Builds a two-surface tree mesh from a TreeFactory result.
static func tree_mesh(parts: Dictionary, leaves: Material = FOLIAGE) -> ArrayMesh:
	var mesh := ArrayMesh.new()
	var bark: MeshKit = parts["bark"]
	var leaf: MeshKit = parts["leaves"]
	if not bark.is_empty():
		bark.commit(mesh, BARK)
	leaf.commit(mesh, leaves)
	return mesh
