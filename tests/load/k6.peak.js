/**
 * k6 peak load test — 10k concurrent users (the Sprint D acceptance bar).
 *
 * Run against staging once Sprint C is deployed:
 *   k6 run --vus 10000 --duration 10m tests/load/k6.peak.js -e BASE_URL=https://staging.unghost.com
 *
 * Thresholds match the PDF Day 4 acceptance:
 *   - error rate < 0.1 %
 *   - p50 < 400ms, p95 < 800ms, p99 < 2s
 *
 * Mixes read-only public surfaces (no auth state to manage) so the run can
 * be repeated cleanly. Authenticated load tests live in k6.authenticated.js.
 */
import http from "k6/http";
import { check, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errors = new Rate("errors");
const dashboardLatency = new Trend("dashboard_latency_ms");

export const options = {
  scenarios: {
    peak: {
      executor: "ramping-vus",
      startVUs: 100,
      stages: [
        { duration: "2m", target: 2000 },
        { duration: "1m", target: 5000 },
        { duration: "5m", target: 10000 },
        { duration: "1m", target: 10000 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.001"], // <0.1%
    http_req_duration: ["p(50)<400", "p(95)<800", "p(99)<2000"],
    errors: ["rate<0.001"],
    dashboard_latency_ms: ["p(95)<1500"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("landing+catalogue", () => {
    const r1 = http.get(`${BASE}/`);
    check(r1, { "landing 200": (r) => r.status === 200 });
    errors.add(r1.status !== 200);

    const r2 = http.get(`${BASE}/bootcamps`);
    check(r2, { "bootcamps 200": (r) => r.status === 200 });
    errors.add(r2.status !== 200);
  });

  group("api hot paths", () => {
    const r1 = http.get(`${BASE}/api/health`);
    check(r1, { "health 200": (r) => r.status === 200 });
    errors.add(r1.status !== 200);
    dashboardLatency.add(r1.timings.duration);

    const r2 = http.get(`${BASE}/api/auth/csrf`);
    check(r2, { "csrf 200": (r) => r.status === 200 });
    errors.add(r2.status !== 200);
  });
}
