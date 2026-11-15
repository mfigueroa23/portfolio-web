# Portfolio WEB
Proyecto WEB de [marco.figueroa-sanchez.com](https://marco.figueroa-sanchez.com)
desarrollado con Angular y comunicacion con el [backend del portfolio](https://github.com/mfigueroa23/portfolio-api)
integrado con CI/CD con github actions.

## Comandos utilizados
- `pnpm run watch`: Inicia el servidor en modo producción.
- `pnpm run test`: Ejecuta las pruebas unitarias y de integración.

## Reglas de documentación
- Proyecto tiene base de conocimiento en JIRA y Confluence bajo la key `PRT` y se debe revisar por el usuario antes 
  de crear un recurso en JIRA o Confluence.
- Al solicitar un nuevo desarrollo este debe transformarse a historias de usuario (pueden ser mas de 1) en JIRA
  siguiendo el formato. (`[]` debe ser listas):
  ```
  Como <rol> quiero <funcionalidad> para <beneficio>

  ## Criterios de aceptación
  [] <criterio de aceptación 1>
  [] <criterio de aceptación N>
  ```
- Al crear una historia de usuario este debe contener en las propiedades del ticket:
  - Proridad
  - Etiqueta (ej.: `web`, `api`, `panel`, etc.) - puede tener mas de 1 y el sistema al que pertenece
  - fecha de inicio y fecha de entrega (estimada)
  - Puntos de historia (estimado) siguiendo la metodologia de [Fibonacci](https://es.wikipedia.org/wiki/Sucesi%C3%B3n_de_Fibonacci)
- Si se solicita documentar en confluece usa las plantillas disponibles en el espacio `PRT`:
  - `How to`: Documentación de procesos y procedimientos
  - `Troubleshooting`: Documentación de problemas y soluciones

## Reglas de desarrollo
- Codigo escrito en ingles
- Arquitectura del proyecto basado en modulos
- Codigo simple sin logica compleja, si es necesario se debe dividir en funciones pequeñas y reutilizables
- No agregar dependencias externas sin previa aprobacion del desarrollador
- No construir imagenes de docker sin previa aprobacion del desarrollador
- Se divide la historia de usuario en tareas y estas deben ser pequeñas piezas de codigo funcional y verificables
- Al realizar una tarea relacionada con un ticket debe crearse un branch siguiento: ´<tipo>/<JIRA-KEY-TICKET>-<descripcion>´ ej.: `feature/PRT-1234-add-new-endpoint`
- Antes de escribir el codigo deben crearse los tests para las pequeñas tareas verificables, siguiendo la metodologia de TDD (Test Driven Development)
- Al finlizar una pequeña tarea se debe esperar la aprovacion del desarrollador antes de hacer un comit en ingles sin co-autored de ninguna IA siguiendo
  [conventional commits](https://www.conventionalcommits.org/):
  ```
  <type>[scope]: [<JIRA-KEY-TICKET>] <description>

  <Descripcion general de los cambios realizados>

  Archivos modificados:
  - <ruta del archivo modificado>: <descripcion del cambio realizado>
  ```
- Cuando se solicite hacer un pull request se debe hacer en ingles sin co-autored de ninguna IA, se debe de seguir la siguiente estructura:
  ```
  <type>[scope]: [<JIRA-KEY-TICKET>] <description>

  <Descripcion general de los cambios realizados>

  Archivos modificados:
  - <ruta del archivo modificado>: <descripcion del cambio realizado>

  Pruebas realizadas:
  - <nombre de la prueba>: <descripcion de la prueba realizada>
  ```

## Reglas de versionado
- El proyecto sigue [versionado semántico](https://semver.org/lang/es/) `MAJOR.MINOR.PATCH` y la fuente de verdad
  es el campo `version` de `package.json`; la imagen de Docker se publica con esa versión.
- La versión se sube al terminar una épica o una tarea, con un commit de bump que también requiere la aprobación
  previa del desarrollador. El incremento se define por el tipo de commit de mayor impacto desde la última versión:
  - `MAJOR`: cambios incompatibles (`feat!`, `fix!` o `BREAKING CHANGE`), por ejemplo un endpoint eliminado o
    un cambio en el contrato de la API.
  - `MINOR`: funcionalidad nueva compatible (`feat`).
  - `PATCH`: correcciones y cambios sin funcionalidad nueva (`fix`, `perf`, `refactor`, `build`, `ci`, `chore`, etc.).
- La versión se sube con `pnpm version <major|minor|patch> --no-git-tag-version`, en un commit propio separado de
  los cambios de código: `chore(release): [<JIRA-KEY-TICKET>] Bump version to vX.Y.Z`.
- Los tags se crean solo en `main`, sobre el commit del merge, con el formato `vX.Y.Z` (igual a `package.json`) y
  anotados: `git tag -a vX.Y.Z -m "vX.Y.Z"`. Un tag publicado nunca se mueve ni se reutiliza.
- El tag y el release de GitHub se crean a mano, nunca desde un workflow, solo después de que el workflow `Release`
  termine con éxito y con aprobación previa del desarrollador, usando
  `gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <archivo>`.
- Las notas del release se escriben en ingles, sin co-autored de ninguna IA, siguiendo la estructura:
  ```
  ## <Resumen de la version>

  ### Features
  - <descripcion> ([<JIRA-KEY-TICKET>])

  ### Fixes
  - <descripcion> ([<JIRA-KEY-TICKET>])

  ### Other changes
  - <descripcion> ([<JIRA-KEY-TICKET>])

  ### Database
  - <migracion incluida y su impacto, o "No migrations">

  ### Docker image
  - `<organizacion>/<imagen>:X.Y.Z` (`sha256:<digest>`)
  ```
- La version `1.0.0` es la base del proyecto: su tag es `v1.0.0` y su release resume el estado inicial.
