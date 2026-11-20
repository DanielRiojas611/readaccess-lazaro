// Pruebas estáticas de la interfaz: protegen contra regresiones que solo se notan en un teléfono real.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];
test('el JS de la app es válido',()=>{assert.doesNotThrow(()=>new Function(js))});
test('REGRESIÓN audio mudo: la interrupción por voz viene APAGADA por defecto',()=>{
  const box=html.match(/<input[^>]*id="bargeIn"[^>]*>/);assert.ok(box,'falta la casilla bargeIn');assert.ok(!/\bchecked\b/.test(box[0]),'bargeIn no debe venir marcada: en Android el micrófono abierto silencia la voz');
});
test('REGRESIÓN audio mudo: startBarge no abre el micrófono sin la opción activada',()=>{
  const fn=js.slice(js.indexOf('function startBarge'),js.indexOf('function stopBarge'));
  const guard=fn.slice(0,fn.indexOf('const rec=new SR()'));assert.match(guard,/!\$\('bargeIn'\)\.checked\)return/,'el guardia de startBarge debe exigir bargeIn');
});
test('REGRESIÓN voz muda: NUNCA asignar u.voice (en Android hay voces "instaladas" sin datos que hablan sin sonido)',()=>{assert.ok(!/\.voice\s*=/.test(js),'no se debe elegir una voz concreta: se usa la del teléfono')});
test('REGRESIÓN voz muda: la parte que produce sonido es la versión probada (447cbae)',()=>{assert.ok(js.includes("u.lang='es-PE';u.rate=Number($('voiceRate').value);if(i===parts.length-1&&onDone){let fired=false;const fin=()=>{if(!fired){fired=true;onDone()}};u.onend=fin;u.onerror=fin;setTimeout(fin,Math.min(30000,1500+String(text).length*95/Number($('voiceRate').value)))}speech.speak(u)})};"))});
test('REGRESIÓN voz muda: sin vigilante que cancele la voz ni voz automática antes del primer toque',()=>{assert.ok(!/setInterval\([^)]*speech\.cancel/.test(js.replace(/\n/g,' ')),'no cancelar la voz por temporizador');assert.ok(!/setTimeout\(\(\)=>\{if\(speech&&!\(speech\.speaking\|\|speech\.pending\)\)say\(/.test(js),'no hablar al cargar')});
test('las respuestas se limpian de markdown antes de leerse',()=>{assert.match(js,/const respond=\(s,onDone\)=>\{s=clean\(s\)/)});
test('REGRESIÓN foto vieja: la foto solo se adjunta si se pide, y una foto nueva va sin historial',()=>{assert.match(js,/const fresh=photoData&&\(opts\.image\|\|opts\.usePhoto\);/);assert.match(js,/history:opts\.image\?\[\]:history/)});
test('cálculo hablado local y exacto',()=>{const a=js.indexOf('function spokenMath(lower)'),b=js.indexOf('let pendingQ');assert.ok(a>0&&b>a,'falta spokenMath');const spokenMath=new Function(js.slice(a,b)+';return spokenMath')();
  const cases={'cuánto es 25 por 4':100,'cuánto es 7 más 5 menos 2':10,'calcula 100 entre 8':12.5,'cuánto es la raíz cuadrada de 81':9,'cuánto es raíz cuadrada de 81':9,'cuánto es 15 por ciento de 200':30,'cuánto es 3 al cuadrado':9,'cuánto es 2,5 por 4':10,'cuéntame un chiste':null,'cuánto es alert(1)':null,'cuánto es 1 más':null};
  for(const [q,v] of Object.entries(cases))assert.equal(spokenMath(q),v,q)});
test('la hora no pierde dígitos ni duplica el punto',()=>{const m=js.match(/return respond\(\('Son las '\+new Date\(\)\.toLocaleTimeString\('es-PE',\{hour:'numeric',minute:'2-digit'\}\)\+'\.'\)\.replace\((\/.*?\/),'\.'\)\);/);assert.ok(m,'falta la respuesta de hora');const re=eval(m[1]);
  assert.equal(('Son las 7:43 a. m.'+'.').replace(re,'.'),'Son las 7:43 a. m.');assert.equal(('Son las 19:43'+'.').replace(re,'.'),'Son las 19:43.')});
test('REGRESIÓN ubicación: GPS con plan B por red y mensajes según la causa',()=>{const fn=js.slice(js.indexOf('async function locate(){'),js.indexOf('async function orient(){'));
  assert.match(fn,/enableHighAccuracy:true,timeout:8000/);assert.match(fn,/enableHighAccuracy:false/,'debe reintentar con ubicación por red');assert.match(fn,/e\.code===1/,'permiso denegado tiene su mensaje');assert.match(fn,/lazaro-lastplace/,'debe recordar la última ubicación');assert.match(fn,/finally\{pending--\}/,'pending siempre se libera')});
test('frases de ubicación reconocidas como comando (no van a la IA)',()=>{const m=js.match(/if\((\/d\[oó\]nde \(\?:estoy[^\n]*?\/)\.test\(lower\)\)return locate\(\);/);assert.ok(m,'falta la ruta de ubicación');const re=eval(m[1]);
  for(const q of ['¿dónde estoy?','dónde me encuentro','dónde estamos','¿en qué calle estoy?','en qué distrito estoy','mi ubicación','por dónde voy'])assert.ok(re.test(q),q);
  for(const q of ['¿dónde está la puerta?','cuéntame un chiste'])assert.ok(!re.test(q),q)});
test('permisos guiados por voz: aviso antes del sistema, bloqueo explicado, comando de voz',()=>{assert.match(js,/async function ensurePerm\(k\)/);assert.match(js,/if\(st==='granted'\)return true;if\(st==='denied'\)/);assert.match(js,/PROMPT_HELP=.*TalkBack.*Permitir/);
  assert.match(js,/const opened=stream\?true:\(\(await ensurePerm\('camera'\)\)&&await openCamera\(true\)\);/,'la cámara se pide con aviso por voz');assert.match(js,/if\(!\(await ensurePerm\('geolocation'\)\)\)return;/,'la ubicación se pide con aviso por voz');assert.match(js,/permisos\/\.test\(lower\)\)return setupPerms\(\);/)});
test('REGRESIÓN voz muda: el permiso del micrófono NO usa getUserMedia de audio',()=>{assert.ok(!/getUserMedia\(\{audio:true/.test(js),'getUserMedia con audio pone Android en modo llamada y silencia la voz');const mic=js.slice(js.indexOf("{k:'microphone'"),js.indexOf("{k:'camera'"));assert.match(mic,/new SR\(\)/,'el micrófono se pide con el reconocimiento de voz')});
test('pantalla: solo el botón grande a la vista; los textos quedan para TalkBack',()=>{assert.match(html,/<div id="status"[^>]*class="status sr-only"/);assert.match(html,/<header class="sr-only">/);assert.match(html,/id="talkHint" class="hint sr-only"/);assert.match(html,/\.giant\{width:100%;min-height:calc\(100dvh - 24px\)/)});
test('anuncia por voz lo que hace al tocar: escucha y análisis',()=>{assert.match(js,/await sayAsync\('Te escucho\.'\)/);assert.match(js,/estoy analizando la imagen\.'[^)]*,true\)/)});
