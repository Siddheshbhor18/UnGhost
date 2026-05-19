import { PageLoadingShell } from "@/components/ui";

/**
 * Default skeleton for every /student/* segment. Next.js shows this the
 * instant the user navigates, so the page never blanks while server data
 * resolves. Override per-route by adding a local loading.tsx next to a page.
 */
export default function StudentLoading() {
  return <PageLoadingShell variant="stack" title="Loading" />;
}
