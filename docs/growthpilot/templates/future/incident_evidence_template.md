# Incident Evidence Template

- release_id: `<release-id>`
- incident_id: `<INC-YYYYMMDD-001>`
- environment: `<prod/uat>`
- severity: `<P0/P1/P2/P3>`
- detected_at: `<YYYY-MM-DD HH:mm:ss +08:00>`
- detected_by: `<fill-me>`
- release_commit: `<fill-me>`
- commander: `<fill-me>`
- qa_owner: `<fill-me>`
- api_owner: `<fill-me>`
- web_owner: `<fill-me>`
- ops_owner: `<fill-me>`

## 1. Trigger Summary

| Item | Value |
|---|---|
| Trigger source | <alert / user report / observation log / business report> |
| Affected area | <login / students / billing / upload / homepage / other> |
| Current status | <investigating / mitigated / rolled-back / resolved> |
| Rollback evaluation required | <yes/no> |

## 2. Impact Assessment

| Dimension | Details |
|---|---|
| User impact | <fill-me> |
| Estimated affected users / requests | <fill-me> |
| Data integrity risk | <none / suspected / confirmed> |
| Business risk | <fill-me> |

## 3. Timeline

| Time | Event | Owner | Evidence |
|---|---|---|---|
| <HH:mm:ss> | Incident detected | <fill-me> | <fill-me> |
| <HH:mm:ss> | Commander notified | <fill-me> | <fill-me> |
| <HH:mm:ss> | Mitigation started | <fill-me> | <fill-me> |
| <HH:mm:ss> | User communication sent | <fill-me> | <fill-me> |
| <HH:mm:ss> | Service recovered / rollback complete | <fill-me> | <fill-me> |

## 4. Metrics and Logs

| Evidence Type | Time Range | Path / Link | Key Observation |
|---|---|---|---|
| API logs | <fill-me> | <fill-me> | <fill-me> |
| Web logs | <fill-me> | <fill-me> | <fill-me> |
| DB logs / slow queries | <fill-me> | <fill-me> | <fill-me> |
| Monitoring screenshot / export | <fill-me> | <fill-me> | <fill-me> |
| Docker stats / host snapshot | <fill-me> | <fill-me> | <fill-me> |
| Sample request / response | <fill-me> | <fill-me> | <fill-me> |

## 5. Database and Data Checks

| Check | Result | Evidence | Owner |
|---|---|---|---|
| Active DB connections recorded | pending | <fill-me> | <fill-me> |
| Slow query Top 10 captured | pending | <fill-me> | <fill-me> |
| Data integrity spot-check completed | pending | <fill-me> | <fill-me> |
| Duplicate / missing data ruled out | pending | <fill-me> | <fill-me> |

## 6. Mitigation and Decision

| Decision Item | Value |
|---|---|
| Temporary mitigation | <fill-me> |
| Permanent fix owner | <fill-me> |
| Rollback decision | <keep / partial rollback / full rollback> |
| Decision timestamp | <fill-me> |
| Business approval | <fill-me> |

## 7. Closure Criteria

| Check | Result | Evidence |
|---|---|---|
| Root cause identified or bounded | pending | <fill-me> |
| Monitoring returned to green | pending | <fill-me> |
| Observation log updated | pending | <fill-me> |
| Follow-up issue created | pending | <fill-me> |
