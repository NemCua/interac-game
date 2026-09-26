import{classicArena}from'./maps/classic-arena.js';
import{monsterForest}from'./maps/monster-forest.js';
import{countryBattleMode}from'./modes/country-battle.js';
import{monsterRaidMode}from'./modes/monster-raid.js';
export function registerBuiltins(platform){platform.maps.register(classicArena);platform.maps.register(monsterForest);platform.modes.register(countryBattleMode);platform.modes.register(monsterRaidMode);return platform}
