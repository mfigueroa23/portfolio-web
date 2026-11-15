# Portfolio WEB
Web project of [marco.figueroa-sanchez.com](https://marco.figueroa-sanchez.com)
built with Angular, talking to the [portfolio backend](https://github.com/mfigueroa23/portfolio-api)
and integrated with CI/CD through GitHub Actions.

## Commands
- `pnpm run watch`: Starts the server in production mode.
- `pnpm run test`: Runs the unit and integration tests.

## Documentation rules
- The project has a knowledge base in JIRA and Confluence under the key `PRT`, and the user must review it before
  a resource is created in JIRA or Confluence.
- A request for new development must be turned into user stories (there can be more than 1) in JIRA
  following this format (`[]` must be lists):
  ```
  As a <role> I want <feature> so that <benefit>

  ## Acceptance criteria
  [] <acceptance criterion 1>
  [] <acceptance criterion N>
  ```
- A user story must set these ticket properties:
  - Priority
  - Label (e.g.: `web`, `api`, `panel`, etc.) - it can have more than 1, plus the system it belongs to
  - Start date and due date (estimated)
  - Story points (estimated) following the [Fibonacci](https://en.wikipedia.org/wiki/Fibonacci_sequence) method
- When asked to document in Confluence, use the templates available in the `PRT` space:
  - `How to`: Documentation of processes and procedures
  - `Troubleshooting`: Documentation of problems and solutions

## Development rules
- Code written in English
- Project architecture based on modules
- Simple code without complex logic; when needed, split it into small, reusable functions
- Do not add external dependencies without the developer's prior approval
- Do not build Docker images without the developer's prior approval
- A user story is split into tasks, and tasks must be small pieces of functional, verifiable code
- A task related to a ticket gets its own branch named `<type>/<JIRA-KEY-TICKET>-<description>`, e.g.: `feature/PRT-1234-add-new-endpoint`
- Before writing the code, write the tests for the small verifiable tasks, following TDD (Test Driven Development)
- When a small task is done, wait for the developer's approval before committing, in English, without co-authorship
  of any AI, following [conventional commits](https://www.conventionalcommits.org/):
  ```
  <type>[scope]: [<JIRA-KEY-TICKET>] <description>

  <General description of the changes>

  Modified files:
  - <path of the modified file>: <description of the change>
  ```
- When a pull request is requested, write it in English, without co-authorship of any AI, with this structure:
  ```
  <type>[scope]: [<JIRA-KEY-TICKET>] <description>

  <General description of the changes>

  Modified files:
  - <path of the modified file>: <description of the change>

  Tests performed:
  - <name of the test>: <description of the test performed>
  ```

## Versioning rules
- The project follows [semantic versioning](https://semver.org/) `MAJOR.MINOR.PATCH` and the source of truth
  is the `version` field of `package.json`; the Docker image is published with that version.
- The version is bumped when an epic or a task is finished, in a bump commit that also requires the developer's
  prior approval. The increment is set by the highest-impact commit type since the last version:
  - `MAJOR`: breaking changes (`feat!`, `fix!` or `BREAKING CHANGE`), for example a removed endpoint or
    a change in the API contract.
  - `MINOR`: new backward-compatible functionality (`feat`).
  - `PATCH`: fixes and changes without new functionality (`fix`, `perf`, `refactor`, `build`, `ci`, `chore`, etc.).
- The version is bumped with `pnpm version <major|minor|patch> --no-git-tag-version`, in its own commit separate
  from the code changes: `chore(release): [<JIRA-KEY-TICKET>] Bump version to vX.Y.Z`.
- Tags are created only on `main`, on the merge commit, with the format `vX.Y.Z` (same as `package.json`) and
  annotated: `git tag -a vX.Y.Z -m "vX.Y.Z"`. A published tag is never moved or reused.
- The tag and the GitHub release are created by hand, never from a workflow, only after the `Release` workflow
  succeeds and with the developer's prior approval, using
  `gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <file>`.
- Release notes are written in English, without co-authorship of any AI, with this structure:
  ```
  ## <Summary of the version>

  ### Features
  - <description> ([<JIRA-KEY-TICKET>])

  ### Fixes
  - <description> ([<JIRA-KEY-TICKET>])

  ### Other changes
  - <description> ([<JIRA-KEY-TICKET>])

  ### Database
  - <included migration and its impact, or "No migrations">

  ### Docker image
  - `<organization>/<image>:X.Y.Z` (`sha256:<digest>`)
  ```
- Version `1.0.0` is the project baseline: its tag is `v1.0.0` and its release summarizes the initial state.
