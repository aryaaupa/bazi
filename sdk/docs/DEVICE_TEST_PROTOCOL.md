# Device latency, memory, CPU, and energy protocol

The reproducible harness is `benchmarks/device-profile.mjs`. It warms the engine, records per-operation latency percentiles, heap use, CPU time, raw-data retention status, and optional externally measured energy.

```bash
node benchmarks/device-profile.mjs --device-name "Pixel 9 / Android 16 / Chrome 140" --samples 10000 --decisions 1000 --energy-mwh 18.4 --output evidence/pixel9-android16.json
```

Energy must come from a calibrated external power monitor or an approved platform energy profiler covering the same workload interval. The script never estimates energy from CPU time. Run at least five repetitions after thermal stabilization, record median and worst run, and retain raw profiler exports.

## Required test matrix

Test the minimum-supported, median, and current flagship device for every supported OS/browser or native runtime. Include low-power mode, battery and plugged-in operation, foreground/background transitions, 20% and 90% storage utilization, poor sensor quality, maximum supported event rate, long sessions, offline persistence, and thermal throttling.

Prespecify pass limits for ingest and decision p95/p99 latency, peak resident/heap memory, storage growth, CPU duty cycle, energy per hour, crash rate, and UI responsiveness. The reference result in `evidence/device-profile.reference.json` describes only the build container and is not endpoint evidence.
