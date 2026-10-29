// Shared arrival handling for the teleport menu and the full-screen map.
// A city may have no map, so the map reference is resolved lazily through getMapSystem().
export function createTeleportTo({
  controllerManager,
  touchControls,
  gamepadControls,
  cameraSystem,
  selectCamera,
  getMapSystem,
  locationLabel
}) {
  return function teleportTo(x, z, heading = Math.PI) {
    const destination = controllerManager.teleportActiveTo(x, z, heading);
    touchControls.reset();
    gamepadControls.reset();
    cameraSystem.resetForTeleport();
    selectCamera('chase', true);
    const mapSystem = getMapSystem();
    if (mapSystem) {
      mapSystem.waypoint = { x: destination.x, z: destination.z, name: locationLabel(destination.x, destination.z) };
    }
    return destination;
  };
}
