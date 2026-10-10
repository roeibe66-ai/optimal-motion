import { notFound } from "next/navigation";
import ExploreHarness from "@/app/components/dev/ExploreHarness";

// Dev-only harness: the patient Explore tab without logging in, for the
// `?data=worst|empty|one|huge` stress-test fixtures. 404s in production.
export default function DevExplorePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ExploreHarness />;
}
