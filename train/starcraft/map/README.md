Test the logic for finding nexus locations and plots for other structures.

First, put the name of the map in maps.js:13:

```
export const MAP = "HardwireAIE";
```

Then call:

```
node ./train/starcraft/map/maps-read.js
node ./train/starcraft/map/maps-bases.js
node ./train/starcraft/map/maps-show.js
```
