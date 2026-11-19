# ReadAccess 2.0 — Lázaro

Asistente **por voz** para personas con pérdida total de visión. La persona toca cualquier parte de la pantalla, habla, y
Lázaro describe lo que hay delante, lee textos, indica dónde está y conversa. Es una aplicación web (PWA) que funciona en
el navegador del celular, sin instalar nada.

## Funcionalidades
| Función | Cómo se pide | Dónde se procesa |
|---|---|---|
| Describir lo que hay delante | «¿Qué hay delante?» (abre la cámara, toma la foto sola y describe) | IA en la nube |
| Preguntas sobre la última foto | «¿De qué color es…?» | IA en la nube |
| Leer textos y carteles | «Lee esto» (IA; sin internet usa OCR en el teléfono) | IA / Tesseract.js local |
| Leer documentos PDF o texto | Opciones del acompañante → Documentos | pdf.js local |
| Escena en vivo | «Inicia la narración» (solo consulta cuando la cámara detecta un cambio) | IA + detección local |
| ¿Dónde estoy? / ¿Hacia dónde miro? | Por voz | GPS + OpenStreetMap / brújula |
| Conversación con memoria | Preguntas libres; «Recuerda que…» guarda notas | IA + almacenamiento local |
| Personas autorizadas | Registro con consentimiento; los rostros no salen del teléfono | face-api local |
| Asistencia humana | «Llama a mi contacto» / enviar ubicación por SMS | Teléfono |
| Manos libres | Vuelve a escuchar tras cada respuesta; «silencio» para pausar | Web Speech |
| Modo sin conexión | OCR, PDF, GPS, brújula, memoria y personas funcionan offline | Service worker |
| TalkBack | Opción para que el lector de pantalla anuncie los mensajes | — |

## Estructura
- `index.html` — aplicación completa (HTML, CSS y JS, sin paso de compilación).
- `api/vision.js` — función serverless de Vercel: intermediario hacia la IA. **La clave de la IA nunca llega al navegador.**
- `sw.js` — modo sin conexión.
- `tests/api.test.mjs` — pruebas de la API · `tests/dev-server.mjs` — servidor local.

## Ejecutar en local
Requisitos: [Node.js](https://nodejs.org) 22 o superior. No hay dependencias que instalar.

```bash
git clone https://github.com/DanielRiojas611/readaccess-lazaro.git
cd readaccess-lazaro
npm test        # 13 pruebas de la API
npm run dev     # abre http://localhost:5173
```

Sin variables de entorno, la app funciona en modo local (voz, OCR, PDF, GPS, brújula, memoria, offline) y las funciones
de IA responden «no activada». Para activar la IA, define las variables antes de `npm run dev` o en Vercel:

| Variable | Uso |
|---|---|
| `AI_BASE_URL` | API compatible con OpenAI (p. ej. `https://api.groq.com/openai/v1`). Si se omite, usa OpenAI |
| `AI_API_KEY` | Clave del proveedor (o `OPENAI_API_KEY`) |
| `AI_MODEL` | Modelo con visión (p. ej. `qwen/qwen3.8-27b` en Groq) |
| `LAZARO_ACCESS_PIN` | Código numérico que protege la IA; obligatorio si hay clave |
| `AI_TIMEOUT_MS` | Opcional, por defecto 25000 |

Nunca subas claves al repositorio: los archivos `.env*` están excluidos por `.gitignore`.

La cámara y el micrófono del celular solo funcionan en HTTPS (o en `localhost`), por eso las pruebas en teléfono se hacen
sobre el despliegue de Vercel.

## Seguridad y ética
- Lázaro **no reemplaza el bastón ni el perro guía**. Ninguna respuesta debe usarse para decidir cruces de calle ni
  evitar obstáculos; la regla está en el prompt del servidor para todos los modos y en la interfaz.
- El modelo tiene prohibido identificar personas por su rostro. El reconocimiento de personas autorizadas es local y requiere consentimiento.

## Diseño Universal y WCAG 2.2 AA
Interfaz centrada en la voz: un solo control a pantalla completa, avisos sonoros y vibración, regiones `aria-live`,
alto contraste verificado, objetivos táctiles grandes, una columna desde 375 px y sin gestos complejos.

## Historial
`main` / tag `prod-baseline-dpl_4d7UaGMf` contienen el código original recuperado de producción;
`feature/lazaro-full` contiene la versión completa actual.
