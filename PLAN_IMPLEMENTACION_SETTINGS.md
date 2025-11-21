Perfecto, aquí nos metemos ya en “producto serio” 😎
Vamos a diseñar la zona de Settings del restaurante como si fuese un SaaS tocho: clara, modular y preparada para crecer.

Te propongo dos cosas:
	1.	Arquitectura funcional de las páginas de Settings (qué pantallas, qué mete cada una).
	2.	Un plan de implementación por fases para que no sea un monstruo inacabable.

⸻

1. Cómo organizar la sección de Settings

1.1. Estructura general

En el portal, arriba o en el sidebar, añadiría una opción:
	•	“Configuración” → /settings
	•	Dentro, tabs internas:
	1.	General
	2.	Horario y Reservas
	3.	Menú
	4.	FAQ y Mensajes del Bot
	5.	Branding (Logo & Estilo)
	6.	(Opcional futuro) Notificaciones / Avanzado

Y muy importante: arriba del todo, un selector de restaurante si el tenant tiene varios:

Restaurante: [ El Asador de Pepe ▼ ]

Todos los settings que edites serían siempre para ese restaurant_id.

⸻

1.2. Tab “General”

Objetivo: datos básicos del restaurante.

Campos (por restaurant_info):
	•	Nombre del restaurante
	•	Dirección
	•	Teléfono
	•	Web
	•	Email de contacto
	•	Idioma preferido para el bot (es, en, de…)
	•	Zona horaria del local (si quieres permitir override del tenant)
	•	Capacidad / tamaño máximo de grupo (max_party_size)
	•	Antelación mínima para reservar (min_hours_advance, por ejemplo 2h, 24h, etc.)

UI:
	•	Formulario simple tipo 2 columnas.
	•	Botón Guardar cambios.
	•	Mensajito tipo “✅ Configuración guardada”.

Backend:
	•	Server action updateRestaurantGeneralSettings(restaurantId, data)
	•	Actualiza directamente restaurant_info.

⸻

1.3. Tab “Horario y Reservas”

Aquí gestionan cuándo se puede reservar y algunas reglas.

Secciones:
	1.	Horario de apertura por día
	•	Estructura tipo:
	•	Lunes: [12:00–15:30] [19:00–23:00]
	•	Martes: cerrado / mismos campos
	•	Internamente esto va contra el campo opening_hours de restaurant_info (ya lo tienes).
	2.	Franja de reservas permitidas
	•	Por ejemplo:
	•	“Las reservas sólo se pueden hacer entre las 13:00 y 15:30, y entre las 20:00 y 23:00”.
	•	Puedes usar el mismo opening_hours o un reservation_hours si quieres afinar más.
	3.	Slots de tiempo
	•	Tamaño de paso: 15 min, 30 min, 60 min…
	•	Esto te sirve para que el bot y el portal no metan cosas raras tipo 13:07.
	4.	Política de límite / capacidad (futuro cercano):
	•	Máximo de reservas por franja (ej. “no más de 10 reservas cada 15 min”).
	•	(Esto ya es medio engine de capacity, podemos dejarlo en Fase 2–3.)

Backend:
	•	Server action updateOpeningHours(restaurantId, openingHoursJson)
	•	Integra con la misma lógica que usa el bot en validateOpeningHours.

⸻

1.4. Tab “Menú”

Aquí queremos dos cosas:
	1.	Ver el menú actual que el sistema tiene.
	2.	Permitir cambios básicos sin tener que re-subir PDF cada vez.

Subsecciones:

A) Vista del menú actual
	•	Mostrar por categorías:
	•	Entrantes, Principales, Postres, Bebidas, etc.
	•	Cada plato:
	•	Nombre
	•	Descripción
	•	Precio
	•	Marcas tipo: 🌱 vegano, 🌾 contiene gluten, etc.

Esta info sale de restaurant_info.menu_items (JSON) o de una tabla específica si luego movemos a RAG/estructura híbrida.

