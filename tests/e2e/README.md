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

## Paso 1: Iniciar Mock Agent

En una terminal separada:

```bash
# Desde el directorio raíz del proyecto
node tests/fixtures/mock-agent.js 8000 echo
```

Deberías ver:
```
[MockAgent] Server running on http://localhost:8000
[MockAgent] Mode: echo
[MockAgent] Ready to receive messages...
```

**Nota:** Deja esta terminal abierta para ver los logs del agente.

## Paso 2: Configurar Ruta

En otra terminal:

```bash
# Reemplaza 5491155551234 con tu número de WhatsApp (sin @s.whatsapp.net)
CHANNEL_ID="5491155551234"

curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d "{
    \"channelId\": \"${CHANNEL_ID}\",
    \"agentEndpoint\": \"http://host.docker.internal:8000\",
    \"environment\": \"lab\"
  }"
```

**Opcional: Configurar ruta con filtro regex:**

```bash
# Ruta que solo acepta mensajes que empiezan con "Test"
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d "{
    \"channelId\": \"*\",
    \"agentEndpoint\": \"http://host.docker.internal:8000\",
    \"environment\": \"lab\",
    \"regexFilter\": \"^Test\"
  }"
```

**Nota sobre regexFilter:**
- Usa sintaxis de **JavaScript RegExp** (ECMAScript estándar)
- Ejemplos: `"^Test"` (empieza con "Test"), `".*help.*"` (contiene "help")
- Si no se especifica, la ruta acepta todos los mensajes

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
[MockAgent] Sent response: { success: true, response: 'Echo: Hola, esto es una prueba' }
```

### 4.3 Verificar respuesta en WhatsApp

Deberías recibir en WhatsApp:
```
Echo: Hola, esto es una prueba
```

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

## Modos del Mock Agent

El mock agent soporta diferentes modos de respuesta:

### Echo (default)
```bash
node tests/fixtures/mock-agent.js 8000 echo
```
Responde: `Echo: {mensaje}`

### Greeting
```bash
node tests/fixtures/mock-agent.js 8000 greeting
```
Responde con un saludo amigable.

### Error
```bash
node tests/fixtures/mock-agent.js 8000 error
```
Simula un error del agente.

### Timeout
```bash
node tests/fixtures/mock-agent.js 8000 timeout
```
Simula un timeout (no responde).

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

1. **Verificar logs de wa2ai para errores:**
   ```bash
   docker compose -f infra/docker-compose.lab.yml logs wa2ai-lab | grep -i error
   ```

2. **Verificar que el agente retorna el formato correcto:**
   ```json
   {
     "success": true,
     "response": "Texto de respuesta"
   }
   ```

3. **Verificar conexión de Baileys:**
   ```bash
   curl http://localhost:3000/qr/status
   # Debe estar "connected"
   ```

## Limpieza

### Remover una ruta:
```bash
curl -X DELETE http://localhost:3000/api/routes/5491155551234
```

### Detener mock agent:
Presiona `Ctrl+C` en la terminal donde corre.

### Ver todas las rutas:
```bash
curl http://localhost:3000/api/routes
```
