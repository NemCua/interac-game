const ID=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export class Registry{
  #items=new Map();
  constructor(kind){this.kind=kind}
  register(definition,owner='core'){if(!definition||!ID.test(definition.id||''))throw new Error(`${this.kind} id must use kebab-case`);if(this.#items.has(definition.id))throw new Error(`${this.kind} "${definition.id}" is already registered`);const frozen=Object.freeze({...definition,owner});this.#items.set(frozen.id,frozen);return frozen}
  get(id){return this.#items.get(id)}
  has(id){return this.#items.has(id)}
  list(){return [...this.#items.values()]}
}