B) Edición rápida
	•	Permitir:
	•	editar nombre, descripción y precio de un plato,
	•	activar/desactivar un plato (“no disponible”),
	•	añadir un plato nuevo dentro de una categoría existente.

Nada de locuras al principio: edición básica de CRUD.

C) “Reprocesar” menú desde archivo / URL
	•	Botón tipo: Actualizar menú desde archivo o URL.
	•	Abre un pequeño panel:
	•	Opción 1: subir PDF/imagen.
	•	Opción 2: pegar URL de la carta en la web.
	•	Por debajo:
	•	llamas al mismo flujo que ya tienes (menu_processor / web_scraper),
	•	guardas resultado en processed_menus,
	•	y luego actualizas restaurant_info.menu_items ADEMÁS de, si quieres, disparar update en la tabla RAG (futura).

Backend:
	•	Server actions:
	•	getRestaurantMenu(restaurantId)
	•	updateMenuItem(restaurantId, itemId, data)
	•	addMenuItem(restaurantId, data)
	•	toggleMenuItemAvailability(restaurantId, itemId)
	•	reprocessMenuFromSource(restaurantId, file | url)

⸻

1.5. Tab “FAQ y Mensajes del Bot”

Meta: que el restaurante pueda personalizar el tono del bot y la info que da, sin tocar prompts a mano.

Secciones:
	1.	FAQs
	•	Lista tipo:
	•	Pregunta → Respuesta.
	•	Esto lo puedes almacenar en restaurant_info.faq (JSON) o en una tabla restaurant_faqs.
	•	El bot las usa como contexto (“preguntas frecuentes del restaurante”).
	2.	Mensajes importantes
Cosas como:
	•	Mensaje de bienvenida del bot.
	•	Mensaje cuando no hay disponibilidad.
	•	Mensaje para cambios/cancelaciones tardías.
	•	Firmas del estilo “Equipo de [Nombre del Resturante]”.
Estos textos los guardaría en un JSON tipo restaurant_info.bot_settings:

{
  "welcome_message": "...",
  "no_availability_message": "...",
  "closing_soon_message": "...",
  "signature": "Equipo de Asador Pepe"
}


	3.	Reglas especiales (futuro):
	•	“No se aceptan reservas para más de X personas los sábados por la noche”.
	•	“No se aceptan reservas el mismo día después de las 18:00.”

Backend:
	•	getRestaurantFaqs(restaurantId)
	•	updateRestaurantFaqs(restaurantId, faqsJson)
	•	updateBotMessages(restaurantId, botSettingsJson)

El bot, al construir el contexto o el system prompt, metería estas FAQs y mensajes.

⸻

1.6. Tab “Branding (Logo & Estilo)”

Aquí es donde les das sensación de SaaS cuidado.

Contenido:
	1.	Logo del restaurante
	•	Subida de imagen:
	•	cuadrada preferiblemente,
	•	validas tamaño y peso.
	•	Guardas en Supabase Storage (bucket restaurant_logos) y guardas la logo_url en restaurant_info o tenants según sea por restaurante o por tenant.
	2.	Colores principales
	•	Color primario (para botones, acentos).
	•	Color secundario.
	•	Opcional: color del fondo de la sidebar en el portal.
	3.	Vista previa
	•	Muestra cómo se vería la cabecera del portal con ese logo y esos colores.

Backend:
	•	Server action uploadRestaurantLogo(restaurantId, file) → obtiene URL de Supabase Storage.
	•	updateRestaurantBranding(restaurantId, { logo_url, primary_color, secondary_color })

⸻

2. Plan de implementación por fases

Vamos a hacerlo en modo “sprints” para que sea atacable.

FASE 1 — Estructura y General + Branding básico

Objetivo: que el restaurante ya pueda:
	•	ver su nombre real y datos,
	•	cambiar datos básicos,
	•	subir logo.

