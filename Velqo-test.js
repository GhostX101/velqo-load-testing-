
import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

const BASE_URL = __ENV.BASE_URL || 'https://velqo.com';

export const options = {
    stages: [
        { duration: '1m', target: 5 },   // Ramp up to 5 users
        { duration: '2m', target: 10 },  // Increase to 10 users
        { duration: '3m', target: 20 },  // Increase to 20 users
        { duration: '2m', target: 30 },  // Peak load: 30 users
        { duration: '1m', target: 0 },   // Ramp down
    ],

    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
        error_rate: ['rate<0.01'],
    },
};

export default function () {

    // 1. Visit Velqo homepage
    const response = http.get(BASE_URL);

    // 2. Validate response
    const passed = check(response, {
        'Homepage returns status 200': (r) => r.status === 200,
        'Response time below 500ms': (r) => r.timings.duration < 500,
        'Homepage returns content': (r) => r.body.length > 0,
    });

    // 3. Record metrics
    errorRate.add(!passed);
    responseTime.add(response.timings.duration);

    sleep(1);
}
