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
