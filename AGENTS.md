# Project Context & Navigation

- **Overview**: This repository contains a dual-engine system (SIGEHUFront for Web/Mobile and SIGEHUBack for Node.js services) using an offline-first approach with Firebird 5 database and zrok2 for remote connections.
- **Core System Rules (Extracted from docs/)**:
  * Integrated documentation and scope follow the rules in `docs/01_vision_alcance.md`.
  * Technical architecture and constraints are defined in `docs/02_arquitectura_restricciones.md` (These are part of the static context).

# Critical Constraints & Infrastructure

- **ABSOLUTE DIRECTORY RULES (DO NOT MODIFY)**:
  Under no circumstances should any agent or automated process read, create, modify, or write files within the following system folders:
  - `Release`
  - `Dependences`
  - `Installer`
  All development and planning tasks must be performed **exclusively** within active source code folders (`SIGEHUBack`, `SIGEHUFront`, etc.).

- **Protected Files (DO NOT MODIFY DIRECTLY)**:
  The following files contain auto-generated configuration or structural infrastructure. Any changes to their internal values must be performed via `.env` additions followed by running `build.bat`:
  - `build.bat` & `apply-env.js`
  - `Installer/setup.iss`
  - `SIGEHUFront/electron/main.js`
  - `SIGEHUBack/config.json`
  - `SIGEHUFront/src/environments/*.ts`

- **Dual Frontend (SIGEHUFront)**:
  One code base serves both Mobile (Ionic) and Web (Angular). 
  - Use Angular Guards to strictly separate "Worker" routes from "Admin" routes.
  - Connectivity logic handles `localhost` for Desktop and `zrok2` URLs for Mobile automatically based on the environment detection.

# Non-Negotiable Architectural & Security Rules
- **Firebird 5 Session Context**: Backend MUST set `RDB$GET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID')` before executing any DML operations so audit triggers function correctly.
- **Transactions**: Every operation modifying multiple tables MUST be wrapped in explicit SQL transactions (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`).
- **Security & Financial Isolation**: Endpoint middleware MUST return `403 Forbidden` for "Trabajador" role attempting to access financial, price, budget, or fiscal data.
- **File Storage**: DB stores ONLY relative paths (e.g. `/uploads/evidencias/...`), NEVER base64 strings.
- **State Machine & Double Validation**: Worker marks activity completed -> set to "Pendiente de validación" -> Owner validates in Web App -> Official state transition executed via `SP_CAMBIAR_ESTADO_OBRA`.
- **UI Irreversible Actions**: Soft-delete/deactivation of clients, state changes, or guarantee closures require an explicit confirmation modal.

# Development Workflow
- **Environment**: Updates are made in `.env`, then processed via `build.bat`.
- **Architecture**: The system follows a modular architecture; keep service, component, and route layers strictly separated within their respective domains (Customers, Works, etc.).
