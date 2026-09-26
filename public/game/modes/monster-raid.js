export const monsterRaidMode={
  id:'monster-raid',name:'Monster Raid',schemaVersion:1,map:'monster-forest',tags:['pve','waves','bosses','arena-only'],
  factions:[{id:'players',controller:'audience'},{id:'monsters',controller:'ai'}],
  createSession({api,events}){let removeSkillGuard;return{
    start(){api.setPresentation?.('monster-raid');api.setArenaLayout?.('monster');api.setLegacyGameplay?.(true);removeSkillGuard=events.on('skill:requested',request=>request.team===0&&request.skill==='storm'?request:{...request,cancelled:true},{priority:1000});api.log?.('[Mode] Monster Raid arena ready')},
    update(){},reset(){},onEvent(){},
    dispose(){removeSkillGuard?.();api.setLegacyGameplay?.(true);api.setArenaLayout?.('country');api.setPresentation?.('country-battle')}
  }}
};
