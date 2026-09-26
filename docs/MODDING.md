# Modding API

The game uses a versioned engine/plugin boundary. Built-in content and external mods use the same registries.

## Mod manifest

Add same-origin ES modules to `public/mods/manifest.json`. A disabled example is included. Modules outside `/mods/` are rejected intentionally.

```json
{"schemaVersion":1,"mods":[{"id":"my-mod","module":"/mods/my-mod.js","enabled":true}]}
```

## Mod contract

```js
export default {
  id: 'my-mod',
  name: 'My Mod',
  apiVersion: '1.0.0',
  setup(api) {
    api.registerMap({ id: 'my-map', name: 'My Map' });
    api.registerMode({
      id: 'my-mode',
      name: 'My Mode',
      map: 'my-map',
      createSession({ api, map, events }) {
        return { start(){}, update(dt){}, reset(){}, onEvent(type,event){}, dispose(){} };
      }
    });
    api.on('combat:before-damage', hit => ({ ...hit, amount: hit.amount * 2 }));
  }
};
```

IDs use kebab-case and may not replace existing registrations. A mod must declare the matching `apiVersion`. Breaking API changes require a new major version.

## Stable events

- `mode:started`
- `game:reset`
- `game:update`
- `combat:before-damage` (pipeline; return a changed payload)
- `combat:after-damage`
- `entity:eliminated`
- `skill:requested`

Mods should use the public API and events, not import implementation details from `app.js`.
