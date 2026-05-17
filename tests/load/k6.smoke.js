/**
 * k6 smoke load test.
 *
 * Run:
 *   k6 run --vus 20 --duration 60s tests/load/k6.smoke.js
 *
 * Acceptance thresholds — any breach fails the run, which CI catches.
 * Used as the green-light gate before a beta launch (Sprint D Day 5).
 */
import http from "k6/http";
import { check, group } from "k6";
import { Rate } from "k6/metrics";

export const errors = new Rate("errors");

export const options = {
  scenarios: {
    smoke: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "30s", target: 50 },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    // Acceptance — any breach fails the run.
    http_req_failed: ["rate<0.01"], // <1% errors
    http_req_duration: ["p(50)<400", "p(95)<800", "p(99)<2000"],
    errors: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("public surfaces", () => {
    const r1 = http.get(`${BASE}/`);
    check(r1, { "landing 200": (r) => r.status === 200 });
    errors.add(r1.status !== 200);

    const r2 = http.get(`${BASE}/bootcamps`);
    check(r2, { "bootcamps 200": (r) => r.status === 200 });
    errors.add(r2.status !== 200);

    const r3 = http.get(`${BASE}/api/health`);
    check(r3, {
      "health 200": (r) => r.status === 200,
      "health ok=true": (r) => {
        try {
          return JSON.parse(r.body).ok === true;
        } catch {
          return false;
        }
      },
    });
    errors.add(r3.status !== 200);
  });
}
