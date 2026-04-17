import cron from "node-cron";

interface Job {
  name: string;
  expression: string;
  task: cron.ScheduledTask;
}

const registry: Map<string, Job> = new Map();

export function registerJob(
  name: string,
  cronExpression: string,
  handler: () => void | Promise<void>,
): void {
  if (registry.has(name)) {
    console.warn(`[scheduler] Job "${name}" already registered, skipping.`);
    return;
  }

  const task = cron.schedule(cronExpression, async () => {
    console.log(`[scheduler] Running job "${name}"...`);
    const start = Date.now();
    try {
      await handler();
      console.log(
        `[scheduler] Job "${name}" completed in ${Date.now() - start}ms`,
      );
    } catch (err) {
      console.error(`[scheduler] Job "${name}" failed:`, err);
    }
  }, { scheduled: false });

  registry.set(name, { name, expression: cronExpression, task });
  console.log(`[scheduler] Registered job "${name}" (${cronExpression})`);
}

export function startScheduler(): void {
  console.log(`[scheduler] Starting ${registry.size} job(s)...`);
  for (const job of registry.values()) {
    job.task.start();
  }
}

export function stopScheduler(): void {
  for (const job of registry.values()) {
    job.task.stop();
  }
  console.log("[scheduler] All jobs stopped.");
}

export function listJobs(): Array<{ name: string; expression: string }> {
  return Array.from(registry.values()).map((j) => ({
    name: j.name,
    expression: j.expression,
  }));
}
