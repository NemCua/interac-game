export const countryBattleMode={
  id:'country-battle',name:'Country Battle',schemaVersion:1,map:'classic-arena',tags:['pvp','territory','legacy-compatible'],
  factions:[{id:'thailand',controller:'audience'},{id:'vietnam',controller:'audience'},{id:'japan',controller:'audience'},{id:'china',controller:'audience'}],
  createSession({api}){return{start(){api.setPresentation?.('country-battle');api.setArenaLayout?.('country');api.setLegacyGameplay?.(true);api.log?.('[Mode] Country Battle started')},update(){},reset(){},onEvent(){},dispose(){}}}
};