Tareas:
	1.	Crear ruta /settings + SettingsLayout con tabs (General, Horario, Menú, FAQ, Branding).
	2.	Implementar tab General:
	•	leer restaurant_info desde Supabase.
	•	formulario con nombre, dirección, teléfono, email, web, max_party_size, min_hours_advance.
	•	server action updateRestaurantGeneralSettings.
	3.	Implementar tab Branding (solo logo):
	•	subida de logo,
	•	guardar logo_url,
	•	mostrar logo en el sidebar/topbar del portal.

⸻

FASE 2 — Horario y Reservas + Menú (sólo lectura)

Objetivo: al menos ver mejor cómo el sistema entiende el horario y el menú.

Tareas:
	1.	Tab Horario y Reservas:
	•	pintar horario actual desde opening_hours.
	•	permitir editar rangos por día con una UI básica (time pickers).
	•	guardar con updateOpeningHours.
	2.	Tab Menú:
	•	mostrar menú actual desde menu_items.
	•	lista por categorías; sin edición aún o solo edición de texto básico.

⸻

FASE 3 — Edición del Menú + FAQ y Mensajes del Bot

Objetivo: que puedan ajustar contenido que afecta al bot sin soporte técnico.

Tareas:
	1.	Tab Menú (completa):
	•	permitir:
	•	editar nombre/descripcion/precio/estado de los platos,
	•	añadir plato nuevo.
	•	botón “Reprocesar desde PDF/URL” que dispara tu pipeline de menu_processor.
	2.	Tab FAQ y Mensajes:
	•	CRUD de FAQs.
	•	formulario para textos clave del bot: bienvenida, no disponibilidad, firma, etc.
	•	guardar en faq y bot_settings asociados al restaurante.

⸻

FASE 4 — Afinado: slots, capacity, reglas avanzadas

Objetivo: dar superpoderes de configuración sin romper la simplicidad.

Tareas posibles:
	•	Añadir slot size (15/30/60 min).
	•	Añadir límite de reservas por franja.
	•	Añadir reglas especiales (ej. “no permite grupos grandes en ciertas franjas”).
	•	Integrar esto con:
	•	la lógica del bot,
	•	y, si quieres, con la vista de reservas del portal (p.ej. mostrar capacidad ocupada por franja).

⸻

Si te parece bien, en el siguiente paso podemos:
	•	bajar al detalle de una de las tabs (por ejemplo General o Menú) y te diseño:
	•	el componente de React/Next,
	•	el tipo de datos,
	•	y la server action con Supabase ya “copy-paste ready”.


----------------------------------------------------------------------------
L ode arriba se planeo, luego hubo problemas con la barra de dropdown seleccion restaurante y cuando seguimos me dio este nuevo plan a contimuacion para la implementacio nde los settings.   De momento voy con ello y no l ode arriba, cuando acabe igua lle digo que compare si falta algo de lo de arriba::

    ----- Segunda iteracion de pedirle el plan para settings:
    ✅ Checklist alto nivel – Página de Ajustes del restaurante

1. Infraestructura de la página de Ajustes
	•	Crear/ajustar app/settings/page.tsx como Server Component:
	•	Usar searchParams: Promise<{ restaurantId?: string }> (Next 15).
	•	Hacer await searchParams para leer el restaurantId.
	•	Llamar a getTenantAndRestaurants(requestedRestaurantId).
	•	Obtener tenantId, currentRestaurantId, accessibleRestaurants, role.
	•	Cargar datos de:
	•	restaurant_info (nombre, dirección, timezone, phone, website, logo_url, etc.).
	•	restaurant_data (faqs, menu, opening_hours).
	•	Renderizar DashboardShell + contenido de ajustes.
	•	Crear componente cliente SettingsContent en app/settings/SettingsContent.tsx:
	•	Tabs/pestañas: General, Menú, FAQs, Horarios, Logo.
	•	Mensajes globales de éxito/error.
	•	Respeto al rol (role) → modo lectura si no tiene permisos.

⸻

2. Server Actions para guardar ajustes (Supabase)

