import { buildCityGrid } from '../../city-grid.js';
import { buildBoroughs } from '../../boroughs.js';
import { buildLandmarks } from '../../landmarks.js';
import { buildCityBlocks } from '../../buildings.js';
import { buildStreetDetails } from '../../street-details.js';
import { createTrafficSystem, createHighwayTraffic } from '../../traffic.js';
import { buildRoadPaint } from '../../road-paint.js';
import { NYCMapSystem } from '../../nyc-map.js';
import { CityAudioSystem } from '../../audio-system.js';
import { setupSceneCulling, updateSceneCulling } from '../../scene-culling.js';
import { TELEPORTS, ROAD_NAMES, PLACE_NAMES, getLocationLabel } from './meta.js';

// New York City pack: the real Manhattan world (city-grid, buildings, landmarks, traffic, map, audio).
// The engine in js/main.js only sees the world object returned by build().
export const city = {
  id: 'newyork',
  name: 'New York',
  short: 'NY',
  storageKey: 'nyc-player-state',
  teleports: TELEPORTS,
  locationLabel: getLocationLabel,
  roadNames: ROAD_NAMES,
  placeNames: PLACE_NAMES,
  cameraPresets: [
    'chase', 'action', 'pov',
    'centralPark', 'fifthAve', 'timesSquare', 'chryslerGCT', 'observatory', 'bryantPark', 'waterfront', 'drone'
  ],
  spawn: null, // keep the original 5th Ave & 37th St spawns

  build({ scene, lightingSystem, markInit, setStatus }) {
    setStatus('Constructing Manhattan Grid, Landmarks & Streetscape...');

    const cityGrid = buildCityGrid(scene);
    markInit('cityGrid');
    const boroughs = buildBoroughs(scene, { sidewalks: cityGrid.sidewalks });
    markInit('boroughs');
    const { colliders: landmarkColliders } = buildLandmarks(scene);
    markInit('landmarks');
    const cityBlocks = buildCityBlocks(scene);
    markInit('blocks');
    const allColliders = [
      ...landmarkColliders,
      ...cityBlocks.colliders,
      ...boroughs.colliders,
      ...(cityGrid.colliders || [])
    ];

    const streetDetails = buildStreetDetails(scene, allColliders);
    markInit('streetDetails');
    // Buildings turned along non-grid streets have oriented colliders whose world bounds reach past their lots: they
    // stay inside the property line anyway, so the road network (lanes & sidewalks) doesn't need them. Elevated
    // building sections that clear even a bus don't obstruct ground traffic.
    const trafficSystem = createTrafficSystem(scene, cityGrid.sidewalks, [
      ...cityGrid.footprints,
      ...streetDetails.footprints,
      ...allColliders.filter((c) => !c.obb && (c.minY ?? 0) < 3.5)
    ], streetDetails.signalIntersections);
    markInit('traffic');
    const highwayTraffic = createHighwayTraffic(scene, cityGrid.highwayLanes);
    buildRoadPaint(scene, trafficSystem.network);
    markInit('roadPaint');

    // Island-wide static geometry: chunk & distance-cull the small props, shadow stand-ins for the big casters
    const cullingRoots = ['ManhattanCityGrid', 'ManhattanCityBlocks', 'ManhattanStreetDetails', 'ManhattanLandmarks', 'Boroughs']
      .map((name) => scene.getObjectByName(name))
      .filter(Boolean);
    setupSceneCulling(scene, cullingRoots, lightingSystem.sunLight.shadow);
    markInit('culling');

    const dynamicRoots = [
      trafficSystem.group,
      highwayTraffic.group,
      scene.getObjectByName('StoreClusteredLights'),
      scene.getObjectByName('StreetClusteredLights')
    ].filter(Boolean);

    return {
      colliders: allColliders,
      dynamicRoots,
      spawn: null,
      teleports: TELEPORTS,
      cameraPresets: [
        'chase', 'action', 'pov',
        'centralPark', 'fifthAve', 'timesSquare', 'chryslerGCT', 'observatory', 'bryantPark', 'waterfront', 'drone'
      ],
      roadNames: ROAD_NAMES,
      placeNames: PLACE_NAMES,
      locationLabel: getLocationLabel,
      defaultMode: 'car',

      update(dt, elapsed, { cameraSystem, controllerManager }) {
        streetDetails.signalClock.value = elapsed;
        trafficSystem.update(
          dt,
          elapsed,
          cameraSystem.currentPos,
          controllerManager.getActiveEntity(),
          controllerManager.activeMode,
          cameraSystem.camera
        );
        highwayTraffic.update(dt, cameraSystem.camera, controllerManager.getActiveEntity(), controllerManager.activeMode);
        if (boroughs.update) boroughs.update(elapsed); // Roosevelt Island Tramway cabins
        cityBlocks.update(cameraSystem.currentPos.x, cameraSystem.currentPos.z);
        if (cityBlocks.updateLights) cityBlocks.updateLights(cameraSystem.camera);
        if (streetDetails.update) streetDetails.update(cameraSystem.camera);
      },

      updateCulling(position) {
        updateSceneCulling(position);
      },

      createMap({ controllerManager, cameraSystem, onToggle, onTeleport }) {
        return new NYCMapSystem({
          controllerManager,
          cameraSystem,
          trafficSystem,
          allBlocks: cityBlocks.allBlocks,
          onToggle,
          onTeleport
        });
      },

      createAudio({ controllerManager, onStateChange }) {
        return new CityAudioSystem(
          { controllerManager, trafficSystem, highwayTraffic, streetDetails },
          { onStateChange }
        );
      }
    };
  }
};
