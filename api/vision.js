// Lázaro — proxy seguro hacia OpenAI. La clave nunca sale del servidor.
// Modos: explore | read | experience | live | chat (chat permite conversar sin imagen).
const MODES={
  explore:{ctx:'Da un resumen breve y natural, de dos o tres frases, con lo más importante de la escena y dónde está (delante, a la izquierda, a la derecha, cerca, lejos). Termina con una pregunta corta ofreciendo más detalles, por ejemplo: ¿Quieres que te dé más detalles?',tokens:220},
  detail:{ctx:'Describe la imagen con detalle, de forma fluida y natural, como si se la contaras a un amigo: de lo más importante a lo secundario, con posiciones (izquierda, derecha, cerca, lejos), colores y texto visible. Usa párrafos cortos.',tokens:650},
  read:{ctx:'Lee el texto legible respetando su orden, tal cual, como si lo leyeras en voz alta. Si no hay texto, dilo en una frase.',tokens:700},
  experience:{ctx:'Describe con sensibilidad y detalle las características perceptibles de la escena sin inventar elementos.',tokens:550},
  live:{ctx:'Estás narrando en vivo. Responde en una o dos frases cortas. Menciona solo lo nuevo o cambiado respecto a la descripción anterior. No inventes movimientos ni cambios: si la escena es esencialmente la misma responde exactamente "Sin cambios".',tokens:90},
  chat:{ctx:'Conversa de manera natural y breve. Usa el historial y las notas del usuario como contexto.',tokens:400}
};
const SAFETY='Eres Lázaro, asistente en español peruano para personas con pérdida total de visión. Responde de manera directa, precisa y empática. No inventes colores, identidades, señales ni acciones que no puedas verificar. Nunca identifiques a personas por su rostro. Nunca indiques que se puede cruzar una calle, que un trayecto está libre de obstáculos o que una situación es segura. Si no sabes, dilo. Habla como en una conversación: solo texto plano, sin markdown, sin asteriscos, sin almohadillas, sin listas con viñetas ni números, sin títulos y sin emojis; frases cortas y naturales unidas con conectores. La aplicación lee en voz alta todas tus respuestas y la persona te habla por voz: nunca digas que solo respondes por texto ni que no tienes voz.';
// Texto para ser escuchado: sin marcas de formato (asteriscos, títulos, viñetas, código, enlaces).
export function plain(t){
  return String(t)
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')          // [texto](url) -> texto
    .replace(/`{1,3}/g,'')                             // código
    .replace(/^\s{0,3}#{1,6}\s*/gm,'')                 // títulos
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/gm,'')         // viñetas y listas numeradas
    .replace(/(\*\*|__)(.*?)\1/g,'$2')                 // **negrita**
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s.,;:!?)]|$)/gm,'$1$2') // *cursiva*
    .replace(/[*#]+/g,'')                              // restos
    .replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
const str=(v,max)=>typeof v==='string'?v.slice(0,max):'';

export function buildMessages(body){
  let {image,question,mode,history,memory,previous}=body||{};
  if(!MODES[mode])mode='explore';
  const hasImage=typeof image==='string'&&image.length>0;
  if(hasImage&&(!/^data:image\/(jpeg|png|webp);base64,/.test(image)||image.length>3500000))return {error:'Imagen inválida o demasiado grande'};
  if(!hasImage&&mode!=='chat')return {error:'Se necesita una imagen para este modo'};
  question=str(question,700)||(hasImage?'Describe esta imagen':'');
  if(!question)return {error:'Pregunta vacía'};
  let system=SAFETY+' '+MODES[mode].ctx;
  const notes=Array.isArray(memory)?memory.filter(n=>typeof n==='string').slice(0,10).map(n=>n.slice(0,200)):[];
  if(notes.length)system+='\nNotas que el usuario pidió recordar (úsalas solo si son pertinentes):\n- '+notes.join('\n- ');
  if(mode==='live'&&str(previous,600))system+='\nDescripción anterior: '+str(previous,600);
  const msgs=[{role:'system',content:system}];
  if(Array.isArray(history))for(const h of history.slice(-8)){
    if(h&&(h.role==='user'||h.role==='assistant')&&typeof h.content==='string')msgs.push({role:h.role,content:h.content.slice(0,700)});
  }
  const content=[{type:'text',text:question}];
  if(hasImage)content.push({type:'image_url',image_url:{url:image,detail:mode==='read'?'high':'low'}});
  msgs.push({role:'user',content});
  return {messages:msgs,max_tokens:MODES[mode].tokens};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
  // Proveedor configurable (cualquier API compatible con OpenAI): OpenAI, Ollama local, OpenRouter, etc.
  // LAZARO_ACCESS_PIN admite varios códigos separados por comas (p. ej. uno por grupo), revocables por separado.
  const env=process.env,key=env.AI_API_KEY||env.OPENAI_API_KEY;
  const pins=String(env.LAZARO_ACCESS_PIN||'').split(',').map(s=>s.trim()).filter(Boolean),pin=pins.length>0;
  const base=(env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/+$/,'');
  const keyless=!!env.AI_BASE_URL&&!key; // modelo propio sin clave (p. ej. Ollama en el PC): sin costo
  if(!key&&!keyless)return res.status(503).json({error:'El administrador todavía no ha activado el servicio de IA.'});
  if(key&&!pin)return res.status(503).json({error:'El administrador todavía no ha activado el servicio de IA.'}); // una clave de pago nunca queda abierta
  if(pin&&!pins.includes(String(req.headers['x-lazaro-pin']||'').trim()))return res.status(401).json({error:'Código de prueba incorrecto.'});
  const built=buildMessages(req.body);
  if(built.error)return res.status(400).json({error:built.error});
  try{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),Number(env.AI_TIMEOUT_MS)||25000);
    const headers={'Content-Type':'application/json'};if(key)headers.Authorization='Bearer '+key;
    const upstream=await fetch(base+'/chat/completions',{method:'POST',signal:controller.signal,headers,body:JSON.stringify({model:env.AI_MODEL||env.OPENAI_VISION_MODEL||'gpt-4.1-mini',max_tokens:built.max_tokens,messages:built.messages})});
    clearTimeout(timeout);
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      // Registro sin secretos: estado, tipo de error y límites informados por el proveedor.
      const h=n=>upstream.headers?.get?.(n);
      console.error('upstream',upstream.status,data?.error?.code||data?.error?.type||'',String(data?.error?.message||'').slice(0,160),'limit-tokens',h('x-ratelimit-limit-tokens'),'limit-req',h('x-ratelimit-limit-requests'));
      if(upstream.status===429)return res.status(429).json({error:'Se alcanzó el límite gratuito por minuto. Espera unos segundos.'});
      return res.status(502).json({error:'El proveedor de IA devolvió un error. Revisa su configuración y saldo.'});
    }
    // Algunos modelos abiertos devuelven su razonamiento entre <think>…</think>: nunca se lee en voz alta.
    const answer=plain(String(data.choices?.[0]?.message?.content||'').replace(/<think>[\s\S]*?(<\/think>|$)/gi,''));
    return res.status(200).json({answer:answer||'No pude interpretar la imagen.'});
  }catch(e){return res.status(502).json({error:'No fue posible consultar el servicio de IA.'})}
}
