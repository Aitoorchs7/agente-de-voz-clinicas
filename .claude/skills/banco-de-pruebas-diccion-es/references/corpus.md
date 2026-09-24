# Corpus de pruebas de dicción — español peninsular

Material para medir el reconocimiento de voz del agente telefónico. Todos los nombres son
**ficticios o de uso público**: no se usan nombres de pacientes ni de conocidos (`PLAN.md` §9).

Índice:

1. Apellidos peninsulares que se confunden entre sí
2. Apellidos de otras lenguas del Estado
3. Nombres compuestos y apellidos con partícula
4. Apellidos extranjeros frecuentes en clínicas españolas
5. Teléfonos
6. Horas
7. Fechas y días

---

## 1. Apellidos peninsulares que se confunden entre sí

Los pares son lo valioso: no basta con que transcriba «algo parecido», tiene que distinguirlos.

| Par / grupo | Por qué cuesta |
| --- | --- |
| Sánchez / Sáez / Sáenz | La consonante final se pierde en la compresión telefónica |
| Gómez / Gómez de la Serna | El apellido compuesto se corta |
| Hernández / Fernández | Una sola consonante de diferencia, ambas frecuentes |
| Herrero / Herrera | Solo cambia la vocal final; el género no ayuda al transcriber |
| Iglesias / Iglesia | Plural apenas audible |
| Villar / Billar | B y V son el mismo sonido en español |
| Bello / Vello | Igual |
| Casas / Cazas | Seseo y ceceo según la región de quien llama |
| Peña / Pena | La eñe se pierde con mala cobertura |
| Muñoz / Munos | Igual |
| Rodríguez / Rodrigues | La versión portuguesa es frecuente y cambia la grafía |
| Ortiz / Ortíz | Tilde: no afecta al audio, sí a la comparación de cadenas |
| Cuesta / Questa | Menos frecuente, buena para ver si el transcriber normaliza |
| Del Olmo / Delgado | Se confunden cuando se dicen deprisa |
| Escobar / Escolar | Una consonante |
| Bermúdez / Benítez | Ambas frecuentes, arranque parecido |

## 2. Apellidos de otras lenguas del Estado

Son pacientes españoles, así que esto no es un caso exótico: es una clínica en Barcelona, Vigo o
Bilbao.

**Catalanes:** Puigdemont, Pujol, Bosch, Vilanova, Ferrer i Guàrdia, Sabaté, Roig, Munné, Piqué,
Colomer, Deulofeu, Llull.

**Gallegos:** Xoán, Iago, Brais, Seoane, Castelao, Outeiriño, Feijóo, Rivadulla, Baamonde, Louzán.

**Vascos:** Etxeberria, Agirre, Zubizarreta, Goikoetxea, Illarramendi, Aizpurua, Errazkin, Oiartzabal.

Lo que se mira aquí no es solo el acierto, sino **si el bot lo intenta o se rinde**: un apellido
vasco mal transcrito y anotado en silencio es peor que uno que el bot pide deletrear.

## 3. Nombres compuestos y apellidos con partícula

El fallo típico es que el transcriber **parte el nombre** o **se come la partícula**.

**Compuestos:** María José, José Luis, Juan Carlos, María del Carmen, José María, Ana Belén,
Francisco Javier, María Teresa, Juan Antonio, María Ángeles.

Ojo con los que cambian de género aparente: **José María** (hombre) y **María José** (mujer) se
transcriben mal el uno por el otro y el bot puede acabar tratando de usted a quien no toca.

**Con partícula:** De la Torre, Del Río, De los Santos, De la Fuente, Van der Berg, Della Valle,
De Miguel, Del Pozo, De la Rosa.

**Diminutivos y formas habladas:** «Paco» por Francisco, «Pepe» por José, «Lola» por Dolores, «Curro»
por Francisco, «Chema» por José María, «Nacho» por Ignacio, «Charo» por Rosario.
Si el paciente dice «soy Paco Ruiz», ¿qué anota el bot? No hay respuesta correcta única, pero tiene
que ser **consistente** y no inventarse «Francisco» si no se lo han dicho.

