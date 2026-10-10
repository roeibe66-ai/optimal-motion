import { notFound } from "next/navigation";
import PlayerHarness from "@/app/components/dev/PlayerHarness";

// Dev-only harness: the real workout player without logging in, for the
// `?data=demo|worst|empty|one|huge` stress-test fixtures. 404s in production.
export default function DevPlayerPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PlayerHarness />;
}
