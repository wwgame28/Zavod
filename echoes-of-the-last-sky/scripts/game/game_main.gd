extends Node3D
## Game entry: grounds the player at the spawn, switches between the third-person hero camera
## and the free inspection camera (V), keeps the HUD help in sync and reports respawns.

@export var player_path: NodePath
@export var player_camera_path: NodePath
@export var free_camera_path: NodePath
@export var hud_path: NodePath

const PLAY_HELP := "Click — capture mouse   ·   Esc — release\nWASD / arrows / left stick — move   ·   Mouse / right stick — camera\nShift — sprint   ·   Alt — walk   ·   Space — jump   ·   Wheel — zoom\nV — free camera   ·   Tab — character viewer   ·   F12 — screenshot   ·   H — help"
const FREE_HELP := "Click — capture mouse   ·   Esc — release\nRMB hold — look   ·   WASD / arrows — move\nE / Space — up   ·   Q / Ctrl — down\nShift — fast   ·   Alt — slow   ·   Wheel — speed\n1–9 — viewpoints   ·   O — cinematic orbit\nV — back to the hero   ·   F12 — screenshot   ·   H — help"

var player: PlayerController
var player_camera: ThirdPersonCamera
var free_camera: FreeCamera
var hud: WorldHud


func _ready() -> void:
	player = get_node(player_path)
	player_camera = get_node(player_camera_path)
	free_camera = get_node(free_camera_path)
	hud = get_node_or_null(hud_path)
	player.respawned.connect(_on_respawned)
	set_free_camera(false)
	var spawn := MainIsland.SPAWN
	player.global_position = Vector3(spawn.x, player.global_position.y, spawn.y)
	await get_tree().physics_frame
	ground_player()


## Drops the player onto the ground below the authored spawn point.
func ground_player() -> void:
	var p := player.global_position
	var hit := get_world_3d().direct_space_state.intersect_ray(
			PhysicsRayQueryParameters3D.create(p + Vector3(0, 30, 0), p - Vector3(0, 60, 0), 1))
	if not hit.is_empty():
		player.teleport(hit.position + Vector3(0, 0.05, 0))
	player_camera.recenter()


func set_free_camera(on: bool) -> void:
	player.input_enabled = not on
	if on:
		free_camera.global_transform = player_camera.camera.global_transform
		free_camera.sync_angles()
		free_camera.make_current()
	else:
		player_camera.camera.make_current()
	if hud:
		hud.set_help(FREE_HELP if on else PLAY_HELP)
		hud.set_speed_visible(on)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_camera"):
		var to_free := not free_camera.current
		set_free_camera(to_free)
		if hud:
			hud.toast("Free camera" if to_free else "Sky Wanderer")


func _on_respawned() -> void:
	player_camera.recenter()
	if hud:
		hud.toast("The winds carry you back…")
