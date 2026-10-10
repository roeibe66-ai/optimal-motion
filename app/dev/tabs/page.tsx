import { notFound } from "next/navigation";
import TabsHarness from "@/app/components/dev/TabsHarness";

// Dev-only harness: the Calendar, builder, My workouts and Profile tabs
// without logging in, for the `?data=demo|worst|empty|one|huge` stress-test
// fixtures. 404s in production.
export default function DevTabsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TabsHarness />;
}
