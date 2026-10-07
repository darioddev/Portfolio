# Portafolio personal

Portafolio web construido con **Astro**, desplegado en **GitHub Pages** mediante **GitHub Actions**.

🌐 **Web:** https://darioddev.github.io/

---

## Antes que nada

Este código ha sido **generado con Claude AI**. Todas las plantillas y bases han sido generadas por Claude.

No soy desarrollador frontend: me dedico al mundo **cloud e integraciones**. Pero con la inteligencia artificial y usando prompts básicos es posible generar cosas eficientes. Con la IA ya no pasamos a "picar código", pasamos a ser *viewers* de lo que necesitamos, **pero con control**: la IA tiene que tener **gobernanza**, **control** y ser **eficiente a nivel de costes**.

Aunque no sea frontend, he tenido en cuenta preguntas como las siguientes.

### ¿Qué ocurre si mañana quiero poner mi portafolio en inglés?

**Solución:** información centralizada en archivos `.properties` / `.yaml`.

La información no debería estar embebida en los HTML. Debería vivir en archivos de datos (`.yaml`, `.properties`) con el contenido que se imprime. Esto aporta **desacoplamiento**, **centralización** y **escalabilidad**.

Esta pregunta me la planteé para un portafolio, pero si habláramos de una web nueva con múltiples *slices*, no plantearlo así podría traer problemas si el negocio crece.

### ¿Por qué Astro?

Siempre me ha llamado la atención. En este caso no me baso en la tecnología sino en **gustos**, y no tengo miedo de afrontar nuevos retos. En un sistema real habría que revisar qué se adecúa mejor a las necesidades: **no se elige una tecnología o solución por elegirla**.

### Validación de esquemas

Trabajo continuamente con **contratos de esquemas** y para mí es de vital importancia validarlos. Como toda la información está centralizada, ¿qué ocurre si una IA toca el código y elimina algún dato que mi HTML espera imprimir? Lo seguro es que, si subo el cambio sin detectarlo, la página fallaría.

Aquí entran los **contratos y la validación de esquemas**: me aseguro de centralizar y validar la información esperada antes de que llegue a producción.

### Templates y datos

No soy arquitecto frontend, pero desde mi punto de vista los *templates* solo deberían **renderizar la información de entrada (props)** y no contener contenido estático.

Hay que ser puntuales: si a futuro se ve que no va a escalar y es meramente información estática, puede mantenerse embebida. Pero antes de tomar una decisión hay que analizar **impacto, riesgo y escalabilidad**. Mi rol y mi objetivo van hacia la **arquitectura de soluciones con conocimientos en IA y cloud**.

---

## Principios de diseño

| Principio | Aplicación en este proyecto |
|---|---|
| Separación de contenido y presentación | El contenido vive en archivos de datos, no en las plantillas |
| Contratos de datos | El contenido se valida contra un esquema antes del build |
| Internacionalización desde el inicio | Añadir un idioma = añadir un archivo de contenido |
| Calidad automatizada | Validación, lint, type check y build en cada PR |
| Mínimo privilegio | Permisos del pipeline reducidos al mínimo necesario |
| Gobernanza de la IA | Los cambios generados por IA pasan por los mismos controles que cualquier otro |

---

## Estructura del proyecto

> Ajusta esta sección a la estructura real del repositorio.

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml            # Pipeline CI/CD
├── public/                   # Recursos estáticos
├── src/
│   ├── components/           # Componentes: solo renderizan props
│   ├── content/ (o data/)    # Contenido centralizado (.yaml / .properties)
│   ├── layouts/
│   └── pages/
├── scripts/                  # Scripts de validación de contenido y traducciones
├── astro.config.mjs
├── package.json
└── README.md
```

---

## Requisitos

- Node.js **22** o superior
- npm

## Comandos

| Comando | Descripción |
|---|---|
| `npm ci` | Instala dependencias de forma reproducible |
| `npm run dev` | Servidor de desarrollo local |
| `npm run validate` | Valida contenido y traducciones contra el esquema |
| `npm run lint` | Análisis estático del código |
| `npm run check` | Comprobación de tipos (`astro check`) |
| `npm run build` | Genera el sitio estático en `dist/` |
| `npm run preview` | Previsualiza el build localmente |

---

## Gestión del contenido e idiomas

Todo el texto visible se define en archivos de contenido centralizados, nunca dentro de los componentes.

Para añadir un nuevo idioma (por ejemplo, inglés):

1. Crear el archivo de contenido del nuevo idioma con **las mismas claves** que el idioma base.
2. Ejecutar `npm run validate` para comprobar que no falta ninguna clave.
3. Registrar el idioma en la configuración de i18n de `astro.config.mjs`.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://darioddev.github.io',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
  },
});
```

## Validación de esquemas

`npm run validate` actúa como **contrato** entre los datos y las plantillas:

- Verifica que existen todas las claves que la web espera renderizar.
- Verifica que todos los idiomas tienen las mismas claves.
- Falla el pipeline si un cambio (humano o de IA) elimina o altera información requerida.

Así, un cambio que rompería la página se detecta **antes** de llegar a producción.

---

## CI/CD

El pipeline está definido en `.github/workflows/ci.yml` y usa GitHub Actions.

| Evento | Qué ocurre |
|---|---|
| Pull Request hacia `master` | Ejecuta `validate`, `lint`, `check` y `build`. **No despliega** |
| Push / merge a `master` | Ejecuta las mismas verificaciones y, si pasan, **despliega a GitHub Pages** |
| Lanzamiento manual (`workflow_dispatch`) | Ejecuta el pipeline completo bajo demanda |

Buenas prácticas aplicadas:

- `npm ci` y caché de dependencias para builds reproducibles y rápidos.
- Permisos mínimos (`contents: read`) y elevados solo en el job de despliegue.
- Se construye **una sola vez** y se publica exactamente ese artefacto.
- `concurrency` para cancelar ejecuciones obsoletas en PRs sin interrumpir despliegues en curso.
- `timeout-minutes` para evitar jobs colgados.

### Configuración necesaria en GitHub

1. **Settings → Pages → Source:** `GitHub Actions`.
2. **Settings → Branches:** proteger `master` exigiendo PR y que el check `Verify & Build` pase antes de hacer merge.

---

## Gobernanza del código generado por IA

Este proyecto asume que la IA escribe gran parte del código, por lo que los controles son parte del diseño:

- **Contratos de datos:** la validación de esquemas impide que cambios silenciosos rompan el contenido.
- **Verificación automática:** lint, tipos y build en cada PR.
- **Revisión humana:** nada llega a `master` sin PR y checks en verde.
- **Control de costes:** prompts concretos y cambios acotados; el pipeline evita ejecuciones innecesarias.

---

## Licencia

Indica aquí la licencia del proyecto (por ejemplo, MIT).