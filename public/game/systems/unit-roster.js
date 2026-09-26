export class UnitRoster{
  #scene;#units=new Map();
  constructor(scene){this.#scene=scene}
  add({id,type,faction,object,hardpoints={},stats={}}){if(!id||this.#units.has(id))throw new Error(`Duplicate or missing unit id: ${id}`);const unit={id,type,faction,object,hardpoints,stats:{maxHp:100,hp:100,...stats},alive:true};this.#units.set(id,unit);if(object&&!object.parent)this.#scene.add(object);return unit}
  remove(id){const unit=this.#units.get(id);if(!unit)return false;unit.object?.removeFromParent();this.#units.delete(id);return true}
  clear(){for(const unit of this.#units.values())unit.object?.removeFromParent();this.#units.clear()}
  get(id){return this.#units.get(id)}
  list({faction,type}={}){return[...this.#units.values()].filter(unit=>(!faction||unit.faction===faction)&&(!type||unit.type===type))}
  update(dt){for(const unit of this.#units.values())unit.update?.(dt)}
}
