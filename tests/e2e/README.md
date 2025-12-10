# End-to-End Testing Guide

Esta guía describe cómo testear el flujo completo de recepción de mensajes desde WhatsApp hasta el agente y de vuelta.

## Prerrequisitos

1. **wa2ai corriendo en Docker:**
   ```bash
   docker compose -f infra/docker-compose.lab.yml ps wa2ai-lab
   # Debe estar "Up" y "healthy"
   ```

   **Nota:** Si el código cambió, necesitas reconstruir el contenedor:
   ```bash
   docker compose -f infra/docker-compose.lab.yml build wa2ai-lab
   docker compose -f infra/docker-compose.lab.yml up -d wa2ai-lab
   ```

2. **WhatsApp conectado:**
   ```bash
   curl http://localhost:3000/qr/status
   # Debe retornar: {"status":"connected","connected":true,...}
   ```

3. **Conocer tu número de WhatsApp:**
   - El `channelId` es tu número sin el `@s.whatsapp.net`
   - Ejemplo: Si tu JID es `5491155551234@s.whatsapp.net`, el channelId es `5491155551234`
   - Puedes obtenerlo desde los logs de Docker o desde el estado de conexión
   - **Opcional:** Puedes configurar `WA2AI_TEST_CHANNEL_ID` en tu archivo `.env` para usar automáticamente tu channelId de prueba

## Paso 1: Iniciar Mock Agent

En una terminal separada:

```bash
# Desde el directorio raíz del proyecto
node tests/fixtures/mock-agent.js 8000
```

Deberías ver:
```
[MockAgent] Server running on http://0.0.0.0:8000
[MockAgent] Ready to receive messages...
[MockAgent] Press Ctrl+C to stop
```

**Nota:** Deja esta terminal abierta para ver los logs del agente.

**Importante - Límite de seguridad:** El mock agent tiene un mecanismo de seguridad que limita las respuestas a **3 mensajes por ejecución**. Después de enviar 3 respuestas, el agente seguirá recibiendo y logueando mensajes, pero **no enviará más respuestas** para evitar enviar mensajes a todo el mundo. Si necesitas probar más mensajes, reinicia el mock agent.

## Paso 2: Configurar Ruta

En otra terminal:

```bash
# Opción 1: Usar la variable de entorno WA2AI_TEST_CHANNEL_ID (recomendado)
CHANNEL_ID="${WA2AI_TEST_CHANNEL_ID:-5491155551234}"

# Opción 2: Especificar manualmente (reemplaza 5491155551234 con tu número de WhatsApp sin @s.whatsapp.net)
# CHANNEL_ID="5491155551234"

curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d "{
    \"channelId\": \"${CHANNEL_ID}\",
    \"agentEndpoint\": \"http://host.docker.internal:8000\",
    \"environment\": \"lab\"
  }"
```

**Nota:** Si tienes configurado `WA2AI_TEST_CHANNEL_ID` en tu archivo `.env`, puedes usar `${WA2AI_TEST_CHANNEL_ID}` directamente. Si no está configurado, el comando usará el valor por defecto `5491155551234`.

**⚠️ ADVERTENCIA DE SEGURIDAD - NO USAR WILDCARDS:**

**NUNCA uses `channelId: "*"` en producción o durante pruebas sin supervisión.** Una ruta con wildcard hace que el agente responda a **TODOS los mensajes** que reciba wa2ai, incluyendo:
- Mensajes de grupos donde no quieres que el bot responda
- Mensajes de contactos no deseados
- Mensajes de spam o no solicitados
- Cualquier mensaje que llegue al sistema

Esto puede resultar en:
- Envío masivo de respuestas no deseadas
- Spam a contactos y grupos
- Violación de políticas de uso de WhatsApp
- Bloqueo de tu cuenta

**Siempre usa un `channelId` específico** (tu número personal o el ID de un grupo específico) para limitar las respuestas solo a los canales deseados.

**Opcional: Configurar ruta con filtro regex:**

