<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Categoria;
use App\Models\Pregunta;
use App\Models\OpcionesPregunta;
use App\Models\Contexto;
use Illuminate\Support\Facades\DB;

class PreguntasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Obtener o crear la categoría de Educación para el Trabajo
            $categoria = Categoria::firstOrCreate(
                ['nombre' => 'EPT'],
                ['descripcion' => 'Educación para el Trabajo']
            );

        $preguntas = [
            // Examen A14-EBRS-32 (2018)
            [
                'codigo' => 'AA18_17_71',
                'ano' => 2018,
                'enunciado' => 'Un docente ha decidido utilizar un miniQuest para una de sus sesiones. ¿Cuál de los siguientes procedimientos permite que el docente elabore dicho miniQuest?',
                'opciones' => [
                    ['contenido' => 'Organizar un cuestionario con preguntas de menor a mayor complejidad, solicitar a los estudiantes que busquen información en fuentes confiables de internet y pedir que presenten sus respuestas en un portafolio virtual.', 'es_correcta' => false],
                    ['contenido' => 'Formular un problema de contexto real, plantear preguntas que serán resueltas utilizando las fuentes de información seleccionadas por el docente y describir las acciones que los estudiantes van a realizar para resolver el problema.', 'es_correcta' => true],
                    ['contenido' => 'Plantear una pregunta sobre un tema de interés de los estudiantes, solicitar que seleccionen fuentes de información actualizada y pedir que elaboren un organizador visual haciendo uso de dichas fuentes y un recurso TIC, como el presentador de diapositivas.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_72',
                'ano' => 2018,
                'enunciado' => 'El propósito de un docente es utilizar las TIC en sus actividades de aprendizaje. ¿Cuál de las siguientes acciones pedagógicas integra de manera pertinente el uso de un presentador de diapositivas?',
                'opciones' => [
                    ['contenido' => 'Pedir que elaboren individualmente una presentación acerca de su idea de negocio y que utilicen las herramientas necesarias, apoyándose en las características intuitivas del aplicativo.', 'es_correcta' => true],
                    ['contenido' => 'Entregar un manual del presentador de diapositivas, pedir que lo revisen en grupo y que cada uno explique a sus compañeros cómo se usa cada una de las herramientas.', 'es_correcta' => false],
                    ['contenido' => 'Realizar una demostración del uso del presentador de diapositivas poniendo énfasis en la explicación del uso de la barra de menú y de las herramientas.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_73',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas describe la principal ventaja de usar el método de proyectos para lograr aprendizajes?',
                'opciones' => [
                    ['contenido' => 'Permite la elaboración de un producto tangible que evidencia el aprendizaje logrado por los estudiantes.', 'es_correcta' => false],
                    ['contenido' => 'Permite que los desempeños de los estudiantes sean homogéneos ya que realizan tareas similares y no compiten entre ellos.', 'es_correcta' => false],
                    ['contenido' => 'Permite que los estudiantes de forma integrada desarrollen y apliquen conocimientos en la solución de un problema de interés.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_74',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes acciones pedagógicas promueve un aprendizaje colaborativo?',
                'opciones' => [
                    ['contenido' => 'Formar a los estudiantes en grupos, y entregar una ficha de trabajo en la que cada estudiante responderá una pregunta. Luego, solicitar que junten sus respuestas y las presenten en un papelógrafo. Después, invitar a un representante para que exponga el producto final.', 'es_correcta' => false],
                    ['contenido' => 'Formar a los estudiantes en grupos, y entregar una ficha de trabajo a cada estudiante para que la resuelva de manera individual. Luego, solicitar que compartan y comparen lo trabajado, de modo que lleguen a respuestas consensuadas. Después, pedir que plasmen estas respuestas en una ficha de trabajo grupal.', 'es_correcta' => true],
                    ['contenido' => 'Formar a los estudiantes en grupos, y entregar una ficha de trabajo en la que se ha marcado qué pregunta debe responder cada estudiante. Luego, solicitar que cada integrante del grupo lea su respuesta de modo que el resto tome nota y complete la ficha. Después, plantear preguntas para verificar que todos hayan completado la ficha.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_75',
                'ano' => 2018,
                'enunciado' => 'Luego de que los estudiantes lograron plantear soluciones creativas para resolver un problema, el docente tiene como propósito promover en ellos la reflexión sobre su proceso de resolución. ¿Cuál de las siguientes acciones pedagógicas es pertinente para el logro de su propósito?',
                'opciones' => [
                    ['contenido' => 'Solicitar que identifiquen los procedimientos que siguieron para solucionar el problema y cómo resolvieron las dificultades que enfrentaron.', 'es_correcta' => true],
                    ['contenido' => 'Preguntar: "¿De qué trata el problema? ¿Qué condiciones se plantean en el problema? ¿Qué necesidad se busca resolver en el problema?".', 'es_correcta' => false],
                    ['contenido' => 'Plantear un problema similar para que adapten las soluciones ya propuestas, y así desarrollen su autonomía.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_76',
                'ano' => 2018,
                'enunciado' => 'Al finalizar una actividad realizada en el taller de EPT, dos estudiantes sostienen la siguiente conversación:<br><br>• Luis: "María, no he podido practicar con las herramientas porque las usaste durante toda la hora del taller. Por tu culpa, no sabré cómo usarlas".<br>• María: "Sé que habíamos llegado a un acuerdo, pero no podía dejar a medias el trabajo que nos dejaron. Comprende que contamos con pocas herramientas".<br><br>Teniendo en cuenta lo expresado por cada estudiante en la conversación presentada, ¿cuál de las siguientes alternativas indica la fuente del conflicto entre ellos?',
                'opciones' => [
                    ['contenido' => 'Los valores y creencias.', 'es_correcta' => false],
                    ['contenido' => 'Las necesidades e intereses.', 'es_correcta' => true],
                    ['contenido' => 'Los sentimientos y emociones.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_77',
                'ano' => 2018,
                'enunciado' => 'En el marco del desarrollo de un proyecto para brindar un servicio en una localidad, ¿cuál de las siguientes características corresponde a un servicio?',
                'opciones' => [
                    ['contenido' => 'Su utilización requiere interacción y prestación.', 'es_correcta' => true],
                    ['contenido' => 'Su calidad depende del proveedor de materiales e insumos.', 'es_correcta' => false],
                    ['contenido' => 'Su propiedad se puede transferir de vendedor a comprador.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_78',
                'ano' => 2018,
                'enunciado' => 'Un estudiante está evaluando su idea de negocio y se necesita saber si su propuesta cubre o no una demanda insatisfecha en su localidad. ¿Cuál de las siguientes acciones es pertinente para su propósito?',
                'opciones' => [
                    ['contenido' => 'Aplicar un focus group a los vecinos de su barrio.', 'es_correcta' => false],
                    ['contenido' => 'Analizar la demanda actual de un producto.', 'es_correcta' => false],
                    ['contenido' => 'Realizar una investigación de mercado.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_79',
                'ano' => 2018,
                'enunciado' => 'Un grupo de estudiantes está discutiendo sobre los criterios demográficos para segmentar su mercado a partir de la identificación de las necesidades de sus potenciales clientes. ¿Cuál de los siguientes aspectos permite conocer este criterio de segmentación?',
                'opciones' => [
                    ['contenido' => 'Sexo y edad de las personas.', 'es_correcta' => true],
                    ['contenido' => 'Actividades e intereses de las personas.', 'es_correcta' => false],
                    ['contenido' => 'Nivel de ingresos y nivel de estudios de las personas.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_80',
                'ano' => 2018,
                'enunciado' => 'Un grupo de estudiantes quiere definir los costos para elaborar su prototipo. Para ello están considerando los costos directos e indirectos. ¿Cuál de las siguientes propuestas de los estudiantes implica un costo directo?',
                'opciones' => [
                    ['contenido' => 'Ana: "El esmalte para el acabado del prototipo".', 'es_correcta' => true],
                    ['contenido' => 'Berta: "El mantenimiento de las máquinas".', 'es_correcta' => false],
                    ['contenido' => 'Carlos: "La energía eléctrica".', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_81',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas corresponde a la definición de punto de equilibrio de una empresa?',
                'opciones' => [
                    ['contenido' => 'La oferta es igual a la demanda.', 'es_correcta' => false],
                    ['contenido' => 'La relación beneficio-costo es igual a 1.', 'es_correcta' => false],
                    ['contenido' => 'El ingreso por la venta es igual a los costos más los gastos.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_82',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas corresponde a la definición de marketing estratégico?',
                'opciones' => [
                    ['contenido' => 'Es el conjunto de estrategias que se aplican para que el producto sea de buena calidad.', 'es_correcta' => false],
                    ['contenido' => 'Es el conjunto de estrategias que se orientan a retener a los clientes y construir fidelidad.', 'es_correcta' => true],
                    ['contenido' => 'Es el conjunto de estrategias que permiten que el diseño preliminar del producto sea atractivo para los clientes.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_83',
                'ano' => 2018,
                'enunciado' => 'Según las normas ISO, ¿cuál de las siguientes formas es utilizada en las señales de advertencia?',
                'opciones' => [
                    ['contenido' => 'Redonda.', 'es_correcta' => false],
                    ['contenido' => 'Triangular.', 'es_correcta' => true],
                    ['contenido' => 'Rectangular.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_84',
                'ano' => 2018,
                'enunciado' => 'Según las normas ISO, ¿cuál es el color de fondo que se utiliza en las señales de obligación?',
                'opciones' => [
                    ['contenido' => 'Azul.', 'es_correcta' => true],
                    ['contenido' => 'Rojo.', 'es_correcta' => false],
                    ['contenido' => 'Verde.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_85',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas corresponde a una de las características de la teoría para resolver problemas de forma inventiva (TRIZ)?',
                'opciones' => [
                    ['contenido' => 'Es una guía estructurada de problemas resueltos que sirven de base a la solución de nuevos problemas.', 'es_correcta' => false],
                    ['contenido' => 'Es una técnica confiable que está basada en herramientas psicológicas relacionadas con la inventiva.', 'es_correcta' => false],
                    ['contenido' => 'Es un procedimiento sistemático que permite resolver problemas inventivos.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_86',
                'ano' => 2018,
                'enunciado' => 'Considerando el análisis FODA de un proyecto que consiste en brindar servicios de gimnasio, ¿cuál de las siguientes alternativas corresponde a una fortaleza?',
                'opciones' => [
                    ['contenido' => 'Ausencia de gimnasios con infraestructura moderna en la zona.', 'es_correcta' => false],
                    ['contenido' => 'Personal capacitado y con experiencia para brindar entrenamiento físico y asesoría nutricional.', 'es_correcta' => true],
                    ['contenido' => 'Ingreso de competidores que ofrecen servicios similares y que cuentan con una fuerte presencia de su marca en el mercado.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_87',
                'ano' => 2018,
                'enunciado' => 'Considerando el análisis FODA de una empresa que ofrece servicios de limpieza, ¿cuál de las siguientes alternativas corresponde a una oportunidad?',
                'opciones' => [
                    ['contenido' => 'Precio competitivo de la empresa con relación al mercado local en el servicio de limpieza.', 'es_correcta' => false],
                    ['contenido' => 'Flexibilidad para contratar temporalmente operarios de limpieza en el sector productivo.', 'es_correcta' => false],
                    ['contenido' => 'Ayuda financiera para la realización de proyectos de limpieza.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_88',
                'ano' => 2018,
                'enunciado' => 'Como parte de una actividad en grupo, el docente observa que algunos estudiantes están elaborando un dibujo de su prototipo; otros ya le están incorporando los detalles técnicos de su construcción. Además, cada grupo va tomando nota de los procedimientos que está ejecutando.<br><br>¿Cuál es el propósito de aprendizaje en la actividad realizada por los estudiantes?',
                'opciones' => [
                    ['contenido' => 'Diseñar el prototipo del producto que se pretende elaborar.', 'es_correcta' => false],
                    ['contenido' => 'Autoevaluar las habilidades utilizadas para dibujar el prototipo.', 'es_correcta' => false],
                    ['contenido' => 'Planificar el proceso técnico para la elaboración del prototipo de su producto.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_89',
                'ano' => 2018,
                'enunciado' => 'El propósito de un docente es que los estudiantes elaboren la estructura de costos de un proyecto de emprendimiento económico. Luego de que los estudiantes realizaron diversas actividades, el docente plantea una evaluación de proceso. Como parte del análisis de los resultados de esta evaluación, encuentra que el 20% de los estudiantes confunde costo fijo con costo variable al elaborar la estructura de costos.<br><br>Considerando estos resultados, ¿cuál de las siguientes acciones pedagógicas es más pertinente para abordar el error de los estudiantes?',
                'opciones' => [
                    ['contenido' => 'Formular a los estudiantes que tienen dificultades las siguientes preguntas: "¿Cuáles de sus costos dependen de la cantidad de productos que elaboren? ¿Cuáles no? ¿Cuál es la diferencia entre costo fijo y variable?". Luego, pedir que revisen su estructura de costo.', 'es_correcta' => true],
                    ['contenido' => 'Entregar a los estudiantes con dificultades una cartilla con la definición de costo fijo y costo variable. Luego, pedir que en grupo respondan a las siguientes preguntas: "¿Qué es un costo fijo? ¿Qué es un costo variable?", y solicitar que revisen su estructura de costo.', 'es_correcta' => false],
                    ['contenido' => 'Solicitar a todos los estudiantes que busquen en internet ejemplos de costo fijo y costo variable, para seleccionar aquellos que son similares a los que plantearon en su estructura de costos. Luego, pedir a todos que revisen dicha estructura.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_90',
                'ano' => 2018,
                'enunciado' => 'La comisión de seguridad de una empresa desea indicar que el personal que ingrese a la planta de producción debe protegerse de ruidos muy fuertes. ¿Qué tipo de señal de seguridad es pertinente?',
                'opciones' => [
                    ['contenido' => 'De advertencia.', 'es_correcta' => false],
                    ['contenido' => 'De prohibición.', 'es_correcta' => false],
                    ['contenido' => 'De obligación.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_91',
                'ano' => 2018,
                'enunciado' => 'Como medida de seguridad, la brigada de señalización de una empresa colocará una señal para indicar que, en uno de los talleres, se producen emanaciones tóxicas. Por ello, se requiere que el personal ingrese usando máscara y balón de oxígeno (equipo autónomo).<br><br>¿Cuál de los siguientes tipos de señal de seguridad combinada se debe colocar en este taller?',
                'opciones' => [
                    ['contenido' => 'De advertencia y prohibición.', 'es_correcta' => false],
                    ['contenido' => 'De advertencia y obligación.', 'es_correcta' => true],
                    ['contenido' => 'De prohibición y obligación.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_92',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas expresa el propósito de realizar pruebas en los prototipos?',
                'opciones' => [
                    ['contenido' => 'Verificar el desempeño técnico.', 'es_correcta' => true],
                    ['contenido' => 'Conocer una versión definitiva y operable.', 'es_correcta' => false],
                    ['contenido' => 'Estimar el tiempo de fabricación del producto final.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_93',
                'ano' => 2018,
                'enunciado' => 'Según el Manual de Salud Ocupacional del Minsa, ¿en qué etapa de la gestión de prevención de riesgos ocupacionales se identifican los accidentes?',
                'opciones' => [
                    ['contenido' => 'Etapa de reconocimiento.', 'es_correcta' => true],
                    ['contenido' => 'Etapa de evaluación.', 'es_correcta' => false],
                    ['contenido' => 'Etapa de control.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_94',
                'ano' => 2018,
                'enunciado' => 'En una actividad, los estudiantes están utilizando un diagrama de causa-efecto y uno de Pareto para analizar información recogida acerca de los productos defectuosos.<br><br>¿Cuál es el principal propósito de aprendizaje de la actividad que realizan los estudiantes?',
                'opciones' => [
                    ['contenido' => 'Identificar el porcentaje de defectos de los productos para implementar las acciones de mejora.', 'es_correcta' => false],
                    ['contenido' => 'Determinar los problemas de calidad en la elaboración de los productos para ordenarlos por prioridad.', 'es_correcta' => true],
                    ['contenido' => 'Reconocer los tipos de defectos que se han producido al elaborar los productos para registrar su frecuencia.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_95',
                'ano' => 2018,
                'enunciado' => 'Con respecto al control de la calidad, ¿cuál de las siguientes tareas es de menor demanda cognitiva?',
                'opciones' => [
                    ['contenido' => 'Organizar un diagnóstico que permita detectar las causas de los defectos en el producto final.', 'es_correcta' => false],
                    ['contenido' => 'Describir los signos externos que han aparecido desde que una máquina comenzó a funcionar mal.', 'es_correcta' => true],
                    ['contenido' => 'Diseñar un sistema de control de la calidad que permita la sostenibilidad de la implementación de mejoras.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_96',
                'ano' => 2018,
                'enunciado' => 'Un docente muestra el siguiente diagrama de flujo a los estudiantes y les propone analizar la relación entre los símbolos utilizados.<br><br>Luego de la participación de varios estudiantes, uno de ellos afirma: "Si no se cumple con el control de calidad, se notifica y se vuelve a la recepción de mercancía".<br><br>¿Cuál de los siguientes errores se evidencia en la afirmación del estudiante?',
                'opciones' => [
                    ['contenido' => 'No establece la diferencia entre un proceso y una decisión.', 'es_correcta' => false],
                    ['contenido' => 'No interpreta el significado del proceso Control de calidad.', 'es_correcta' => false],
                    ['contenido' => 'No identifica el cierre de un proceso.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_97',
                'ano' => 2018,
                'enunciado' => 'Un docente plantea una actividad para que los estudiantes, con su monitoreo, elaboren un prototipo utilizando máquinas, herramientas e instrumentos.<br><br>¿Cuál de las siguientes alternativas es un indicador de desempeño que permite evaluar el aprendizaje de los estudiantes en esta actividad?',
                'opciones' => [
                    ['contenido' => 'Elabora la ficha técnica de las máquinas, herramientas e instrumentos utilizados en el proceso de producción.', 'es_correcta' => false],
                    ['contenido' => 'Comprende la importancia del uso correcto de máquinas, herramientas e instrumentos.', 'es_correcta' => false],
                    ['contenido' => 'Manipula máquinas, herramientas e instrumentos según normas de seguridad.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_98',
                'ano' => 2018,
                'enunciado' => 'El taller de EPT adquiere equipos de última tecnología que utilizarán los estudiantes para elaborar los diferentes productos de sus proyectos. El docente, antes de usar los equipos, decide capacitar a sus estudiantes. Sin embargo, dos de ellos expresan que no requieren dicha capacitación argumentando que prefieren seguir usando la máquina antigua, ya que la manejan muy bien y muy pocos productos que han elaborado tienen fallas.<br><br>Considerando la situación anterior, ¿cuál de los siguientes aspectos se necesita trabajar con estos dos estudiantes?',
                'opciones' => [
                    ['contenido' => 'Disposición al trabajo en equipo.', 'es_correcta' => false],
                    ['contenido' => 'Adaptación al cambio.', 'es_correcta' => true],
                    ['contenido' => 'Toma de decisiones.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_99',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes acciones pedagógicas es pertinente para que los estudiantes elaboren el presupuesto de su proyecto, haciendo uso de la hoja de cálculo?',
                'opciones' => [
                    ['contenido' => 'Realizar la demostración en la que se usa la hoja de cálculo para integrar funciones estadísticas avanzadas que podrían ser de utilidad para el desarrollo del presupuesto de su proyecto. Luego, pedir que practiquen en la hoja de cálculo el uso de estas funciones estadísticas.', 'es_correcta' => false],
                    ['contenido' => 'Pedir que identifiquen en qué tareas les puede ayudar una hoja de cálculo en función del desarrollo de su proyecto. Luego, solicitar que exploren la hoja de cálculo, y utilicen aquellas herramientas y funciones que les puedan ser de utilidad.', 'es_correcta' => true],
                    ['contenido' => 'Solicitar que lean todo el manual de uso de una hoja de cálculo y que prueben el uso de cada una de las herramientas y funciones. Luego, pedir que compartan con sus compañeros las dificultades que se les presentaron y cómo las solucionaron.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_100',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas expresa una de las principales características del podcast como recurso didáctico para el logro de aprendizajes?',
                'opciones' => [
                    ['contenido' => 'Facilita al estudiante la recepción de información a través de un audio.', 'es_correcta' => true],
                    ['contenido' => 'Fortalece la interacción, en tiempo real, entre el estudiante y los temas de su interés.', 'es_correcta' => false],
                    ['contenido' => 'Propicia la elaboración de audios variados acerca de los temas que le interesan al estudiante.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_03_71',
                'ano' => 2018,
                'enunciado' => 'Una docente desea que sus estudiantes reflexionen sobre prácticas culturales en el Perú en el marco del enfoque intercultural. Para ello, está planificando una unidad didáctica que aborde la fiesta de carnaval. ¿Cuál de las siguientes acciones es más pertinente para desarrollar esta unidad?',
                'opciones' => [
                    ['contenido' => 'Diseñar sesiones que aborden las fiestas de carnaval más concurridas del país y su beneficio para la difusión de la cultura peruana.', 'es_correcta' => false],
                    ['contenido' => 'Diseñar sesiones que aborden las fiestas de carnaval de las comunidades de los estudiantes y su vinculación con los demás carnavales del país.', 'es_correcta' => true],
                    ['contenido' => 'Diseñar sesiones que aborden la fiesta de carnaval de la localidad de los estudiantes y su nivel de importancia en relación con otras fiestas de carnaval del país.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_03_72',
                'ano' => 2018,
                'enunciado' => 'Un docente desea promover la participación de los estudiantes en la construcción de normas que favorezcan la convivencia en el aula. ¿Cuál de las siguientes acciones es más pertinente para este propósito?',
                'opciones' => [
                    ['contenido' => 'El docente pide a representantes del aula que revisen las normas de convivencia utilizadas el año anterior. Luego, les solicita que planteen alternativas de mejora a estas normas. Por último, les indica que incorporen sus propuestas a las normas de convivencia del aula.', 'es_correcta' => false],
                    ['contenido' => 'El docente pregunta a los estudiantes en qué aspectos creen que la convivencia en el aula ha mejorado y en cuáles no. Luego, les pide que planteen metas que les gustaría lograr en su convivencia como grupo. Finalmente, les solicita que propongan normas que ayuden al cumplimiento de esas metas.', 'es_correcta' => true],
                    ['contenido' => 'El docente evalúa, junto con el resto del equipo de docentes, el estado actual de la convivencia entre los estudiantes. Luego, pide a los estudiantes que determinen qué aspectos de la convivencia en el aula requieren ser mejorados. Sobre esta base, el docente elabora las nuevas normas de convivencia.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_09_43',
                'ano' => 2018,
                'enunciado' => 'Raúl, un estudiante que presenta ceguera, se ha integrado al grupo de primer grado. A pesar de que se realizó un proceso inicial de sensibilización en el grado, los docentes han notado que los estudiantes evitan incorporar a Raúl en sus actividades. Incluso, un docente ha escuchado a un estudiante decir: "No hagamos grupo con Raúl. Como no ve, pienso que no podrá hacer bien las tareas".<br><br>Ante esta situación, los docentes buscan que los estudiantes cuestionen estereotipos en torno a las personas con ceguera. ¿Cuál de las siguientes actividades es pertinente para este propósito?',
                'opciones' => [
                    ['contenido' => 'Pedir a los estudiantes que, con los ojos vendados, realicen diversas actividades que son cotidianas en la IE como desplazarse en el aula, jugar en el patio, trabajar en equipo, entre otras. Luego, solicitarles que, individualmente, describan cómo se sintieron durante esta experiencia.', 'es_correcta' => false],
                    ['contenido' => 'Solicitar a los estudiantes que, a partir de la observación del espacio público, identifiquen las condiciones que tienen que enfrentar las personas con ceguera para movilizarse en la localidad. Luego, pedirles que redacten una propuesta que favorezca su desplazamiento con mejores condiciones.', 'es_correcta' => false],
                    ['contenido' => 'Mostrar a los estudiantes resúmenes de biografías de personas que presentan ceguera y que han contribuido en el campo de la ciencia, del arte, entre otros. Luego, orientarlos en el análisis de las características del entorno que influyeron positiva o negativamente para el desarrollo de estas personas.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_44',
                'ano' => 2018,
                'enunciado' => 'El propósito de un docente es recoger saberes previos acerca del perfil del consumidor. ¿Cuál de las siguientes acciones pedagógicas es pertinente para el logro de este propósito?',
                'opciones' => [
                    ['contenido' => 'Organizar a los estudiantes en grupos y entregar a cada grupo una cartilla con preguntas y respuestas sobre el perfil del consumidor y sus criterios. Luego, solicitar que complementen dichas respuestas con información recopilada de libros o internet.', 'es_correcta' => false],
                    ['contenido' => 'Pedir que lean una hoja de trabajo con la definición de perfil del consumidor y los criterios para determinar dicho perfil. Luego, solicitar que en grupos sistematicen la información presentada en un organizador visual para exponerlo a la clase.', 'es_correcta' => false],
                    ['contenido' => 'Solicitar que expresen, con sus propias palabras, la idea que tengan de perfil del consumidor y cómo creen que se define dicho perfil. Luego, pedir que compartan sus explicaciones personales.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_45',
                'ano' => 2018,
                'enunciado' => 'Una docente pregunta a los estudiantes: "¿Cómo se define la propuesta de valor?". En ese contexto, un grupo de estudiantes afirma: "Para definir la propuesta de valor, debemos considerar aquello que somos capaces de elaborar".<br><br>¿Cuál de las siguientes preguntas favorece la generación del conflicto cognitivo en estos estudiantes?',
                'opciones' => [
                    ['contenido' => '¿Qué sucedería si muy poca gente necesita el producto que ustedes pueden elaborar?', 'es_correcta' => true],
                    ['contenido' => '¿Cuentan con los equipos o máquinas para elaborar su producto?', 'es_correcta' => false],
                    ['contenido' => '¿Cuál es el producto que pueden elaborar?', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_46',
                'ano' => 2018,
                'enunciado' => 'Un docente se encuentra planificando una actividad práctica en la que los estudiantes deben operar una máquina que utilizarán por primera vez.<br><br>¿Cuál de las siguientes acciones pedagógicas es pertinente para que los estudiantes aprendan a operar la máquina?',
                'opciones' => [
                    ['contenido' => 'Pedir que, en grupos, enciendan la máquina y manipulen cada una de sus partes principales de manera libre. Luego, solicitar que realicen un dibujo en el que indiquen el nombre de las partes principales. Finalmente, promover que, por turnos, la operen individualmente.', 'es_correcta' => false],
                    ['contenido' => 'Entregar una ficha técnica de las partes de la máquina y pedir que, en grupos, revisen la ficha. Luego, solicitar que describan, con sus propias palabras, las partes que se utilizan para realizar tareas sencillas. Finalmente, promover que, por turnos, la operen individualmente.', 'es_correcta' => false],
                    ['contenido' => 'Explicar las medidas de seguridad e higiene que se deben poner en práctica al operar la máquina. Luego, realizar la demostración de su operación indicando los riesgos que implica su uso. Finalmente, promover que, por turnos, la operen individualmente.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_47',
                'ano' => 2018,
                'enunciado' => 'Una docente tiene como propósito que sus estudiantes desarrollen capacidades requeridas para elaborar un bien. Para ello, ha decidido utilizar el método de proyectos.<br><br>Considerando este método, ¿cuál de las siguientes acciones pedagógicas es pertinente para iniciar el proyecto?',
                'opciones' => [
                    ['contenido' => 'Presentar la muestra del bien que se va a elaborar, explicar los aspectos teóricos y prácticos relacionados con su producción. Luego, pedir que indaguen con sus vecinos sobre la aceptación y demanda del mismo.', 'es_correcta' => false],
                    ['contenido' => 'Solicitar que indaguen acerca de los procesos que involucran la producción de un bien. Luego, pedir que identifiquen las posibles dificultades que se podrían presentar al ejecutar los procesos. Después, plantear preguntas para que encuentren diversas soluciones a las dificultades.', 'es_correcta' => false],
                    ['contenido' => 'Plantear un contexto que permita identificar diversos problemas que los estudiantes se interesen en solucionar. Luego, formular preguntas que ayuden a delinear un determinado problema a solucionar. Después, pedir que propongan una secuencia de acciones que permitirían dar solución al problema identificado.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_48',
                'ano' => 2018,
                'enunciado' => 'Un docente tiene como propósito evaluar la capacidad "Justificar el uso de un tipo de canal de distribución para su propuesta de valor".<br><br>¿Cuál de los siguientes indicadores es pertinente para evaluar dicha capacidad?',
                'opciones' => [
                    ['contenido' => 'Analiza semejanzas y diferencias entre los tipos de canales de distribución.', 'es_correcta' => false],
                    ['contenido' => 'Expresa razones sobre la conveniencia de utilizar un tipo de canal de distribución para su propuesta de valor.', 'es_correcta' => true],
                    ['contenido' => 'Relaciona un tipo de canal de distribución con la forma como se transfiere la propiedad de su propuesta de valor.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_49',
                'ano' => 2018,
                'enunciado' => '¿Cuál es el paso inmediatamente anterior a la ejecución del proyecto productivo?',
                'opciones' => [
                    ['contenido' => 'La evaluación del proyecto.', 'es_correcta' => false],
                    ['contenido' => 'La determinación de la idea.', 'es_correcta' => false],
                    ['contenido' => 'La planificación del proyecto.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_50',
                'ano' => 2018,
                'enunciado' => 'Se va a lanzar un producto al mercado y se sabe lo siguiente:<br>• El mercado es grande y no conoce el producto.<br>• La mayoría de compradores es sensible al precio.<br>• La competencia potencial es intensa.<br>• Los costos de fabricación bajan cuando aumenta la escala de fabricación.<br><br>Frente a esta situación, ¿cuál de las siguientes estrategias comerciales es la más apropiada?',
                'opciones' => [
                    ['contenido' => 'Precio bajo del producto y bajo gasto en promoción.', 'es_correcta' => false],
                    ['contenido' => 'Precio bajo del producto y alto gasto en promoción.', 'es_correcta' => true],
                    ['contenido' => 'Precio alto del producto y alto gasto en promoción.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_51',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas corresponde a una de las características de la técnica PNI (positivo, negativo e interesante)?',
                'opciones' => [
                    ['contenido' => 'Permite analizar las situaciones desde diferentes perspectivas.', 'es_correcta' => true],
                    ['contenido' => 'Permite obtener una gran variedad de ideas en poco tiempo.', 'es_correcta' => false],
                    ['contenido' => 'Permite seleccionar los atributos que se pueden mejorar.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_52',
                'ano' => 2018,
                'enunciado' => 'Un grupo de estudiantes está ejecutando el piloto de su modelo de negocio que consiste en proyectar películas al aire libre los sábados por la noche. Ellos han identificado un problema originado por la interferencia del ruido externo que no permite a los asistentes disfrutar de la proyección. Con el propósito de encontrar una solución, el grupo ha decidido aplicar la técnica SCAMPER.<br><br>Uno de los estudiantes ha propuesto lo siguiente: "Para que los asistentes disfruten de la proyección de la película y siga siendo una actividad al aire libre, incluyamos en el precio de la entrada el alquiler de auriculares".<br><br>¿A cuál de las siguientes acciones de la técnica SCAMPER corresponde la respuesta del estudiante?',
                'opciones' => [
                    ['contenido' => 'A adaptar (A).', 'es_correcta' => false],
                    ['contenido' => 'A modificar (M).', 'es_correcta' => true],
                    ['contenido' => 'A reordenar (R).', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_53',
                'ano' => 2018,
                'enunciado' => 'Considerando el análisis FODA de una empresa, ¿cuál de las siguientes alternativas corresponde a una debilidad?',
                'opciones' => [
                    ['contenido' => 'Aumento del precio de insumos.', 'es_correcta' => false],
                    ['contenido' => 'Mejora de la calidad en forma esporádica.', 'es_correcta' => true],
                    ['contenido' => 'Alta tasa de interés anual de los créditos ofertados en el entorno de la empresa.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_54',
                'ano' => 2018,
                'enunciado' => 'Considerando el análisis FODA de una empresa de alimentos, ¿cuál de las siguientes alternativas corresponde a una amenaza?',
                'opciones' => [
                    ['contenido' => 'Gran cantidad de competidores en este rubro.', 'es_correcta' => true],
                    ['contenido' => 'Cambio de la presentación actual de la marca por una más innovadora.', 'es_correcta' => false],
                    ['contenido' => 'Dificultad de la empresa para penetrar en el mercado por la gran cantidad de competidores.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_55',
                'ano' => 2018,
                'enunciado' => 'Según las normas ISO, con respecto a los colores utilizados en las señales de seguridad, ¿cuál de las siguientes afirmaciones es correcta?',
                'opciones' => [
                    ['contenido' => 'El color amarillo o amarillo anaranjado se utiliza para las señales de prohibición.', 'es_correcta' => false],
                    ['contenido' => 'El color rojo se utiliza para las señales de puestos de socorro.', 'es_correcta' => false],
                    ['contenido' => 'El color verde se utiliza para las señales de primeros auxilios.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_56',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas corresponde a la definición de un modelo de negocios CANVAS?',
                'opciones' => [
                    ['contenido' => 'Es una herramienta que describe el valor que la empresa crea, ofrece y comercializa a sus clientes.', 'es_correcta' => true],
                    ['contenido' => 'Es una herramienta que fortalece las habilidades del emprendedor para innovar en un bien o un servicio.', 'es_correcta' => false],
                    ['contenido' => 'Es una herramienta que permite identificar el conocimiento técnico necesario para elaborar un bien o servicio.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_57',
                'ano' => 2018,
                'enunciado' => 'El propósito de un docente es que los estudiantes determinen la fuente de ingresos en su modelo de negocio. ¿Cuál de las siguientes preguntas es pertinente para el logro de este propósito?',
                'opciones' => [
                    ['contenido' => '¿Cuáles son las características de los potenciales clientes? ¿Cuáles son sus principales necesidades?', 'es_correcta' => false],
                    ['contenido' => '¿Qué monto están dispuestos a pagar los clientes por el producto? ¿Cómo prefieren pagar los clientes?', 'es_correcta' => true],
                    ['contenido' => '¿Cuáles son los costos relevantes dentro del modelo? ¿Cuáles son los recursos, alianzas y actividades más costosas?', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_58',
                'ano' => 2018,
                'enunciado' => 'El modelo de negocios CANVAS puede ser descrito a través de nueve módulos, los que cubren las cuatro áreas principales de un negocio: clientes, oferta, infraestructura y viabilidad financiera.<br><br>En el área vinculada a los clientes se encuentra el módulo "Relaciones con los clientes" y este hace referencia a lo siguiente:',
                'opciones' => [
                    ['contenido' => 'los diferentes grupos de clientes a los que se dirige una empresa.', 'es_correcta' => false],
                    ['contenido' => 'los tipos de vínculos que una empresa establece con sus clientes.', 'es_correcta' => true],
                    ['contenido' => 'un conjunto de productos o servicios que satisface los requerimientos del cliente.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_59',
                'ano' => 2018,
                'enunciado' => 'A continuación, se presenta la discusión que se ha generado en un grupo de estudiantes como producto de una actividad propuesta por el docente.<br><br>María: "Creo que debemos averiguar si han variado los precios de la competencia y asignar un precio mucho más bajo a nuestro producto para que pueda captar clientes nuevos y quitarle clientes a la competencia".<br><br>Teresa: "Como nuestra empresa es pequeña, coincido con averiguar si han variado los precios de la competencia, pero creo que debemos asignar a nuestro producto un precio idéntico o parecido al de ellos, pues esto nos asegura un ingreso al mercado que pase desapercibido para la competencia y nos permite permanecer en él".<br><br>Luis: "Yo creo que, como nuestra producción es pequeña, debemos asignarle un precio un poco más alto que el de productos similares, para que el cliente perciba que nuestro producto es de mejor calidad que el de la competencia".<br><br>A partir de los comentarios realizados, ¿cuál de las siguientes capacidades están desarrollando los estudiantes?',
                'opciones' => [
                    ['contenido' => 'Calcular el precio que se asignará a su producto.', 'es_correcta' => false],
                    ['contenido' => 'Comparar el precio de su producto con el de la competencia.', 'es_correcta' => false],
                    ['contenido' => 'Proponer estrategias que permitan fijar el precio de su producto.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_60',
                'ano' => 2018,
                'enunciado' => 'Una docente se plantea como propósito evaluar la capacidad de sus estudiantes para formular soluciones viables a un problema. Para ello, les propone lo siguiente:<br><br>Una persona quiere remodelar el baño de su casa para reducir el consumo de agua potable. El inodoro que tiene utiliza aproximadamente 13 L de agua potable cada vez que se usa para eliminar las heces o la orina.<br><br>La remodelación debe cumplir con las siguientes condiciones:<br>• Reducir a menos de la mitad la cantidad de agua potable que se utiliza para dicho fin.<br>• El tanque del inodoro debe contener la cantidad de agua indicada en la condición anterior y estar disponible para que se pueda utilizar en cualquier momento.<br>• Evitar que haya malos olores después de la expulsión de desechos.<br><br>¿Qué solución le plantearías a esta persona?<br><br>Para evaluar las respuestas de los estudiantes, la docente ha elaborado una rúbrica. Ahora, la docente está interesada en plantear la descripción del nivel "Destacado". ¿Cuál de las siguientes descripciones es la que corresponde al nivel "Destacado"?',
                'opciones' => [
                    ['contenido' => 'La solución considera las condiciones planteadas en el problema y es viable. Toma en cuenta más de tres ideas o soluciones que hayan servido en entornos similares.', 'es_correcta' => false],
                    ['contenido' => 'La solución considera las condiciones planteadas en el problema y es viable. Toma en cuenta ideas o soluciones que hayan servido en entornos similares. Además, elabora un esquema detallado acerca del funcionamiento del prototipo.', 'es_correcta' => false],
                    ['contenido' => 'La solución considera las condiciones planteadas en el problema y es viable. Toma en cuenta ideas o soluciones que hayan servido en entornos diferentes y las adapta al suyo propio.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_61',
                'ano' => 2018,
                'enunciado' => 'Al revisar las respuestas de los estudiantes al problema planteado, encuentra lo siguiente:<br><br><strong>Solución al problema:</strong><br>Se instala un sistema de tuberías desde la ducha y el lavadero de manos, hasta el tanque del inodoro y no se requiere tanque adicional. Las tuberías de PVC se instalan sobre la pared sin tener que picarla. Por lo tanto, cada vez que se use el lavamanos o la ducha, esta agua será reutilizada para llenar el tanque del inodoro.<br><br>Considerando la rúbrica anterior, ¿cuál es el nivel de logro alcanzado por el estudiante?',
                'opciones' => [
                    ['contenido' => 'En inicio.', 'es_correcta' => true],
                    ['contenido' => 'En proceso.', 'es_correcta' => false],
                    ['contenido' => 'Logrado.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_62',
                'ano' => 2018,
                'enunciado' => 'Un docente está desarrollando una actividad práctica cuyo propósito es que sus estudiantes elaboren una malla pert para su proyecto. ¿Cuál de las siguientes secuencias de acciones es pertinente para dicho propósito?',
                'opciones' => [
                    ['contenido' => '1. Pedir que, en una tabla, ordenen las actividades de menor a mayor complejidad.<br>2. Pedir que elaboren un esbozo del grafo.<br>3. Pedir que numeren cada uno de los nudos y ubiquen las tareas en el grafo.<br>4. Pedir que estimen el tiempo de duración de las actividades más complejas.', 'es_correcta' => false],
                    ['contenido' => '1. Pedir que identifiquen las actividades que son convergentes, divergentes o lineales.<br>2. Pedir que busquen una malla pert en internet que les sirva de base.<br>3. Pedir que adapten el grafo a su necesidad considerando la secuencia de actividades.<br>4. Pedir que estimen el tiempo que demora ejecutar todas las actividades.', 'es_correcta' => false],
                    ['contenido' => '1. Pedir que elaboren una lista de actividades.<br>2. Pedir que en una tabla ordenen las actividades considerando las que preceden a otras.<br>3. Pedir que dibujen el grafo considerando la secuencia de la tabla.<br>4. Pedir que estimen el tiempo mínimo y máximo que demanda cada actividad.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_63',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes alternativas corresponde a la definición de balance?',
                'opciones' => [
                    ['contenido' => 'Es un estado financiero que da cuenta de todos los ingresos y gastos que ha experimentado una empresa de inicio a fin en un periodo.', 'es_correcta' => false],
                    ['contenido' => 'Es un estado financiero que da cuenta de los bienes, derechos y obligaciones de una empresa en una fecha determinada.', 'es_correcta' => true],
                    ['contenido' => 'Es un estado financiero que da cuenta de todas las variaciones de efectivo que se han realizado en una empresa.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_64',
                'ano' => 2018,
                'enunciado' => 'La puerta que corresponde a la salida de emergencia de un taller de EPT debe ser señalizada. ¿Qué tipo de señal de seguridad se debe utilizar?',
                'opciones' => [
                    ['contenido' => 'De advertencia.', 'es_correcta' => false],
                    ['contenido' => 'De salvamento.', 'es_correcta' => true],
                    ['contenido' => 'De obligación.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_65',
                'ano' => 2018,
                'enunciado' => 'Con respecto a las técnicas de mantenimiento de equipos e instrumentos, ¿cuál de las siguientes tareas es de mayor demanda cognitiva?',
                'opciones' => [
                    ['contenido' => 'Planificar el proceso de mantenimiento preventivo de equipos e instrumentos.', 'es_correcta' => true],
                    ['contenido' => 'Calcular el gasto realizado en la adquisición de los insumos o materiales usados en el mantenimiento de equipos e instrumentos.', 'es_correcta' => false],
                    ['contenido' => 'Extraer información de una tabla de frecuencia de las principales fallas en equipos e instrumentos, en un periodo, y ordenarlos según su frecuencia.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_66',
                'ano' => 2018,
                'enunciado' => 'Una docente presenta a los estudiantes el siguiente Diagrama de Operaciones del Proceso (DOP). Luego, les pregunta por el significado de cada actividad. Al llegar a una actividad, uno de los estudiantes responde: "Esa actividad se debe hacer sin demora porque tiene una raya atravesada".<br><br>¿Cuál es el error que se evidencia en la respuesta del estudiante?',
                'opciones' => [
                    ['contenido' => 'Ha aplicado la lectura de los símbolos de prohibición para interpretar el símbolo.', 'es_correcta' => false],
                    ['contenido' => 'Ha asignado un significado distinto a la raya que atraviesa el símbolo.', 'es_correcta' => true],
                    ['contenido' => 'Ha confundido el símbolo con el símbolo de inspección.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_67',
                'ano' => 2018,
                'enunciado' => 'Un docente presenta a los estudiantes el siguiente diagrama de Gantt. Luego, el docente plantea preguntas con el propósito de que interpreten este diagrama. Uno de los estudiantes afirma: "Hay dos tareas que deben hacerse juntas hasta la semana 7: Generar soluciones y Buscar materiales".<br><br>¿Cuál es el error que se evidencia en la afirmación del estudiante?',
                'opciones' => [
                    ['contenido' => 'Considerar que ambas actividades son complementarias.', 'es_correcta' => false],
                    ['contenido' => 'Considerar que ambas actividades se realizarán de forma simultánea.', 'es_correcta' => true],
                    ['contenido' => 'Considerar que ambas actividades presentan características similares.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_68',
                'ano' => 2018,
                'enunciado' => 'Durante el proceso de producción de un bien, se genera mucho polvo, por lo que cada estudiante debe usar una máscara. Uno de ellos se la saca y manifiesta: "Me molesta esta máscara y no me deja realizar bien las tareas encomendadas. Además, el polvo no me hace estornudar".<br><br>¿Cuál de las siguientes acciones pedagógicas es pertinente para favorecer la reflexión del estudiante sobre la importancia de practicar las normas de seguridad para su bienestar?',
                'opciones' => [
                    ['contenido' => 'Preguntar: "¿Cuál es la razón por la qué no deseas utilizar la máscara?". Luego, pedir amablemente al estudiante que se coloque la máscara para que esté protegido y no se enferme.', 'es_correcta' => false],
                    ['contenido' => 'Solicitar que mencionen las normas de seguridad del taller y preguntar: "¿Por qué creen que a veces no se cumplen las normas?". Luego, pedir que cumpla con las normas de seguridad y señalar las consecuencias de no cumplir con estas.', 'es_correcta' => false],
                    ['contenido' => 'Pedir que identifique las partes internas de su cuerpo que recibirán el polvo que inhala cuando no utiliza la máscara. Luego, preguntar: "¿De qué manera se pueden afectar estas partes internas? ¿El único objetivo de usar la máscara será evitar que estornudes?".', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'AA18_17_69',
                'ano' => 2018,
                'enunciado' => 'Un docente observa que casi todos los grupos de estudiantes han amontonado los restos de sus proyectos en un rincón del taller, a pesar de que cuentan con normas de higiene.<br><br>¿Cuál de las siguientes acciones es pertinente que realice el docente para favorecer en los estudiantes la reflexión sobre la práctica de las normas de higiene?',
                'opciones' => [
                    ['contenido' => 'Dar un paseo con los estudiantes por el lugar donde se amontonaron los restos de sus proyectos. Luego, pedir que elaboren afiches que contengan frases motivadoras que promuevan la higiene del taller.', 'es_correcta' => false],
                    ['contenido' => 'Preguntar: "¿Por qué creen que no se están respetando las normas de higiene? ¿De qué manera podría perjudicarnos el amontonamiento de los restos de sus proyectos?". Luego, pedir que cada grupo proponga posibles soluciones.', 'es_correcta' => true],
                    ['contenido' => 'Plantear un debate centrado en las siguientes preguntas: "¿Quiénes fueron los responsables del amontonamiento de los restos de sus proyectos en el taller? ¿Qué acción se debe realizar para que esto no vuelva a suceder?". Luego, pedir que cumplan las acciones propuestas.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'AA18_17_70',
                'ano' => 2018,
                'enunciado' => '¿Cuál de las siguientes fuentes de información para la búsqueda de empleo en internet es poco confiable?',
                'opciones' => [
                    ['contenido' => 'Sitios web de centros de empleo del sector trabajo y promoción del empleo.', 'es_correcta' => false],
                    ['contenido' => 'Sitios web de bolsas de trabajo en centros de formación.', 'es_correcta' => false],
                    ['contenido' => 'Sitios web de redes sociales o de anuncios diversos.', 'es_correcta' => true],
                ]
            ],

            // Preguntas del examen 2023 (A31-EBRS-11)
            [
                'codigo' => 'A31_2023_01',
                'ano' => 2023,
                'enunciado' => 'Fernanda es una estudiante que presenta discapacidad física y se traslada en silla de ruedas. Ella se va a incorporar la siguiente semana a un aula de una institución educativa. Por ello, el docente del aula realiza una asamblea con los estudiantes con el propósito de sensibilizarlos sobre la condición que presenta Fernanda. En este contexto, tres estudiantes comparten sus comentarios sobre las formas en que podrían ayudar a Fernanda a desplazarse en el colegio.<br><br>¿Cuál de los siguientes comentarios de los estudiantes está alineado al enfoque inclusivo del Currículo Nacional de la Educación Básica?',
                'opciones' => [
                    ['contenido' => '"Para movilizar a Fernanda, es necesario que la llevemos en su silla de ruedas a todos los lugares a donde vayamos. De esta manera, la ayudaremos a desplazarse por todo el colegio y estará siempre acompañada".', 'es_correcta' => false],
                    ['contenido' => '"Si deseamos ayudar a Fernanda a movilizarse en el colegio, primero debemos preguntarle en qué casos requiere nuestro apoyo. Yo pienso que ella nos podría orientar sobre cuál es la mejor forma en que podemos ayudarla".', 'es_correcta' => true],
                    ['contenido' => '"Considero que siempre debemos estar pendientes de Fernanda para poder ayudarla cuando quiera movilizarse. Propongo que organicemos turnos entre nosotros para cuidarla y así evitar que tenga algún accidente en el colegio".', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'A31_2023_02',
                'ano' => 2023,
                'enunciado' => 'En el marco de un proyecto denominado "Yo cuido mi barrio", los estudiantes de una institución educativa han identificado diversos problemas que afectan los espacios públicos de la localidad. Ellos comentan que uno de estos problemas es no poder utilizar la losa deportiva del barrio, debido a que se encuentra deteriorada.<br><br>En este contexto, la docente tiene como propósito que los estudiantes aborden este problema desde el enfoque de derechos del Currículo Nacional de la Educación Básica. ¿Cuál de las siguientes acciones pedagógicas es más pertinente para ello?',
                'opciones' => [
                    ['contenido' => 'Solicitar a los estudiantes que recojan las quejas de los vecinos de la localidad sobre el estado de la losa deportiva. Luego, pedir que organicen la información recabada y, considerando esto, que elaboren una solicitud dirigida a la municipalidad del distrito, con la finalidad de que se halle una solución que atienda las quejas de los vecinos.', 'es_correcta' => false],
                    ['contenido' => 'Realizar una plenaria con los estudiantes y dialogar sobre las mejoras que requiere la losa deportiva para que los vecinos puedan usarla. Luego, compartir acciones de participación realizadas en distintas localidades para resolver un problema similar y, sobre esta base, pedir que seleccionen la que sea más factible de replicar en su localidad.', 'es_correcta' => false],
                    ['contenido' => 'Conversar con los estudiantes sobre las limitaciones que produce no poder usar la losa deportiva en sus vidas y en las de los vecinos. Luego, solicitar que expliquen si consideran necesario actuar frente a este problema y, a partir de ello, pedir que planteen propuestas para mejorar el estado en el que se encuentra la losa.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'A31_2023_03',
                'ano' => 2023,
                'enunciado' => 'Una docente planifica desarrollar una actividad en la que los estudiantes formulan, mediante la técnica de lluvia de ideas, alternativas de solución creativas e innovadoras a un problema identificado en las personas.<br><br>Entre las siguientes capacidades de la competencia Gestiona proyectos de emprendimiento económico o social, ¿a cuál favorecerá principalmente el desarrollo de la actividad?',
                'opciones' => [
                    ['contenido' => 'Trabaja cooperativamente para lograr objetivos y metas.', 'es_correcta' => false],
                    ['contenido' => 'Evalúa los resultados del proyecto de emprendimiento.', 'es_correcta' => false],
                    ['contenido' => 'Crea propuestas de valor.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'A31_2023_04',
                'ano' => 2023,
                'enunciado' => 'Una docente tiene como propósito que los estudiantes reflexionen acerca del significado de fidelización de clientes. Para ello, les pide que comenten acerca de los negocios similares que hay en su barrio y cuál de ellos es el más frecuentado por sus familiares o amistades.<br><br>Néstor, un estudiante, relata la siguiente situación: "En mi barrio, hay dos librerías: \'Más que útiles\' y \'Papelería Sumac\'. Y aunque mis padres han visitado la librería \'Papelería Sumac\', ellos prefieren la librería \'Más que útiles\' por la calidad del servicio y los descuentos que les ofrecen".<br><br>Dada la situación presentada por Néstor, ¿cuál de las siguientes preguntas es más adecuada para promover la reflexión de los estudiantes?',
                'opciones' => [
                    ['contenido' => '¿Cuántas estrategias de fidelización de clientes conocen?', 'es_correcta' => false],
                    ['contenido' => '¿Qué tendría que hacer la librería \'Papelería Sumac\' para retener a sus clientes?', 'es_correcta' => true],
                    ['contenido' => '¿Consideran que el nombre \'Más que útiles\' influyó en la decisión de los padres de Néstor para convertirla en su librería preferida?', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'A31_2023_05',
                'ano' => 2023,
                'enunciado' => 'Un equipo de estudiantes desarrollará un proyecto de emprendimiento. Este consiste en la elaboración de abonos ecológicos a partir de los residuos del estiércol de gallinas y corontas de maíz. Para su implementación, el equipo utilizará diversos recursos TIC.<br><br>Como parte de la implementación del proyecto, el equipo propone la siguiente actividad: Buscaremos, en páginas web, experiencias nacionales e internacionales similares al proyecto. Esto nos permitirá analizarlas, sistematizar los principales hallazgos y hacer contrastes con nuestra propuesta.<br><br>En relación con la competencia transversal Se desenvuelve en entornos virtuales generados por las TIC, ¿cuál de las siguientes capacidades se promueve, principalmente, con la actividad propuesta?',
                'opciones' => [
                    ['contenido' => 'Crea objetos virtuales en diversos formatos.', 'es_correcta' => false],
                    ['contenido' => 'Gestiona información del entorno virtual.', 'es_correcta' => true],
                    ['contenido' => 'Personaliza entornos virtuales.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'A31_2023_06',
                'ano' => 2023,
                'enunciado' => 'Como parte del desarrollo del proyecto, el equipo ha logrado contactarse con el gerente de una microempresa que opera fuera del país y que está dispuesto a compartirle su experiencia. Por ello, el equipo organizará una sesión sincrónica para intercambiar información con los representantes de dicha microempresa.<br><br>Considerando que los estudiantes cuentan con conectividad a internet, equipos de cómputo y dispositivos para reproducción multimedia en su IE, ¿cuál de los siguientes recursos tecnológicos es más pertinente para desarrollar dicha sesión?',
                'opciones' => [
                    ['contenido' => 'Un chat.', 'es_correcta' => false],
                    ['contenido' => 'Un foro virtual.', 'es_correcta' => false],
                    ['contenido' => 'Una videoconferencia.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'A31_2023_07',
                'ano' => 2023,
                'enunciado' => 'Los estudiantes diseñan su modelo de negocio utilizando el Lienzo Lean Canvas. Como parte de esta actividad, plantean la siguiente hipótesis:<br>• Adquisición de estiércol y coronta de maíz<br>• Sueldo de personal<br>• Alquiler de local<br><br>¿A qué bloque del Lienzo Lean Canvas corresponde la hipótesis planteada por el equipo?',
                'opciones' => [
                    ['contenido' => 'A las métricas clave.', 'es_correcta' => false],
                    ['contenido' => 'Al segmento de clientes.', 'es_correcta' => false],
                    ['contenido' => 'A la estructura de costos.', 'es_correcta' => true],
                ]
            ],
            [
                'codigo' => 'A31_2023_08',
                'ano' => 2023,
                'enunciado' => 'Los estudiantes, organizados en equipos, se han propuesto desarrollar emprendimientos económicos que contribuyan con la reducción de impactos negativos en el ambiente.<br><br>Entre las siguientes propuestas, ¿cuál NO es un emprendimiento económico?',
                'opciones' => [
                    ['contenido' => 'Equipo 1: organizar y ejecutar campañas para promover el uso de motos eléctricas en lugar de vehículos que requieren combustibles fósiles.', 'es_correcta' => true],
                    ['contenido' => 'Equipo 2: diseñar y vender prendas de invierno creadas a partir del tratamiento de materiales reciclados.', 'es_correcta' => false],
                    ['contenido' => 'Equipo 3: elaborar y comercializar fertilizantes ecológicos provenientes de desechos de alimentos.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'A31_2023_09',
                'ano' => 2023,
                'enunciado' => 'Como parte de una actividad en equipo, el docente observa que algunos estudiantes están elaborando un dibujo de su prototipo; otros ya le están incorporando los detalles técnicos de su construcción. Además, cada equipo va tomando nota de los procedimientos que está ejecutando.<br><br>¿Cuál es el propósito de aprendizaje en la actividad realizada por los estudiantes?',
                'opciones' => [
                    ['contenido' => 'Diseñar el prototipo del producto que se pretende elaborar.', 'es_correcta' => true],
                    ['contenido' => 'Autoevaluar las habilidades utilizadas para dibujar el prototipo.', 'es_correcta' => false],
                    ['contenido' => 'Planificar el proceso técnico para la elaboración del prototipo de su producto.', 'es_correcta' => false],
                ]
            ],
            [
                'codigo' => 'A31_2023_10',
                'ano' => 2023,
                'enunciado' => 'Como parte de las actividades relacionadas con su proyecto de emprendimiento, un equipo de estudiantes indaga sobre las necesidades de potenciales clientes de un distrito con respecto al consumo de artesanías. Mercedes, una integrante del equipo, indica que la información que les interesa recoger se centrará en los gustos e intereses de los potenciales clientes.<br><br>¿Qué criterio de segmentación se corresponde con las variables planteadas por Mercedes?',
                'opciones' => [
                    ['contenido' => 'Psicográfica.', 'es_correcta' => true],
                    ['contenido' => 'Demográfica.', 'es_correcta' => false],
                    ['contenido' => 'Geográfica.', 'es_correcta' => false],
                ]
            ],
        ];

            foreach ($preguntas as $preguntaData) {
                $pregunta = Pregunta::firstOrCreate(
                    ['codigo' => $preguntaData['codigo']],
                    [
                        'idCategoria' => $categoria->idCategoria,
                        'idContexto' => null,
                        'enunciado' => $preguntaData['enunciado'],
                        'ano' => $preguntaData['ano']
                    ]
                );

                // Eliminar opciones existentes y crear nuevas
                OpcionesPregunta::where('idPregunta', $pregunta->idPregunta)->delete();

                foreach ($preguntaData['opciones'] as $opcionData) {
                    OpcionesPregunta::create([
                        'idPregunta' => $pregunta->idPregunta,
                        'contenido' => $opcionData['contenido'],
                        'es_correcta' => $opcionData['es_correcta']
                    ]);
                }
            }

            $this->command->info('✅ Se han creado ' . count($preguntas) . ' preguntas de EPT exitosamente.');
        });
    }
}
