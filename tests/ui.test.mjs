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
test('la voz elige un idioma español y tiene vigilante de cuelgue',()=>{assert.match(js,/const pickVoice=/);assert.match(js,/try\{const vz=pickVoice\(\);if\(vz\)u\.voice=vz\}catch\{\}/,'asignar la voz debe estar protegido: si falla, se usa la del sistema');assert.match(js,/setInterval\(\(\)=>\{if\(speech&&\(speech\.speaking/)});
test('las respuestas se limpian de markdown antes de leerse',()=>{assert.match(js,/const respond=\(s,onDone\)=>\{s=clean\(s\)/)});
test('REGRESIÓN foto vieja: la foto solo se adjunta si se pide, y una foto nueva va sin historial',()=>{assert.match(js,/const fresh=photoData&&\(opts\.image\|\|opts\.usePhoto\);/);assert.match(js,/history:opts\.image\?\[\]:history/)});
test('cálculo hablado local y exacto',()=>{const a=js.indexOf('function spokenMath(lower)'),b=js.indexOf('let pendingQ');assert.ok(a>0&&b>a,'falta spokenMath');const spokenMath=new Function(js.slice(a,b)+';return spokenMath')();
  const cases={'cuánto es 25 por 4':100,'cuánto es 7 más 5 menos 2':10,'calcula 100 entre 8':12.5,'cuánto es la raíz cuadrada de 81':9,'cuánto es raíz cuadrada de 81':9,'cuánto es 15 por ciento de 200':30,'cuánto es 3 al cuadrado':9,'cuánto es 2,5 por 4':10,'cuéntame un chiste':null,'cuánto es alert(1)':null,'cuánto es 1 más':null};
  for(const [q,v] of Object.entries(cases))assert.equal(spokenMath(q),v,q)});
test('la hora no pierde dígitos ni duplica el punto',()=>{const m=js.match(/return respond\(\('Son las '\+new Date\(\)\.toLocaleTimeString\('es-PE',\{hour:'numeric',minute:'2-digit'\}\)\+'\.'\)\.replace\((\/.*?\/),'\.'\)\);/);assert.ok(m,'falta la respuesta de hora');const re=eval(m[1]);
  assert.equal(('Son las 7:43 a. m.'+'.').replace(re,'.'),'Son las 7:43 a. m.');assert.equal(('Son las 19:43'+'.').replace(re,'.'),'Son las 19:43.')});
