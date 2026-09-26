import test from'node:test';
import assert from'node:assert/strict';
import{EventBus}from'../public/game/core/event-bus.js';
import{GamePlatform}from'../public/game/core/game-platform.js';
import{registerBuiltins}from'../public/game/register-builtins.js';
import{UnitRoster}from'../public/game/systems/unit-roster.js';

test('event pipelines run in priority order and can transform combat data',()=>{const bus=new EventBus();bus.on('damage',hit=>({...hit,amount:hit.amount+2}),{priority:5});bus.on('damage',hit=>({...hit,amount:hit.amount*3}));assert.equal(bus.pipe('damage',{amount:1}).amount,9)});

test('a mod can register a map and mode with lifecycle hooks',()=>{const calls=[],platform=new GamePlatform({logger:{}});platform.registerMod({id:'test-mod',apiVersion:'1.0.0',setup(api){api.registerMap({id:'test-map',name:'Test Map'});api.registerMode({id:'test-mode',name:'Test Mode',map:'test-map',createSession(){return{start:()=>calls.push('start'),update:()=>calls.push('update'),reset:()=>calls.push('reset')}}})}});platform.activateMode('test-mode',{});platform.update(.016);platform.reset();assert.deepEqual(calls,['start','update','reset']);assert.equal(platform.describe().activeMode,'test-mode')});

test('registries reject duplicate content ids',()=>{const platform=new GamePlatform();platform.maps.register({id:'same-map'});assert.throws(()=>platform.maps.register({id:'same-map'}),/already registered/)});

test('built-in content exposes country battle and monster raid independently',()=>{const platform=registerBuiltins(new GamePlatform());assert.equal(platform.modes.get('country-battle').map,'classic-arena');assert.equal(platform.modes.get('monster-raid').map,'monster-forest')});

test('unit roster supports multiple unit types and factions',()=>{const scene={add(object){object.parent=this}},roster=new UnitRoster(scene),cannon={parent:null,removeFromParent(){this.parent=null}},robot={parent:null,removeFromParent(){this.parent=null}};roster.add({id:'cannon-1',type:'cannon',faction:'players',object:cannon});roster.add({id:'robot-1',type:'robot',faction:'monsters',object:robot,hardpoints:{gun:{},rocket:{}}});assert.equal(roster.list().length,2);assert.equal(roster.list({faction:'monsters'})[0].hardpoints.rocket!==undefined,true);roster.clear();assert.equal(roster.list().length,0)});
