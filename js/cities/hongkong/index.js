import { buildHongKongWorld } from './world.js';
import { createHongKongTraffic } from './traffic.js';
import { createHongKongCrowd } from './crowd.js';
import { createHongKongHarbour } from './harbour.js';
import { HKGMapSystem } from './map.js';
import { HKAudioSystem } from './audio.js';
import {
  TELEPORTS,
  ROAD_NAMES,
  PLACE_NAMES,
  SPAWN,
  getLocationLabel
} from './meta.js';

// Hong Kong pack: a unified flat OSM road map across Hong Kong Island, Kowloon, the New Territories and islands.
// Dynamic Hong Kong traffic and harbour life remain separate from the static ground so content can be built up over time.

const TAXI_STYLE = 'hk-urban';

export const city = {
  id: 'hongkong',
  name: '香港 Hong Kong',
  short: 'HK',
  storageKey: 'slop-hongkong-player-state',
  teleports: TELEPORTS,
  locationLabel: getLocationLabel,
  roadNames: ROAD_NAMES,
  placeNames: PLACE_NAMES,
  cameraPresets: [
    'chase', 'action', 'pov',
    'victoriaHarbour', 'centralSkyline', 'tsimShaTsui', 'mongKok', 'causewayBay', 'harbourDrone'
  ],
  defaultMode: 'car',

  build({ scene, markInit, setStatus }) {
    setStatus('Building Hong Kong’s unified flat road map...');

    const world = buildHongKongWorld(scene, { setStatus });
    markInit?.('world');

    // The traffic restaging halo follows the camera. CameraSystem is created after build(), so the focus is a mutable
    // point that update() keeps in sync.
    const focus = { x: SPAWN.car.x, z: SPAWN.car.z };
    const traffic = createHongKongTraffic(scene, { getFocus: () => focus, taxiStyle: TAXI_STYLE });
    markInit?.('traffic');

    const harbour = createHongKongHarbour(scene);
    const crowd = createHongKongCrowd(scene, { getGroundHeight: world.getGroundHeight });
    markInit?.('harbour');
    markInit?.('crowd');

    const stats = {
      ...world.stats,
      cars: traffic.cars.length,
      buses: traffic.buses.length,
      walkers: crowd.walkers.length,
      trams: harbour.trams.length,
      ferries: harbour.ferries.length
    };
    console.info('[hongkong] world ready', stats);

    return {
      colliders: world.colliders,
      dynamicRoots: [traffic.group, harbour.group, crowd.group],
      stats,
      teleports: TELEPORTS,
      cameraPresets: city.cameraPresets,
      roadNames: ROAD_NAMES,
      placeNames: PLACE_NAMES,
      locationLabel: getLocationLabel,
      defaultMode: city.defaultMode,
      theme: {
        car: {
          label: '香港的士',
          taxiStyle: TAXI_STYLE
        }
      },
      entityLabels: {
        person: '行人',
        car: '香港的士',
        cyclist: '單車',
        helicopter: '觀光直升機'
      },

      player: {
        bounds: world.bounds,
        isPointOnSidewalk: world.isPointOnSidewalk,
        getGroundHeight: world.getGroundHeight
      },

      spawn(mode) {
        if (mode === 'person') {
          return {
            x: world.personSpawn.x,
            z: world.personSpawn.z,
            heading: world.personSpawn.heading
          };
        }
        return SPAWN[mode] ?? SPAWN.car;
      },

      update(dt, elapsed, { cameraSystem, controllerManager }) {
        focus.x = cameraSystem.currentPos.x;
        focus.z = cameraSystem.currentPos.z;
        world.update(dt, elapsed, { cameraSystem });
        traffic.update(dt, controllerManager);
        crowd.update(dt, elapsed, cameraSystem.currentPos);
        harbour.update(dt, elapsed);
      },

      createMap({ controllerManager, cameraSystem, onToggle, onTeleport }) {
        return new HKGMapSystem({ controllerManager, cameraSystem, onToggle, onTeleport });
      },

      createAudio({ onStateChange }) {
        return new HKAudioSystem({ onStateChange });
      }
    };
  }
};