En app/settings/actions.ts:
	•	updateGeneralSettings
	•	Actualizar restaurant_info con nombre, teléfono, web, timezone, dirección, etc.
	•	revalidatePath("/settings").
	•	updateMenuJson
	•	Recibir JSON (string) desde textarea.
	•	JSON.parse, validar.
	•	Guardar en restaurant_data.menu o la columna correspondiente.
	•	revalidatePath("/settings").
	•	updateFaqs
	•	Recibir JSON (array de FAQs) desde textarea.
	•	Validar, guardar en restaurant_data.faqs.
	•	updateOpeningHours
	•	Recibir JSON con horarios (por días).
	•	Guardar en restaurant_data.opening_hours.
	•	uploadLogo
	•	Recibir File de FormData.
	•	Subir a Supabase Storage (restaurant-logos o similar).
	•	Obtener publicUrl.
	•	Guardar logo_url en restaurant_info.
	•	revalidatePath("/settings").
	•	reprocessMenu
	•	Recibir restaurantId.
	•	Por ahora: solo console.log + revalidatePath("/settings").
	•	Dejar comentado dónde engancharás:
	•	Vision API → regenerar JSON menú.
	•	Pipeline RAG → embeddings.

⸻

3. Pestañas concretas de UI (todas con tu look & feel actual)
	•	Pestaña “General”
	•	Card con fondo tipo bg-[#111218], borde border-zinc-800, igual que el resto del portal.
	•	Inputs:
	•	Nombre del restaurante
	•	Teléfono
	•	Web
	•	Dirección
	•	Ciudad
	•	País
	•	Timezone
	•	Botón “Guardar cambios”.
	•	Pestaña “Menú”
	•	Textarea grande con JSON “bonito” del menú (JSON.stringify(menu, null, 2)).
	•	Botón “Guardar menú”.
	•	Botón secundario “Reprocesar menú (IA)”:
	•	Llama a reprocessMenu.
	•	Menor protagonismo visual, tipo outline, pero elegante.
	•	Pestaña “FAQs”
	•	Textarea con JSON de FAQs (array).
	•	Hint textual arriba: ejemplo de formato:
	•	[{ "q": "¿Tenéis opciones sin gluten?", "a": "Sí, ..." }, ...]
	•	Botón “Guardar FAQs”.
	•	Pestaña “Horarios”
	•	Textarea JSON con estructura por días (opening_hours).
	•	Hint con ejemplo de formato:
    {
  "monday": [{ "from": "13:00", "to": "15:30" }],
  "tuesday": []
}•	Botón “Guardar horarios”.

	•	Pestaña “Logo”
	•	Mostrar logo actual si lo hay (<img src={logoUrl} /> con estilo redondeado).
	•	Input type file (solo imágenes).
	•	Botón “Subir logo”.
	•	Nota pequeña tipo: “Usaremos este logo en el portal y comunicaciones.”

⸻

4. Roles y permisos
	•	En SettingsContent, derivar isReadOnly según role:
	•	Owner / group_manager / admin → pueden editar.
	•	staff / waiter / viewer → solo ver (inputs disabled, sin botones de guardar).
	•	Visualmente:
	•	Mostrar un pequeño texto “Solo lectura” si el rol no puede editar.

⸻

5. Integración y coherencia visual
	•	Mantener el mismo look and feel que DashboardShell y ReservationsView:
	•	Fondos oscuros (bg-[#0b0b0d], bg-[#111218], bg-zinc-900/60).
	•	Bordes border-zinc-800.
	•	Textos text-zinc-100 / text-zinc-400.
	•	Botones redondeados, con gradients/hover ligeros tipo:
	•	bg-indigo-600 hover:bg-indigo-500
	•	bg-zinc-900 hover:bg-zinc-800
	•	Reutilizar layout actual de /settings (título + descripción + contenido).

⸻

6. Futuro RAG (solo preparar huecos)
	•	En reprocessMenu dejar comentarios claros:
	•	Dónde meter la llamada a Vision API (PDF/imagen/URL).
	•	Dónde meter la regeneración de embeddings (tabla RAG).
	•	En la UI, copy amigable:
	•	“Cuando tengamos el motor de IA de menú activado, este botón volverá a analizar tu carta y la pondrá al día.”