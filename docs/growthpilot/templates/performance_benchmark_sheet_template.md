# Performance Benchmark Sheet

- release_id: `<release-id>`
- environment: `<uat/preprod>`
- benchmark_window: `<YYYY-MM-DD HH:mm ~ HH:mm +08:00>`
- release_commit: `<fill-me>`
- benchmark_owner: `<fill-me>`
- api_owner: `<fill-me>`
- web_owner: `<fill-me>`
- ops_owner: `<fill-me>`
- raw_results_dir: `docs/growthpilot/artifacts/releases/<release-id>/qa-29/`

## 1. Entry Checklist

| Check | Result | Evidence | Owner |
|---|---|---|---|
| Release candidate commit frozen | pending | <fill-me> | <fill-me> |
| Test data volume >= expected prod 30% | pending | <fill-me> | <fill-me> |
| `/health` stable for 5 min | pending | <fill-me> | <fill-me> |
| `/health/ready` stable for 5 min | pending | <fill-me> | <fill-me> |
| No migration / import / backup running | pending | <fill-me> | <fill-me> |
| Monitoring collection started | pending | <fill-me> | <fill-me> |

## 2. Scenario Registry

| Scenario ID | Endpoint / Action | Dataset / Account | Metric Source | Threshold | Notes |
|---|---|---|---|---|---|
| WEB-01 | `/` home page load | anonymous | browser / synthetic | P95 <= 3.0s | |
| API-01 | `GET /students?pageNo=1&pageSize=20` | teacher | load tool | P95 <= 300ms | |
| API-02 | `GET /students/{id}/360` | teacher | load tool | P95 <= 300ms | |
| API-03 | `GET /homework/submissions?pageNo=1&pageSize=20` | teacher | load tool | P95 <= 300ms | |
| API-04 | `GET /analytics/overview` | principal | load tool | P95 <= 300ms | |
| UPLOAD-01 | `POST /files/upload/multipart` 10MB | teacher | upload script | P95 <= 5.0s | |

## 3. Stage Results

| Stage | Scenario ID | Concurrency | Duration / Samples | RPS / Throughput | P50 | P95 | P99 | Error Rate | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| warm-up | <fill-me> | 1 | 3m | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | pending | <fill-me> |
| ramp-10 | <fill-me> | 10 | 5m | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | pending | <fill-me> |
| ramp-25 | <fill-me> | 25 | 10m | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | pending | <fill-me> |
| steady-50 | <fill-me> | 50 | 15m | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | pending | <fill-me> |
| upload-sample | UPLOAD-01 | 10 parallel | 20 uploads | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | pending | <fill-me> |

## 4. Infra Telemetry Samples

| Timestamp | CPU | Memory RSS | Disk Usage | Active DB Connections | Slow Queries >1s | Container Restarts | Evidence |
|---|---|---|---|---|---|---|---|
| <HH:mm> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> |
| <HH:mm> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> |
| <HH:mm> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> | <fill-me> |

## 5. Benchmark Findings

| Metric | Threshold | Observed | Status | Action Owner | Notes |
|---|---|---|---|---|---|
| Home page P95 | <= 3.0s | <fill-me> | pending | <fill-me> | |
| API list P95 | <= 300ms | <fill-me> | pending | <fill-me> | |
| API list P99 | <= 500ms | <fill-me> | pending | <fill-me> | |
| API error rate | < 1.0% | <fill-me> | pending | <fill-me> | |
| 10MB upload P95 | <= 5.0s | <fill-me> | pending | <fill-me> | |
| DB connection pool usage | < 70% | <fill-me> | pending | <fill-me> | |
| Slow queries >1s | <= 2 / 15m | <fill-me> | pending | <fill-me> | |

## 6. Evidence Checklist

| Evidence | Path | Result |
|---|---|---|
| Raw load-tool export | <fill-me> | pending |
| Home page timing screenshots | <fill-me> | pending |
| `/health` and `/health/ready` output | <fill-me> | pending |
| Docker stats snapshot | <fill-me> | pending |
| DB connections query output | <fill-me> | pending |
| Slow query evidence | <fill-me> | pending |
| Failure / error screenshots | <fill-me> | pending |

## 7. Conclusion

- decision: `<pass / conditional / fail>`
- summary: `<fill-me>`
- retest_required: `<yes/no>`
- blockers:
  - `<fill-me>`