## 4. Apellidos extranjeros frecuentes en clínicas españolas

En una clínica real son muchos, y el transcriber está configurado en español.

**Marroquíes y árabes:** El Amrani, Benyahia, Ouahbi, Chakir, Bouzid.
**Rumanos:** Popescu, Ionescu, Constantinescu, Dumitru.
**Chinos:** Zhang, Wang, Liu, Chen, Huang.
**Británicos e irlandeses:** Smith, O'Connor, Wright, Hughes.
**Alemanes:** Müller, Schneider, Bäcker.
**Latinoamericanos:** Quispe, Mamani, Huaman, Chuquimia.
**Ucranianos y rusos:** Shevchenko, Kovalenko, Petrov.

## 5. Teléfonos

El número español son nueve dígitos y se dice de muchas formas. Prueba las cinco:

| Forma | Ejemplo con 612 345 678 |
| --- | --- |
| De tres en tres | «seiscientos doce, trescientos cuarenta y cinco, seiscientos setenta y ocho» |
| De dos en dos | «seis, doce, treinta y cuatro, cincuenta y seis, setenta y ocho» |
| Dígito a dígito | «seis uno dos tres cuatro cinco seis siete ocho» |
| Mezclada | «seiscientos doce, tres cuatro cinco, seis siete ocho» |
| Con pausas y correcciones | «seis uno dos… perdón, seis uno tres…» |

Variantes que rompen cosas:
- **«cero» y «o»**: mucha gente dice «o» por cero.
- **Prefijo +34** dicho delante.
- **Números fijos que empiezan por 9**, que se confunden con el 6 al principio.
- **Corrección a mitad**: el bot tiene que quedarse con el número corregido, no con los dos pegados.

Lo importante aquí no es solo la transcripción: es que el bot **repita el número dígito a dígito
para confirmar** cuando el paciente da uno distinto del que llama (`PLAN.md` §5).

## 6. Horas

El bot tiene que **entenderlas** habladas y **decirlas** en palabras (nunca «10:30»).

**Formas habladas que tiene que entender:**
- «las diez y media», «las diez y cuarto», «las once menos cuarto», «las diez y veinte»
- «a las cuatro y pico», «sobre las cinco», «a eso de las seis»
- «a mediodía», «a primera hora», «a última hora», «después de comer», «a la hora de comer»
- «las diez de la mañana» / «las diez de la noche» — y **«las veintidós»**, que alguna gente usa
- «entre las cinco y las seis»
- «temprano», «tarde», «cuando abran», «antes de cerrar»

Las vagas («a primera hora», «después de comer») son las interesantes: el bot **no debe adivinar**
una hora concreta. Debe ofrecer opciones dentro de ese rango y dejar que el paciente elija.

## 7. Fechas y días

**Formas habladas:**
- «el jueves», «el jueves que viene», «este jueves», «el otro jueves»
- «pasado mañana», «mañana», «hoy mismo»
- «la semana que viene», «a finales de mes», «a principios de la semana que viene»
- «el veinticuatro», «el veinticuatro de octubre», «el 24»
- «el primer día que tenga», «lo antes posible», «cuando le venga bien»
- «después de Reyes», «antes de Semana Santa», «cuando pasen las fiestas»

**Los casos que hay que probar sí o sí:**
- **«el jueves» dicho un jueves.** ¿Hoy o dentro de siete días? El bot tiene que preguntar, no
  decidir.
- **«el jueves que viene» dicho un viernes.** Cambia según quién lo diga.
- **Una fecha en el pasado.** Si alguien pide «el veinticuatro» y ya pasó, el bot no puede agendarla:
  es el fallo que busca la prueba de la marca de tiempo (`PLAN.md` §5).
- **Cualquier fecha dicha entre las 23:00 y la 01:00**, que es donde el desfase UTC cambia el día.
  Ver la skill `prueba-marca-de-tiempo`.