```bash
# Ruta que solo acepta mensajes que empiezan con "Test" para un channelId específico
CHANNEL_ID="5491155551234"

curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d "{
    \"channelId\": \"${CHANNEL_ID}\",
    \"agentEndpoint\": \"http://host.docker.internal:8000\",
    \"environment\": \"lab\",
    \"regexFilter\": \"^Test\"
  }"
```

**Nota sobre regexFilter:**
- Usa sintaxis de **JavaScript RegExp** (ECMAScript estándar)
- Ejemplos: `"^Test"` (empieza con "Test"), `".*help.*"` (contiene "help")
- Si no se especifica, la ruta acepta todos los mensajes del `channelId` especificado
- El `regexFilter` solo filtra mensajes dentro del `channelId` especificado, **NO reemplaza la necesidad de especificar un channelId**

**Importante:** Usa `http://host.docker.internal:8000` porque el contenedor Docker necesita acceder al mock agent que corre en tu máquina local.

**Verificar que la ruta se agregó:**
```bash
curl http://localhost:3000/api/routes
```

Deberías ver tu ruta en la lista.

## Paso 3: Enviar Mensaje de Prueba

Desde tu teléfono WhatsApp, envía un mensaje a ti mismo (o al número conectado).

**Ejemplo de mensaje:**
```
Hola, esto es una prueba
```

## Paso 4: Verificar el Flujo

### 4.1 Ver logs de wa2ai

```bash
docker compose -f infra/docker-compose.lab.yml logs -f wa2ai-lab
```

Deberías ver estas líneas en orden:
1. `[BaileysConnection] Messages upsert event`
2. `[MessageRouter] Routing message`
3. `[MessageRouter] Route found`
4. `[AgentClient] Message sent to agent`
5. `[MessageRouter] Message routed successfully`
6. `[BaileysConnection] Sending text message`

**Con `WA2AI_DEBUG=true`**, verás logs detallados en cada paso:
- Entry/exit points en todas las funciones
- Decision points (route found/not found)
- Parámetros y resultados intermedios
- Errores con contexto completo

### 4.2 Ver logs del mock agent

En la terminal donde corre el mock agent, deberías ver:
```
[MockAgent] Received message: { id: '...', from: '...', text: 'Hola, esto es una prueba', ... }
[MockAgent] Sent response (1/3): { messageId: '...', response: 'Echo from wa2ai: Hola, esto es una prueba' }
```

**Nota sobre el límite de mensajes:**
- Los primeros 3 mensajes recibirán respuesta automática
- Después del 3er mensaje, verás: `[MockAgent] Message limit reached (3). Logging only, no response sent.`
- Los mensajes posteriores se loguean pero no se responde (mecanismo de seguridad)

### 4.3 Verificar respuesta en WhatsApp

Deberías recibir en WhatsApp:
```
Echo from wa2ai: Hola, esto es una prueba
```

**Flujo completo de respuesta:**
1. Envías un mensaje desde WhatsApp
2. wa2ai recibe el mensaje y lo envía al mock agent
3. El mock agent responde con: `Echo from wa2ai: {tu mensaje}`
4. wa2ai envía la respuesta de vuelta a tu WhatsApp a través del provider
5. Recibes la respuesta en tu teléfono

**Límite de seguridad:** Solo los primeros 3 mensajes recibirán respuesta. Después de eso, el mock agent solo loguea los mensajes recibidos sin responder, para evitar enviar mensajes a todo el mundo durante las pruebas.

## Paso 5: Verificar Estado

### Listar todas las rutas:
```bash
curl http://localhost:3000/api/routes | python3 -m json.tool
```

### Verificar una ruta específica:
```bash
curl http://localhost:3000/api/routes/5491155551234 | python3 -m json.tool
```

### Ver estado de conexión:
```bash
curl http://localhost:3000/qr/status | python3 -m json.tool
```

## Comportamiento del Mock Agent

### Respuestas automáticas

El mock agent responde automáticamente a los mensajes recibidos con el formato:
```
Echo from wa2ai: {mensaje original}
```

### Límite de seguridad

**Importante:** El mock agent tiene un mecanismo de seguridad que limita las respuestas a **3 mensajes por ejecución**:

- **Primeros 3 mensajes:** Reciben respuesta automática
- **Mensajes 4+:** Se loguean pero **NO se envía respuesta**

