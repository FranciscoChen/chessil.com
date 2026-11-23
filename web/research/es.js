'use strict';

module.exports = {
 'gigantua-move-generation': {
  title: 'Generación de jugadas al estilo de Gigantua en Stockfish',
  summary: 'Generar jugadas legales desde el tablero de Stockfish y enviarlas directamente al selector de jugadas.',
  sections: [
   ['Un tablero, varios usos', 'Gigantua inspiró el uso de mapas de bits para las casillas de destino y la emisión por lotes. Position y StateInfo de Stockfish siguen siendo la referencia para hacer y deshacer jugadas, enrocar, capturar al paso, detectar repeticiones y actualizar NNUE. Las jugadas normales de piezas pasan directamente a la lista puntuada por lotes, reutilizando información de la casilla de origen. Peones y jugadas especiales conservan sus codificaciones explícitas. Perft puede recibir jugadas o limitarse a contarlas.'],
   ['Volver a una base conservadora', 'Un prototipo posterior generaba y puntuaba candidatos a demanda. Cambió el orden dentro de las fases de búsqueda y rindió peor en partidas de prueba. La recuperación restauró la búsqueda y el orden de referencia, conservando el trabajo inicial de generación. Como se revirtieron varios cambios juntos, las partidas no aíslan la causa.'],
   ['Qué mostró la prueba', 'Perft cuenta las hojas legales a una profundidad dada e incluye posiciones con jugadas especiales. Las cinco búsquedas de cada versión también recorrieron el mismo número de nodos. Las medianas de tiempo fueron prácticamente iguales, de modo que la integración dejó una base de trabajo sin demostrar que la búsqueda fuera más rápida.'],
  ],
 },
 'compact-policy-nnue': {
  title: 'Entrenamiento de la primera política NNUE compacta',
  summary: 'Usar Leela como profesor y entrenar una política pequeña que ordene jugadas dentro de Stockfish.',
  sections: [
   ['La política y la evaluación cumplen funciones distintas', 'Leela proporcionó probabilidades previas sobre jugadas legales para un prototipo que ordenaba la raíz. El primer alumno compacto reutilizó 1.024 características transformadas de NNUE de Stockfish, con una capa oculta de 32 unidades y pesos cuantizados. Ordenaba las alternativas después de la candidata principal. Stockfish seguía evaluando las posiciones y tomando la decisión mediante búsqueda alfa-beta.'],
   ['Qué aprendió el alumno', 'El entrenamiento combinó posiciones de autojuego etiquetadas por Leela con jugadas de 59 campeonatos. Se dividió la validación por partida y se retiraron las posiciones idénticas del conjunto de campeonatos. La quinta de seis épocas produjo la menor entropía cruzada de validación. La mayoría de las etiquetas eran jugadas reales, así que las cifras miden el acuerdo con esas referencias.'],
   ['V2 amplió el alumno', 'El formato binario V2 introdujo una anchura configurable y pesos int16. La ampliación de 32 a 512 unidades conservó las predicciones iniciales al copiar las unidades existentes y poner a cero los pesos de salida de las nuevas. El modelo mayor requirió un optimizador nuevo y los lotes posteriores reanudaron su estado. Los lotes de campeonatos y autojuego se enriquecieron con etiquetas del profesor, mientras que en las partidas el motor utilizaba el alumno.'],
   ['V3 amplió la capacidad de la salida', 'V3 añadió filas conjuntas de origen y destino, un término compartido de promoción y dos indicadores de la columna del rey para distinguir la orientación horizontal. Seguía ligado al transformador fijo de evaluación y recalculaba una proyección densa cada vez que se pedía la política. El primer alumno se cargó correctamente en una búsqueda de un nodo. Esas pruebas dejan por medir su fuerza de juego.'],
  ],
 },
 'incremental-policy-training': {
  title: 'Entrenamiento de la política incremental, de V4 a V5',
  summary: 'Dar a la política características dispersas propias y entrenar salidas para distintas cantidades de material.',
  sections: [
   ['V4 actualiza sus propias características', 'V4 incorporó características de piezas relativas al rey, derechos de enroque y captura al paso. Al pedir la política, actualiza la suma dispersa y recalcula una perspectiva si cambia el grupo o la orientación del rey. Ambas perspectivas alimentan una salida común. Se verificaron anchuras de 128 a 1.024 comparando Python con el motor exportado y probando jugadas, deshacer y jugadas nulas.'],
   ['Entrenamiento y validación en posiciones separadas', 'El entrenamiento pasó a usar etiquetas archivadas, lotes reanudables y un conjunto fijo de validación. El punto de control V4 de la tabla se midió sobre 2.000 posiciones congeladas. Top 1 y top 3 cuentan cuántas veces la jugada de referencia aparece en primer lugar o entre las tres primeras. Miden acuerdo con la referencia. Las partidas cronometradas miden otra propiedad.'],
   ['V5 elige la salida según el material', 'V5 comparte un acumulador de 256 unidades entre cuatro salidas y selecciona una según el número de piezas, incluidos los reyes. Tras el calentamiento con un libro de aperturas se aplican cuotas fijas a cuatro grupos. El grupo de poco material incluye finales generados localmente y etiquetados con jugadas que mantienen el resultado según Syzygy. En las primeras posiciones de Leela se usan probabilidades previas de BT4. En fases posteriores se pueden conservar los objetivos derivados de búsqueda. V5 tiene su propia validación estratificada y fija, por lo que las comparaciones con V4 deben usar ese mismo conjunto.'],
  ],
 },
 'economical-policy-search': {
  title: 'Reducir el coste de la política durante la búsqueda',
  summary: 'Pedir menos inferencias, puntuar menos jugadas y volver a utilizar las puntuaciones ya calculadas.',
  sections: [
   ['Esperar a la fase de jugadas tranquilas', 'El experimento económico de V4 conserva la prioridad de la jugada de la tabla de transposición y de las buenas capturas. Cuando llega a las jugadas tranquilas, puede puntuar hasta ocho candidatas destacadas por el historial, según la profundidad restante y el presupuesto de trabajo. Guarda las puntuaciones brutas por hilo, las vuelve a combinar con el historial en cada visita y adelanta hasta tres candidatas. Si una buena captura corta la búsqueda, no se pide esa inferencia.'],
   ['Medir tiempo además de llamadas', 'La prueba usó tres posiciones, tres repeticiones por posición y versión, 500.000 nodos por búsqueda, un hilo, 16 MiB de hash y modelos ya cargados. El cambio también sustituyó la suma en coma flotante por un núcleo SIMD entero con alternativa escalar. Las llamadas bajaron considerablemente y el tiempo total cayó un 3,2 %. La muestra mide el efecto combinado y es pequeña. En la posición inicial, la mediana fue algo más lenta.'],
   ['La paridad aún requiere pruebas en partidas', 'Un experimento posterior con dos estados del acumulador eliminó el seguimiento de la política en cada jugada. En 24 pares de búsquedas de 500.000 nodos el resultado coincidió y el tiempo fue de 19,740 s frente a 20,337 s. Una prueba posterior a ritmo rápido obtuvo un resultado inferior al de partidas previas con la misma red y otras semillas de apertura. La versión V5 por material revirtió ese acumulador por precaución. La paridad de nodos y el tiempo miden aspectos distintos de los resultados en partidas.'],
  ],
 },
 'policy-guided-reductions': {
  title: 'Reducir la profundidad con márgenes de la política',
  summary: 'Sondear jugadas tranquilas de menor prioridad a menos profundidad, conservando la lógica de nueva búsqueda de Stockfish.',
  sections: [
   ['Dedicar menos nodos a ciertos sondeos', 'El experimento compara cada puntuación bruta con la mejor de las jugadas tranquilas puntuadas. Una diferencia de uno o menos deja intacta la reducción habitual. Una diferencia mayor puede añadir hasta una media jugada de reducción antes del redondeo. El ajuste se reduce a la mitad cuando mejora la evaluación. Las jugadas sin puntuación conservan la reducción habitual. La regla reutiliza las salidas ya calculadas.'],
   ['Conservar las salvaguardas tácticas', 'La regla se limita a nodos en los que se espera un corte y a jugadas tranquilas ordinarias sin jaque y con historial modesto. Excluye la variante principal, evasiones, búsquedas sensibles a mate y verificaciones con una jugada excluida. Si el sondeo reducido supera alfa, Stockfish busca de nuevo a mayor profundidad. Un falso resultado por debajo de alfa puede ocultar una buena defensa. Otro experimento retrasa la inferencia superficial hasta comprobar que la jugada favorita del historial no consigue un corte.'],
   ['Qué muestran las mediciones', 'En 64 posiciones a profundidad 16, con el umbral de inferencia en seis, el orden por sí solo recorrió 5.847.510 nodos y la reducción por margen recorrió 5.948.360, un 1,7 % más. La reducción adicional de media jugada se activó 28 veces. Los sondeos más cortos no redujeron el trabajo total en esta muestra. Todas las pruebas de la tabla usaron 50 ms por jugada, un hilo, 16 MiB de hash y aperturas emparejadas con colores invertidos. Las dos comparaciones de profundidad usaron el mismo ejecutable con las reducciones activas en ambos lados. Variaron el umbral para pedir nuevas inferencias. La comparación con el motor original incluye los demás cambios del híbrido. Todos los intervalos Elo incluyen el cero, así que la ventaja de fuerza y el mejor umbral siguen abiertos.'],
  ],
 },
};
