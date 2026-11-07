import { authoredOsmSource, makeAuthoredSite } from './authored-landmark-site.js';

// OSM way 107324765 is a landuse parcel, not a surveyed building outline. The
// facade geometry inside it is interpreted from Seidler's design and photographs.
export const HONG_KONG_CLUB_SOURCE = authoredOsmSource({
  id: 107324765, version: 8, sourceTimestamp: '2025-01-22T03:29:37Z',
  tags: {landuse:'commercial', name:'香港會所大廈 The Hong Kong Club Building', 'addr:housenumber':'3A', 'addr:street':'Chater Road'},
  geometry: [
    {lat:22.2817617,lon:114.1609586},{lat:22.2816775,lon:114.1612775},
    {lat:22.2812488,lon:114.1611452},{lat:22.2813331,lon:114.1608263},
    {lat:22.2817617,lon:114.1609586},
  ],
  evidence:'OSM landuse parcel, not a building footprint; massing and facades are photo-directed approximations.'
});
export const HONG_KONG_CLUB_SITE = makeAuthoredSite('hongKongClub','香港會所大廈','The Hong Kong Club Building',HONG_KONG_CLUB_SOURCE,{height:87.4,levels:23});
export const HONG_KONG_CLUB_HEIGHT = 87.4;
export const HONG_KONG_CLUB_OFFICE_FLOORS = 17;
export const HONG_KONG_CLUB_SOURCES = Object.freeze([
  'https://seidler.net.au/earlier/projects/020Sub.html',
  'https://www.skyscrapercenter.com/building/the-hong-kong-club-building/13061',
  'https://commons.wikimedia.org/wiki/Category:Hong_Kong_Club_Building',
]);
