export default{
  id:'example-combat-log',name:'Example Combat Log',apiVersion:'1.0.0',
  setup(api){api.on('combat:after-damage',event=>console.debug('[Combat Log]',event))}
};
