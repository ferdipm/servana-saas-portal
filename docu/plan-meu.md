Propuesta de Upgrade Premium para el Menu Editor
Voy a crear un MenuEditor al mismo nivel de calidad que el OpeningHoursEditor, con estas características premium:
✨ Fase 1: Editor Premium de Menú (Core Features)
1. Sistema de Categorías con Drag & Drop
Reordenar categorías visualmente
Añadir/eliminar/renombrar categorías inline
Iconos y colores personalizados por categoría
Contador de platos por categoría
2. Editor de Platos Inline
Tarjetas de platos con diseño glassmorphism
Edición inline sin modales (como los turnos)
Drag & drop para reordenar platos dentro de categorías
Campos: nombre, descripción, alérgenos
Badges visuales para alérgenos
3. Auto-save con Debounce
Mismo patrón que Opening Hours (800ms)
Indicador de "Guardando..." / "Guardado"
Sin necesidad de botón "Guardar"
4. Preview del Menú
Vista previa de cómo se ve el menú para el cliente
Toggle entre modo "Editar" y modo "Vista Cliente"
¿Te parece bien que empiece con la Fase 1? Voy a crear:
MenuEditor.tsx - Componente principal con drag & drop
MenuCategory.tsx - Componente de categoría editable
DishCard.tsx - Tarjeta de plato inline
updateMenu action - Server action para guardar cambios
