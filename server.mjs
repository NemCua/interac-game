import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const BASE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(BASE, 'public');
const ASSETS = join(BASE, 'assets');
const IMPACT_SOUND_DIR=join(ASSETS,'sound-effect','bob');
const PORT = Number(process.env.PORT || 8787);
let impactSoundUrls=[];
async function scanImpactSounds(){try{const files=await readdir(IMPACT_SOUND_DIR,{withFileTypes:true});impactSoundUrls=files.filter(file=>file.isFile()&&/\.(mp3|wav|ogg)$/i.test(file.name)).map(file=>`/assets/sound-effect/bob/${encodeURIComponent(file.name)}`).sort();console.log(`[Sound] Đã nạp ${impactSoundUrls.length} âm thanh va chạm`)}catch(error){impactSoundUrls=[];console.warn('[Sound] Không quét được thư mục âm thanh va chạm:',error.message)}}
await scanImpactSounds();
const clients = new Set();
const tikTokClients = new Set();
let tikTokProcess=null;
let tikTokStatus={username:'',connected:false,connecting:false,eventCount:0,lastError:'',bridge:'python'};
let tikTokLogs=[];
function publicTikTokStatus(){return {...tikTokStatus,bridge:'python'}}
function broadcastTikTok(payload){const line=`data: ${JSON.stringify(payload)}\n\n`;for(const client of tikTokClients)client.write(line)}
function tikTokLog(type,data={}){const entry={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,time:new Date().toISOString(),type,data};tikTokLogs.push(entry);tikTokLogs=tikTokLogs.slice(-150);if(type==='error')console.error('[TikTok LIVE]',data.message||data);else console.log(`[TikTok LIVE:${type}]`,data);broadcastTikTok({kind:'log',entry,status:publicTikTokStatus()})}
async function connectTikTok(username){
  const uniqueId=String(username||'').trim().replace(/^@/,'');if(!uniqueId)throw new Error('Hãy nhập username TikTok');
  disconnectTikTok(false);
  tikTokStatus={username:uniqueId,connected:false,connecting:true,eventCount:0,lastError:'',bridge:'python'};tikTokLogs=[];broadcastTikTok({kind:'status',status:publicTikTokStatus()});
  const script=join(fileURLToPath(new URL('.',import.meta.url)),'tiktok_python_probe.py');
  const python=process.env.PYTHON || 'python3';
  tikTokProcess=spawn(python,['-u',script,uniqueId],{stdio:['ignore','pipe','pipe']});
  const readLines=(chunk,handler)=>String(chunk).split(/\r?\n/).filter(Boolean).forEach(handler);
  tikTokProcess.stdout.on('data',chunk=>readLines(chunk,line=>{
    let msg;try{msg=JSON.parse(line)}catch{tikTokLog('raw',{line});return}
    const type=msg.kind||'event';
    if(type==='connecting'){tikTokStatus.connecting=true}
    else if(type==='connected'){tikTokStatus.connected=true;tikTokStatus.connecting=false}
    else if(type==='disconnected'||type==='manual_disconnect'){tikTokStatus.connected=false;tikTokStatus.connecting=false}
    else if(type==='error'){tikTokStatus.lastError=msg.data?.message||'Python bridge error';tikTokStatus.connected=false;tikTokStatus.connecting=false}
    if(!['connecting'].includes(type))tikTokStatus.eventCount++;
    tikTokLog(type,msg.data||{})
  }));
  tikTokProcess.stderr.on('data',chunk=>readLines(chunk,line=>tikTokLog('stderr',{line})));
  tikTokProcess.on('exit',(code,signal)=>{
    if(tikTokProcess){tikTokProcess=null;tikTokStatus.connected=false;tikTokStatus.connecting=false;tikTokLog('process_exit',{code,signal})}
  });
  return publicTikTokStatus()
}
function disconnectTikTok(shouldLog=true){
  if(tikTokProcess){const child=tikTokProcess;tikTokProcess=null;child.kill('SIGINT')}
  tikTokStatus.connected=false;tikTokStatus.connecting=false;
  if(shouldLog)tikTokLog('manual_disconnect',{username:tikTokStatus.username});
  return publicTikTokStatus()
}
const newState = () => ({ phase:'waiting',round:1,secondsLeft:90,red:500,blue:500,maxHp:500,combo:{team:null,count:0},events:[],winner:null,players:{},totals:{comments:0,gifts:0,likes:0},updatedAt:Date.now() });
let state = newState(); let timer;
function publicState(){const all=Object.values(state.players);const leaders=[...all].sort((a,b)=>b.score-a.score).slice(0,5);const teamCounts={red:all.filter(p=>p.team==='red').length,blue:all.filter(p=>p.team==='blue').length};return {...state,players:undefined,leaders,teamCounts}}
function broadcast(){state.updatedAt=Date.now();const payload=`data: ${JSON.stringify(publicState())}\n\n`;for(const client of clients)client.write(payload)}
function event(text,kind='info'){state.events.unshift({id:`${Date.now()}-${Math.random()}`,text,kind});state.events=state.events.slice(0,7)}
function player(name){return state.players[name]||=( {name,score:0,team:null} )}
function chooseTeam(name,team){const p=player(name);p.team=team;p.score+=2;event(`${name} gia nhập đội ${team==='red'?'ĐỎ':'XANH'}!`,team)}
function hit(team,amount,name,label){if(state.phase!=='playing')return;const target=team==='red'?'blue':'red';state[target]=Math.max(0,state[target]-amount);const p=player(name);p.team||=team;p.score+=amount;state.combo=state.combo.team===team?{team,count:state.combo.count+1}:{team,count:1};event(`${name} ${label} −${amount} HP!`,team);if(state[target]===0)finish(team)}
function heal(team,amount,name){if(state.phase!=='playing')return;state[team]=Math.min(state.maxHp,state[team]+amount);player(name).score+=amount;event(`${name} hồi ${amount} HP cho đội!`,team)}
function finish(winner){clearInterval(timer);timer=undefined;state.phase='finished';state.winner=winner;event(`ĐỘI ${winner==='red'?'ĐỎ':'XANH'} CHIẾN THẮNG!`,'gold')}
function startRound(){clearInterval(timer);state.phase='playing';state.secondsLeft=90;state.red=state.maxHp;state.blue=state.maxHp;state.winner=null;state.combo={team:null,count:0};event(`Vòng ${state.round} bắt đầu! Comment ĐỎ hoặc XANH`,'gold');timer=setInterval(()=>{if(--state.secondsLeft<=0)finish(state.red>=state.blue?'red':'blue');broadcast()},1000);broadcast()}
function reset(){clearInterval(timer);timer=undefined;state=newState();broadcast()}
export function applyEvent(input){const type=String(input.type||'').toLowerCase();const name=String(input.user||'Khán giả').slice(0,30);const text=String(input.text||'').trim().toLowerCase();const p=player(name);if(type==='comment'){state.totals.comments++;if(/^(đỏ|do|red)$/.test(text))chooseTeam(name,'red');else if(/^(xanh|blue)$/.test(text))chooseTeam(name,'blue');else if(/^(đánh|danh|attack|1)$/.test(text)&&p.team)hit(p.team,5,name,'tấn công');else if(/^(hồi|hoi|heal|2)$/.test(text)&&p.team)heal(p.team,3,name)}else if(type==='gift'){state.totals.gifts++;const team=input.team==='blue'||p.team==='blue'?'blue':'red';const power=Math.min(100,Math.max(10,Number(input.value)||10));hit(team,power,name,`tặng ${input.gift||'quà'}`)}else if(type==='like'){state.totals.likes+=Number(input.count)||1;if(p.team&&state.totals.likes%20===0)hit(p.team,3,name,'kích hoạt mưa tim')}else if(type==='follow'&&p.team)heal(p.team,15,name);broadcast();return publicState()}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.webp':'image/webp','.glb':'model/gltf-binary'};
const json=(res,code,data)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(data))};
async function body(req){let s='';for await(const c of req)s+=c;return s?JSON.parse(s):{}}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,`http://${req.headers.host}`);try{if(url.pathname==='/events'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive','access-control-allow-origin':'*'});clients.add(res);res.write(`data: ${JSON.stringify(publicState())}\n\n`);req.on('close',()=>clients.delete(res));return}if(url.pathname==='/api/tiktok/stream'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive'});tikTokClients.add(res);res.write(`data: ${JSON.stringify({kind:'snapshot',status:publicTikTokStatus(),logs:tikTokLogs})}\n\n`);req.on('close',()=>tikTokClients.delete(res));return}if(url.pathname==='/api/tiktok/status')return json(res,200,{status:publicTikTokStatus(),logs:tikTokLogs});if(url.pathname==='/api/sounds/impact')return json(res,200,{sounds:impactSoundUrls});if(req.method==='POST'&&url.pathname==='/api/tiktok/connect')return json(res,200,{status:await connectTikTok((await body(req)).username)});if(req.method==='POST'&&url.pathname==='/api/tiktok/disconnect')return json(res,200,{status:disconnectTikTok()});if(url.pathname==='/api/state')return json(res,200,publicState());if(req.method==='POST'&&url.pathname==='/api/event')return json(res,200,applyEvent(await body(req)));if(req.method==='POST'&&url.pathname==='/api/start'){state.round++;startRound();return json(res,200,publicState())}if(req.method==='POST'&&url.pathname==='/api/reset'){reset();return json(res,200,publicState())}if(url.pathname==='/vendor/three.module.js'||url.pathname==='/vendor/three.core.js'){const file=url.pathname.endsWith('three.core.js')?'three.core.js':'three.module.js';const data=await readFile(join(BASE,'node_modules/three/build',file));res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(data)}if(url.pathname.startsWith('/vendor/addons/')){const addonName=decodeURIComponent(url.pathname.slice('/vendor/addons/'.length)),addonRoot=join(BASE,'node_modules/three/examples/jsm'),addonPath=normalize(join(addonRoot,addonName));if(!addonPath.startsWith(addonRoot))return json(res,403,{error:'Forbidden'});const data=await readFile(addonPath);res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(data)}if(url.pathname.startsWith('/assets/')){const assetName=decodeURIComponent(url.pathname.slice('/assets/'.length));const assetPath=normalize(join(ASSETS,assetName));if(!assetPath.startsWith(ASSETS))return json(res,403,{error:'Forbidden'});const data=await readFile(assetPath);res.writeHead(200,{'content-type':mime[extname(assetPath)]||'image/png','cache-control':'public, max-age=3600'});return res.end(data)}const requested=url.pathname==='/'?'/index.html':url.pathname;const path=normalize(join(ROOT,requested));if(!path.startsWith(ROOT))return json(res,403,{error:'Forbidden'});const data=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(data)}catch(error){if(error.code==='ENOENT')return json(res,404,{error:'Not found'});json(res,400,{error:error.message})}});
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)server.listen(PORT,()=>{
  console.log(`Game: http://localhost:${PORT}\nĐiều khiển: http://localhost:${PORT}/control.html\nTikTok monitor: http://localhost:${PORT}/live-test.html`);
  if(process.env.TIKTOK_LIVE_USERNAME){
    connectTikTok(process.env.TIKTOK_LIVE_USERNAME).catch(error=>tikTokLog('error',{message:error.message}));
  }
});
export {server,newState};