Esto previene que durante las pruebas se envíen mensajes a todo el mundo.

**Ejemplo de logs:**
```
[MockAgent] Sent response (1/3): { messageId: '...', response: 'Echo from wa2ai: Mensaje 1' }
[MockAgent] Sent response (2/3): { messageId: '...', response: 'Echo from wa2ai: Mensaje 2' }
[MockAgent] Sent response (3/3): { messageId: '...', response: 'Echo from wa2ai: Mensaje 3' }
[MockAgent] Message limit reached (3). Logging only, no response sent. { messageId: '...', messagesSentCount: 3 }
```

**Para probar más de 3 mensajes:**
1. Detén el mock agent (Ctrl+C)
2. Reinícialo: `node tests/fixtures/mock-agent.js 8000`
3. El contador se reinicia y podrás enviar otros 3 mensajes

## Troubleshooting

### El endpoint /api/routes retorna 404

El contenedor necesita ser reconstruido con el nuevo código:
```bash
docker compose -f infra/docker-compose.lab.yml build wa2ai-lab
docker compose -f infra/docker-compose.lab.yml restart wa2ai-lab
```

### El mensaje no llega al agente

1. **Verificar que la ruta está configurada:**
   ```bash
   curl http://localhost:3000/api/routes
   ```

2. **Verificar que el channelId es correcto:**
   - Debe ser el número sin `@s.whatsapp.net`
   - Para grupos, es el ID del grupo sin `@g.us`

3. **Verificar logs de wa2ai:**
   ```bash
   docker compose -f infra/docker-compose.lab.yml logs wa2ai-lab | grep -i "route\|message\|agent"
   ```

### El agente no recibe el mensaje

1. **Verificar que el mock agent está corriendo:**
   ```bash
   curl http://localhost:8000
   # Debe retornar error 405 (Method not allowed) - significa que está corriendo
   ```

2. **Verificar la URL del agente:**
   - Desde Docker: usar `http://host.docker.internal:8000`
   - Desde local: usar `http://localhost:8000`

3. **Verificar conectividad desde Docker:**
   ```bash
   docker compose -f infra/docker-compose.lab.yml exec wa2ai-lab curl http://host.docker.internal:8000
   ```

### No se recibe respuesta en WhatsApp

1. **Verificar si se alcanzó el límite de 3 mensajes:**
   - Revisa los logs del mock agent
   - Si ves `Message limit reached (3)`, el agente ya envió 3 respuestas
   - Reinicia el mock agent para resetear el contador

2. **Verificar logs de wa2ai para errores:**
   ```bash
   docker compose -f infra/docker-compose.lab.yml logs wa2ai-lab | grep -i error
   ```

3. **Verificar que el agente retorna el formato correcto:**
   ```json
   {
     "success": true,
     "response": "Echo from wa2ai: {mensaje}"
   }
   ```
   - El campo `response` debe estar presente para que se envíe de vuelta
   - Si el agente no incluye `response`, wa2ai no enviará nada a WhatsApp

4. **Verificar conexión de Baileys:**
   ```bash
   curl http://localhost:3000/qr/status
   # Debe estar "connected"
   ```

5. **Verificar que el provider está configurado:**
   - Revisa los logs de wa2ai para ver si hay errores del provider
   - Verifica que el mensaje se envió al agente pero falló al enviar de vuelta

## Limpieza

### Remover una ruta:
```bash
curl -X DELETE http://localhost:3000/api/routes/5491155551234
```

**⚠️ Si accidentalmente creaste una ruta con wildcard (`channelId: "*"`), elimínala inmediatamente:**
```bash
# Eliminar ruta con wildcard (muy peligrosa)
curl -X DELETE 'http://localhost:3000/api/routes/*'
```

**Verificar que se eliminó:**
```bash
curl http://localhost:3000/api/routes
# Debe mostrar un array vacío o sin la ruta con wildcard
```

### Detener mock agent:
Presiona `Ctrl+C` en la terminal donde corre.

### Ver todas las rutas:
```bash
curl http://localhost:3000/api/routes
```
