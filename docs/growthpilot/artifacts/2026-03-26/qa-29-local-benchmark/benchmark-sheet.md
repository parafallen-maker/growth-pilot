# QA-29 Local Benchmark Sheet

- release_id: `99dbdfe`
- environment: `local-sandbox`
- benchmark_window: `2026-03-25T18:19:05.065Z`
- release_commit: `99dbdfe979bb25c6a5bca7fb19ebb4736dd615df`
- benchmark_owner: `Codex`
- api_owner: `Codex`
- web_owner: `Codex`
- ops_owner: `n/a`
- raw_results_dir: `docs/growthpilot/artifacts/2026-03-26/qa-29-local-benchmark`

## 1. Entry Checklist

| Check | Result | Evidence | Owner |
|---|---|---|---|
| Release candidate commit frozen | done | `99dbdfe979bb25c6a5bca7fb19ebb4736dd615df` | Codex |
| Test data volume >= expected prod 30% | partial | seeded file-backed sample data only | Codex |
| `/health` stable for 5 min | partial | in-process `HealthService.getLiveness()` only | Codex |
| `/health/ready` stable for 5 min | partial | in-process `HealthService.getReadiness()` only | Codex |
| No migration / import / backup running | done | isolated benchmark runner; no background jobs started | Codex |
| Monitoring collection started | partial | process CPU/RSS only | Codex |

## 2. Scenario Registry

| Scenario ID | Endpoint / Action | Dataset / Account | Metric Source | Threshold | Notes |
|---|---|---|---|---|---|
| WEB-01 | `/` home page load | anonymous | blocked | P95 <= 3.0s | sandbox blocks local listen/connect, so no browser/http sample |
| API-01 | `GET /students?pageNo=1&pageSize=20` | teacher | in-process benchmark | P95 <= 300ms | includes `AuthService.currentUser()` |
| API-02 | `GET /students/{id}/360` | teacher | in-process benchmark | observed only | detail scenario, not list threshold |
| API-03 | `GET /homework/submissions?pageNo=1&pageSize=20` | teacher | in-process benchmark | P95 <= 300ms | includes `AuthService.currentUser()` |
| API-04 | `GET /analytics/overview` | admin | in-process benchmark | observed only | principal-equivalent substitution for local seed |
| UPLOAD-01 | `POST /files/upload/multipart` 10MB | teacher | in-process benchmark | P95 <= 5.0s | 10MB write through `FilesService` -> local object storage |

## 3. Stage Results

| Stage | Scenario ID | Concurrency | Duration / Samples | RPS / Throughput | P50 | P95 | P99 | Error Rate | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| warm-up | API-01 | 1 | 20 samples | 5253.02 req/s | 0.176ms | 0.198ms | 0.441ms | 0% | ok | benchmark-report.json |
| warm-up | API-02 | 1 | 20 samples | 3325.067 req/s | 0.248ms | 0.305ms | 1.277ms | 0% | ok | benchmark-report.json |
| warm-up | API-03 | 1 | 20 samples | 6432.937 req/s | 0.148ms | 0.164ms | 0.235ms | 0% | ok | benchmark-report.json |
| warm-up | API-04 | 1 | 20 samples | 5300.06 req/s | 0.168ms | 0.204ms | 0.531ms | 0% | ok | benchmark-report.json |
| ramp-10 | API-01 | 10 | 100 samples | 6497.902 req/s | 1.458ms | 2.048ms | 2.055ms | 0% | ok | benchmark-report.json |
| ramp-10 | API-02 | 10 | 100 samples | 4571.368 req/s | 2.097ms | 2.985ms | 2.991ms | 0% | ok | benchmark-report.json |
| ramp-10 | API-03 | 10 | 100 samples | 7220.347 req/s | 1.338ms | 1.59ms | 1.593ms | 0% | ok | benchmark-report.json |
| ramp-10 | API-04 | 10 | 100 samples | 6659.12 req/s | 1.443ms | 1.655ms | 1.674ms | 0% | ok | benchmark-report.json |
| ramp-25 | API-01 | 25 | 250 samples | 7090.799 req/s | 3.483ms | 3.703ms | 3.711ms | 0% | ok | benchmark-report.json |
| ramp-25 | API-02 | 25 | 250 samples | 5003.569 req/s | 4.943ms | 5.128ms | 5.129ms | 0% | ok | benchmark-report.json |
| ramp-25 | API-03 | 25 | 250 samples | 7693.363 req/s | 3.234ms | 3.343ms | 3.344ms | 0% | ok | benchmark-report.json |
| ramp-25 | API-04 | 25 | 250 samples | 7186.782 req/s | 3.453ms | 3.639ms | 3.642ms | 0% | ok | benchmark-report.json |
| steady-50 | API-01 | 50 | 500 samples | 7152.087 req/s | 6.945ms | 7.617ms | 7.619ms | 0% | ok | benchmark-report.json |
| steady-50 | API-02 | 50 | 500 samples | 5114.512 req/s | 9.767ms | 9.903ms | 9.912ms | 0% | ok | benchmark-report.json |
| steady-50 | API-03 | 50 | 500 samples | 7651.387 req/s | 6.507ms | 6.862ms | 6.894ms | 0% | ok | benchmark-report.json |
| steady-50 | API-04 | 50 | 500 samples | 7259.414 req/s | 6.833ms | 7.198ms | 7.201ms | 0% | ok | benchmark-report.json |
| upload-sample | UPLOAD-01 | 10 | 20 samples | 64.739 req/s | 149.549ms | 159.339ms | 159.369ms | 0% | ok | benchmark-report.json |

