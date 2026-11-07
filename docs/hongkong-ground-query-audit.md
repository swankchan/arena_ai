# Ground-query scope regression

The `simple-world.js` ground chain calls multiple venue callbacks for each non-road point. Six callbacks passed `max(fallback, venueDatum)` to a site-limited function, so even a point outside every venue inherited the highest venue datum. This could put the player's queried ground above the visible surface across unrelated parts of Hong Kong. The maximum is now applied only by the site-limited terrain function. The callbacks still preserve higher existing ground within each site, and the existing simple-world road priority is unchanged.

Ocean Park's callback also applied raw DTM globally, potentially undoing another site's lower authored surface (for example the Lai Yuen cut). Its raw-height safeguard is now limited to the two mapped park rings. The normal incoming fallback already contains the terrain chain; there is no claim that the park's station terraces are now walkable.

`tests/venue-ground-scope.test.cjs` checks all six venue callbacks outside and inside their sites, with both low and high fallback heights, and checks that Ocean Park does not raise an unrelated lowered surface. This is a code-level regression, not a complete visual or in-game verification; other causes of uneven ground and the racecourse layout conflicts remain unresolved.
