export class EventBus{
  #listeners=new Map();
  on(type,handler,{priority=0}={}){if(typeof handler!=='function')throw new TypeError('Event handler must be a function');const entry={handler,priority};const list=this.#listeners.get(type)||[];list.push(entry);list.sort((a,b)=>b.priority-a.priority);this.#listeners.set(type,list);return()=>this.off(type,handler)}
  off(type,handler){const list=this.#listeners.get(type);if(!list)return;const next=list.filter(entry=>entry.handler!==handler);next.length?this.#listeners.set(type,next):this.#listeners.delete(type)}
  emit(type,payload){for(const entry of [...(this.#listeners.get(type)||[])])entry.handler(payload)}
  pipe(type,payload){let value=payload;for(const entry of [...(this.#listeners.get(type)||[])])value=entry.handler(value)??value;return value}
  clear(){this.#listeners.clear()}
}
