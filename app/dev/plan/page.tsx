import { notFound } from "next/navigation";
import PlanHarness from "@/app/components/dev/PlanHarness";

// Dev-only harness: the patient Plan (home) tab without logging in, for the
// `?data=demo|worst|empty|one|huge` stress-test fixtures. 404s in production.
export default function DevPlanPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PlanHarness />;
}
