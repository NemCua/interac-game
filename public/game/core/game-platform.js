import{EventBus}from'./event-bus.js';
import{Registry}from'./registry.js';

export const MOD_API_VERSION='1.0.0';

export class GamePlatform{
  constructor({logger=console}={}){this.logger=logger;this.events=new EventBus();this.modes=new Registry('mode');this.maps=new Registry('map');this.systems=new Registry('system');this.mods=new Registry('mod');this.active=null;this.api=null}
  createModApi(owner){return Object.freeze({apiVersion:MOD_API_VERSION,on:(...args)=>this.events.on(...args),emit:(...args)=>this.events.emit(...args),registerMode:def=>this.modes.register(def,owner),registerMap:def=>this.maps.register(def,owner),registerSystem:def=>this.systems.register(def,owner),getMode:id=>this.modes.get(id),getMap:id=>this.maps.get(id)})}
  registerMod(mod){if(!mod?.id||typeof mod.setup!=='function')throw new Error('Invalid mod: id and setup(api) are required');const registered=this.mods.register(mod,'external');if(mod.apiVersion&&mod.apiVersion!==MOD_API_VERSION)throw new Error(`Mod ${mod.id} requires API ${mod.apiVersion}; game provides ${MOD_API_VERSION}`);mod.setup(this.createModApi(mod.id));return registered}
  activateMode(id,api){const definition=this.modes.get(id);if(!definition)throw new Error(`Unknown game mode: ${id}`);this.active?.dispose?.();this.api=Object.freeze(api);const map=this.maps.get(definition.map);if(!map)throw new Error(`Mode ${id} references missing map ${definition.map}`);const session=definition.createSession?.({api:this.api,map,events:this.events,platform:this})||{};this.active={definition,map,session};session.start?.();this.events.emit('mode:started',{mode:definition,map});return this.active}
  update(dt){this.active?.session?.update?.(dt)}
  reset(reason='manual'){this.active?.session?.reset?.(reason);this.events.emit('game:reset',{reason,mode:this.active?.definition})}
  pipe(type,payload){return this.events.pipe(type,payload)}
  emit(type,payload){this.active?.session?.onEvent?.(type,payload);this.events.emit(type,payload)}
  describe(){return{apiVersion:MOD_API_VERSION,activeMode:this.active?.definition?.id||null,modes:this.modes.list().map(({id,name,owner})=>({id,name,owner})),maps:this.maps.list().map(({id,name,owner})=>({id,name,owner})),mods:this.mods.list().map(({id,name})=>({id,name}))}}
}

export async function loadModManifest(platform,url='/mods/manifest.json'){
  const response=await fetch(url,{cache:'no-store'});if(!response.ok){if(response.status===404)return[];throw new Error(`Cannot load mod manifest: HTTP ${response.status}`)}
  const manifest=await response.json(),entries=Array.isArray(manifest.mods)?manifest.mods:[];
  const loaded=[];for(const entry of entries){if(entry.enabled===false)continue;if(typeof entry.module!=='string'||!entry.module.startsWith('/mods/'))throw new Error('Mod modules must be served from /mods/');const imported=await import(entry.module),mod=imported.default||imported.mod;platform.registerMod(mod);loaded.push(mod.id)}return loaded
}
