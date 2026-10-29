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

// Hong Kong pack: both shores of Victoria Harbour, from Central to Mong Kok, built from real OpenStreetMap blocks,
// streets and landmark sites. The engine in js/main.js only sees the world object returned by build().

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
    setStatus('Building Victoria Harbour, Central & Kowloon...');

    const world = buildHongKongWorld(scene, { setStatus });
    markInit?.('world');

    // The traffic restaging halo follows the camera. CameraSystem is created after build(), so the focus is a mutable
    // point that update() keeps in sync.
    const focus = { x: SPAWN.car.x, z: SPAWN.car.z };
    const traffic = createHongKongTraffic(scene, { getFocus: () => focus });
    markInit?.('traffic');

    const harbour = createHongKongHarbour(scene);
    const crowd = createHongKongCrowd(scene);
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
          paint: 0xc6202b,
          label: '香港的士',
          taxiLivery: false,
          nycDoorDecals: false,
          plate: 'hk'
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
