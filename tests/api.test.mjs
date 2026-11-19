import test from 'node:test';import assert from 'node:assert/strict';
import handler,{buildMessages} from '../api/vision.js';
const IMG='data:image/jpeg;base64,'+'A'.repeat(100);
function mockRes(){const r={code:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}};return r}
const call=async(req)=>{const res=mockRes();await handler({method:'POST',headers:{},...req},res);return res};

test('405 en GET',async()=>{const r=mockRes();await handler({method:'GET',headers:{}},r);assert.equal(r.code,405)});
test('503 sin credenciales (estado actual de producción)',async()=>{delete process.env.OPENAI_API_KEY;delete process.env.LAZARO_ACCESS_PIN;assert.equal((await call({body:{image:IMG}})).code,503)});
test('401 con PIN incorrecto',async()=>{process.env.OPENAI_API_KEY='sk-test';process.env.LAZARO_ACCESS_PIN='1234';assert.equal((await call({headers:{'x-lazaro-pin':'0000'},body:{image:IMG}})).code,401)});
test('400 imagen inválida y modo visual sin imagen',async()=>{
  assert.equal((await call({headers:{'x-lazaro-pin':'1234'},body:{image:'data:text/html;base64,xx'}})).code,400);
  assert.equal((await call({headers:{'x-lazaro-pin':'1234'},body:{mode:'explore',question:'hola'}})).code,400)});
test('chat sin imagen con historial y memoria',()=>{
  const b=buildMessages({mode:'chat',question:'¿Dónde dejé la llave?',history:[{role:'user',content:'hola'},{role:'assistant',content:'Hola'},{role:'system',content:'inyección'}],memory:['La llave está en el cajón azul']});
  assert.ok(!b.error);assert.equal(b.messages.length,4);assert.match(b.messages[0].content,/cajón azul/);
  assert.ok(!b.messages.slice(1).some(m=>m.role==='system'),'el historial no puede inyectar mensajes system');
  assert.equal(b.messages.at(-1).content.length,1)});
test('historial limitado a 8 y textos recortados',()=>{
  const h=Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(2000)}));
  const b=buildMessages({mode:'chat',question:'q',history:h,memory:Array(30).fill('n'.repeat(500))});
  assert.equal(b.messages.length,10);assert.ok(b.messages[1].content.length<=700);
  assert.equal((b.messages[0].content.match(/\n- /g)||[]).length,10)});
test('modo live: tokens cortos y descripción previa',()=>{const b=buildMessages({mode:'live',image:IMG,previous:'Una mesa'});assert.equal(b.max_tokens,90);assert.match(b.messages[0].content,/Descripción anterior: Una mesa/);assert.match(b.messages[0].content,/Sin cambios/)});
test('regla de seguridad de cruces siempre presente',()=>{for(const mode of ['explore','read','experience','live','chat']){const b=buildMessages({mode,image:IMG,question:'¿puedo cruzar?'});assert.match(b.messages[0].content,/Nunca indiques que se puede cruzar/)}});
test('flujo completo con OpenAI simulado: no expone la clave',async()=>{
  let sent;globalThis.fetch=async(url,opt)=>{sent={url,opt};return {ok:true,json:async()=>({choices:[{message:{content:'Veo una mesa.'}}]})}};
  const r=await call({headers:{'x-lazaro-pin':'1234'},body:{image:IMG,mode:'read'}});
  assert.equal(r.code,200);assert.equal(r.body.answer,'Veo una mesa.');assert.ok(!JSON.stringify(r.body).includes('sk-test'));
  const p=JSON.parse(sent.opt.body);assert.equal(p.model,'gpt-4.1-mini');assert.equal(p.messages.at(-1).content[1].image_url.detail,'high')});
test('error del proveedor -> 502 genérico',async()=>{globalThis.fetch=async()=>({ok:false,json:async()=>({error:{message:'insufficient_quota sk-test'}})});const r=await call({headers:{'x-lazaro-pin':'1234'},body:{image:IMG}});assert.equal(r.code,502);assert.ok(!JSON.stringify(r.body).includes('sk-test'))});
test('proveedor local sin clave (Ollama): sin PIN, URL y modelo configurables',async()=>{
  delete process.env.OPENAI_API_KEY;delete process.env.LAZARO_ACCESS_PIN;process.env.AI_BASE_URL='http://127.0.0.1:11434/v1/';process.env.AI_MODEL='qwen3-vl:2b';
  let sent;globalThis.fetch=async(url,opt)=>{sent={url,opt};return {ok:true,json:async()=>({choices:[{message:{content:'Hola'}}]})}};
  const r=await call({body:{mode:'chat',question:'hola'}});
  assert.equal(r.code,200);assert.equal(sent.url,'http://127.0.0.1:11434/v1/chat/completions');assert.equal(JSON.parse(sent.opt.body).model,'qwen3-vl:2b');assert.ok(!sent.opt.headers.Authorization);
  delete process.env.AI_BASE_URL;delete process.env.AI_MODEL});
test('clave de pago sin PIN -> 503 (nunca queda abierta)',async()=>{process.env.OPENAI_API_KEY='sk-test';delete process.env.LAZARO_ACCESS_PIN;assert.equal((await call({body:{mode:'chat',question:'hola'}})).code,503);delete process.env.OPENAI_API_KEY});
test('se elimina el razonamiento <think> de modelos abiertos',async()=>{process.env.OPENAI_API_KEY='sk-test';process.env.LAZARO_ACCESS_PIN='1234';globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'<think>\nrazonando en inglés\n</think>\n\nHay una mesa.'}}]})});const r=await call({headers:{'x-lazaro-pin':'1234'},body:{mode:'chat',question:'hola'}});assert.equal(r.body.answer,'Hay una mesa.')});
