// Sampling diagnostic, not an exact polygon-intersection or driving test.
import { GPO_SITE, GPO_WING } from '../../../js/cities/hongkong/general-post-office-architecture.js';
import { fullRoadSurfaceAt } from '../../../js/cities/hongkong/full-meta.js';
import { hongKongTerrainHeight } from '../../../js/cities/hongkong/terrain.js';
import { pointInFlatRing } from '../../../js/cities/hongkong/landmark-site.js';
import { IFC_MALL_PARTS } from '../../../js/cities/hongkong/ifc-mall-architecture.js';
for (const site of [GPO_SITE,GPO_WING]) {
 const roads={}, roadHeights={}, base=hongKongTerrainHeight(site.x,site.z);let ifcOverlap=0;
 for(let x=site.bounds.minX;x<site.bounds.maxX;x+=1)for(let z=site.bounds.minZ;z<site.bounds.maxZ;z+=1){
  if(!pointInFlatRing(site.ring,x,z))continue;
  const road=fullRoadSurfaceAt(x,z,0,hongKongTerrainHeight(x,z));
  if(road){const id=road.way.id;roads[id]=(roads[id]||0)+1;let h=roadHeights[id]||[Infinity,-Infinity];h[0]=Math.min(h[0],road.height);h[1]=Math.max(h[1],road.height);roadHeights[id]=h;}
  if(IFC_MALL_PARTS.some(part=>pointInFlatRing(part.site.ring,x,z)))ifcOverlap++;
 }
 console.log(JSON.stringify({osmId:site.osmId,base,area:site.ringArea,roads,roadHeights,ifcOverlap},null,2));
}