## 4. Infra Telemetry Samples

| Timestamp | CPU | Memory RSS | Disk Usage | Active DB Connections | Slow Queries >1s | Evidence |
|---|---|---|---|---|---|---|
| warm-up/API-01 | 4.337 ms CPU | 114.03 MiB | n/a | n/a | n/a | benchmark-report.json |
| warm-up/API-02 | 6.559 ms CPU | 118.38 MiB | n/a | n/a | n/a | benchmark-report.json |
| warm-up/API-03 | 3.292 ms CPU | 120.33 MiB | n/a | n/a | n/a | benchmark-report.json |
| warm-up/API-04 | 4.094 ms CPU | 122.75 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-10/API-01 | 17.150 ms CPU | 125.20 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-10/API-02 | 23.775 ms CPU | 131.88 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-10/API-03 | 14.316 ms CPU | 131.94 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-10/API-04 | 15.705 ms CPU | 131.97 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-25/API-01 | 38.037 ms CPU | 132.14 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-25/API-02 | 52.746 ms CPU | 132.22 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-25/API-03 | 37.482 ms CPU | 132.28 MiB | n/a | n/a | n/a | benchmark-report.json |
| ramp-25/API-04 | 35.959 ms CPU | 132.36 MiB | n/a | n/a | n/a | benchmark-report.json |
| steady-50/API-01 | 71.877 ms CPU | 132.42 MiB | n/a | n/a | n/a | benchmark-report.json |
| steady-50/API-02 | 102.922 ms CPU | 132.64 MiB | n/a | n/a | n/a | benchmark-report.json |
| steady-50/API-03 | 68.728 ms CPU | 132.78 MiB | n/a | n/a | n/a | benchmark-report.json |
| steady-50/API-04 | 71.989 ms CPU | 133.16 MiB | n/a | n/a | n/a | benchmark-report.json |
| upload-sample/UPLOAD-01 | 397.482 ms CPU | 447.83 MiB | n/a | n/a | n/a | benchmark-report.json |

## 5. Benchmark Findings

| Metric | Threshold | Observed | Status | Action Owner | Notes |
|---|---|---|---|---|---|
| Home page P95 | <= 3.0s | blocked | blocked | follow-up | browser/http benchmark not runnable in sandbox |
| API list P95 | <= 300ms | 7.617ms | green | Codex | max of API-01 and API-03 steady-50 |
| API list P99 | <= 500ms | 7.619ms | green | Codex | max of API-01 and API-03 steady-50 |
| API error rate | < 1.0% | 0% | green | Codex | aggregate steady-50 API scenarios |
| 10MB upload P95 | <= 5.0s | 159.339ms | green | Codex | local disk-backed upload path |

## 6. Evidence Checklist

| Evidence | Path | Result |
|---|---|---|
| Raw benchmark export | `docs/growthpilot/artifacts/2026-03-26/qa-29-local-benchmark/benchmark-report.json` | done |
| Benchmark sheet | `docs/growthpilot/artifacts/2026-03-26/qa-29-local-benchmark/benchmark-sheet.md` | done |
| Web build manifest inspection | `apps/web/.next/app-build-manifest.json` | done |
| Home page timing screenshots | n/a | blocked |
| Docker stats snapshot | n/a | blocked |
| DB connections query output | n/a | blocked |
| Slow query evidence | n/a | blocked |

## 7. Conclusion

- decision: `conditional`
- summary: `API list and 10MB upload lower-bound numbers are green in-process, but WEB-01 and real HTTP/browser timings remain unmeasured because sandbox networking is blocked.`
- retest_required: `yes`
- blockers:
  - Sandbox denied loopback `listen()` and `connect()` with `EPERM`; no local HTTP server or browser-page benchmark could be executed in this session.
  - WEB-01 has no real timing sample yet. A follow-up run outside this sandbox is still required before QA-29 can be closed.
