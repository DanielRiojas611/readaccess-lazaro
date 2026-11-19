export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
  const key=process.env.OPENAI_API_KEY,pin=process.env.LAZARO_ACCESS_PIN;
  if(!key||!pin)return res.status(503).json({error:'El administrador todavía no ha activado el servicio de IA.'});
  if(req.headers['x-lazaro-pin']!==pin)return res.status(401).json({error:'Código de prueba incorrecto.'});
  let {image,question,mode}=req.body||{};
  if(typeof image!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(image)||image.length>3500000)return res.status(400).json({error:'Imagen inválida o demasiado grande'});
  if(typeof question!=='string')question='Describe esta imagen';
  question=question.slice(0,700);
  const context=mode==='experience'?'Describe con sensibilidad y detalle las características perceptibles de la escena sin inventar elementos.':mode==='read'?'Prioriza texto legible, respetando su orden.':'Describe de forma útil el entorno, objetos, posiciones aproximadas y actividad visible.';
  try{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
    let upstream=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_VISION_MODEL||'gpt-4.1-mini',max_tokens:450,messages:[{role:'system',content:'Eres Lázaro, asistente en español peruano para personas con pérdida total de visión. Responde de manera directa, precisa y empática. '+context+' No inventes colores, identidades, señales ni acciones que no puedas verificar. Nunca indiques que se puede cruzar una calle, que un trayecto está libre de obstáculos o que una situación es segura. Si no sabes, dilo.'},{role:'user',content:[{type:'text',text:question},{type:'image_url',image_url:{url:image,detail:'low'}}]}]})});clearTimeout(timeout);
    let data=await upstream.json();if(!upstream.ok)return res.status(502).json({error:'El proveedor de IA devolvió un error. Revisa su configuración y saldo.'});
    return res.status(200).json({answer:data.choices?.[0]?.message?.content||'No pude interpretar la imagen.'});
  }catch(e){return res.status(502).json({error:'No fue posible consultar el servicio de IA.'})}
}