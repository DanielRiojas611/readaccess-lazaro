# ReadAccess 2.0 — Lázaro

Asistente accesible para personas con pérdida total de visión. Recuperado del deployment de producción
`dpl_4d7UaGMfxsDX1nAgyRvEvjVxnbHh` (tag `prod-baseline-dpl_4d7UaGMf`, SHA1 verificados).

## Estructura
- `index.html` — app completa (HTML/CSS/JS sin build).
- `api/vision.js` — función Vercel: proxy a OpenAI (la clave nunca llega al navegador). Modos `explore`, `read`, `experience`, `live`, `chat`.
- `sw.js` — modo offline (app + OCR + PDF + reconocimiento local tras el primer uso).
- `tests/` — pruebas de la API (`npm test`) y servidor local (`npm run dev`, puerto 5173).

## Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Requerida | Uso |
|---|---|---|
| `OPENAI_API_KEY` | Sí, para IA | Visión, escena en vivo, conversación |
| `LAZARO_ACCESS_PIN` | Sí, para IA | Código que el piloto ingresa en Opciones |
| `OPENAI_VISION_MODEL` | No | Por defecto `gpt-4.1-mini` |

Sin estas variables la app funciona en modo local (voz, OCR, PDF, GPS, brújula, memoria, personas autorizadas, offline) y la IA responde 503.

## Funciones locales (costo cero)
Voz (Web Speech), OCR (Tesseract.js), PDF (pdf.js), GPS + Nominatim, brújula, reconocimiento facial
con consentimiento (face-api, solo en el dispositivo), memoria (localStorage), offline (service worker).

## Seguridad
Ninguna respuesta debe usarse para decidir cruces de calle ni evitar obstáculos. La regla está en el prompt del servidor
para todos los modos y en la interfaz. Los rostros nunca se envían a la API; el modelo tiene prohibido identificar personas.

## Diseño Universal (7 principios)
1. Uso equitativo: voz, teclado, táctil y lector de pantalla llegan a todas las funciones.
2. Flexibilidad: velocidad de voz, voz propia o TalkBack, conversación continua, intervalo de narración.
3. Simple e intuitivo: botón central de voz + 10 acciones grandes; comandos en lenguaje natural.
4. Información perceptible: voz, regiones `aria-live`, vibración y texto en alto contraste.
5. Tolerancia al error: confirmación antes de llamar, consentimiento antes de registrar rostros, avisos de seguridad, mensajes de error en español.
6. Bajo esfuerzo físico: objetivos ≥ 50 px, sin gestos complejos ni arrastre.
7. Tamaño y espacio: diseño de una columna desde 375 px, sin desplazamiento horizontal.

## Rollback
Producción no se modifica desde esta rama. Para volver atrás: `vercel rollback` o promover
`dpl_4d7UaGMfxsDX1nAgyRvEvjVxnbHh` desde el panel de Vercel; el código base está en `main` / tag `prod-baseline-dpl_4d7UaGMf`.
