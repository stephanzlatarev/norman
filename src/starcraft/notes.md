#### Step
```
await game.step()
5; for (let i = 0; i < 20; i++) await game.step()
```

#### Find selected unit
```
game.state.observation.rawData.units.find(unit => unit.isSelected)
```

#### Find Nexus
```
game.state.observation.rawData.units.find(unit => unit.unitType === 59)
```

#### Warp in probe
```
await game.client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [4347396097], abilityId: 1006, queueCommand: false, target: {} } } }] })
```

#### Chat
```
await game.client.action({ actions: [{ actionChat: { channel: 1, message: "Test" } }] })
```

#### Console

```
process.stdin.on("data", data => {
  try {
    eval(`
      async function go() {
        const result = ${data.toString()};
        console.log(result);
      }
      go().catch(error => console.log("ERROR:", error))
    `);
  } catch (error) {
    console.log(error);
  }
});
```
