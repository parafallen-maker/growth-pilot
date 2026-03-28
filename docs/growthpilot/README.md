# GrowthPilot Documentation Index

Welcome to the reorganized GrowthPilot documentation. This directory is structured to separate concern and provide a clear hierarchy for development, operations, and product management.

## 📂 Directory Structure

### [core/](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/core/) (Product & Strategy)
- [system_architecture.md](core/system_architecture.md) — System architecture overview.
- [scope_and_principles.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/core/scope_and_principles.md) — Project scope and design principles.
- [prd.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/core/prd.md) — Product Requirements Document (Latest).
- [domain_model.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/core/domain_model.md) — Domain model and information architecture.
- [references.md](core/references.md) — Educational research references and design foundations.

### [eng/](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/eng/) (Technical & Development)
- [development_spec.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/eng/development_spec.md) — Technical and development specifications.
- [interface_decisions.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/eng/interface_decisions.md) — API conflict resolution and decisions.
- **[db/](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/eng/db/)**
  - [data_dictionary.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/eng/db/data_dictionary.md) — Data dictionary and field semantics.
  - [ddl_schema.sql](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/eng/db/ddl_schema.sql) — Database DDL (Schema baseline).
  - [seed_data.sql](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/eng/db/seed_data.sql) — System seed data.

### [ops/](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/ops/) (Operations & Migration)
- [migration_spec.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/ops/migration_spec.md) — Excel to DB migration specification.
- [wave4_uat_manual.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/ops/wave4_uat_manual.md) — Wave 4 UAT execution manual.
- [wave5_go_live_manual.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/ops/wave5_go_live_manual.md) — Wave 5 Go-live procedures.
- [wave5_env_matrix.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/ops/wave5_env_matrix.md) — Production environment variable matrix.
- [ops_manual.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/ops/ops_manual.md) — General operations and maintenance guide.
- [user_manual.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/ops/user_manual.md) — User manual for business roles.

### [api/](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/api/) (Contracts & Protocols)
- [openapi.yaml](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/api/openapi.yaml) — Machine-readable OpenAPI contract.

### [quality/](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/quality/) (QA & Acceptance)
- [wave2_acceptance_report.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/quality/wave2_acceptance_report.md) — Wave 2 acceptance report.
- [performance_manual.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/quality/performance_manual.md) — Performance benchmarking and monitoring.
- [release_observation_checklist.md](file:///Users/Ljc_1/Downloads/vibeCoding/growth-pilot/docs/growthpilot/quality/release_observation_checklist.md) — Release observation checklist.

### [templates/](templates/) (Reusable Templates)
- Active templates for migration, QA, and defect triage.
- `future/` — Templates for UAT, go-live, and post-release (not yet needed).

### [core/archive/](core/archive/) (Completed & Outdated)
- `execution_todos_wave0_wave1.md` — Completed Wave 0 + Wave 1 task records.
- `prd_v1_legacy.md` — Superseded PRD version.

---

## Active Documents

- **[execution_todos.md](execution_todos.md)** — Active tasks (Wave 2-5). Check this for current status.
- **[CHANGELOG.md](CHANGELOG.md)** — What changed and when.
- **[00_start_here.md](00_start_here.md)** — Entry point for new developers.
