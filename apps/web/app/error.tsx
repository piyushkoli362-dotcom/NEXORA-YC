"use client";
import { ErrorState, Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="public-page">
      <h1>We hit a bump.</h1>
      <ErrorState
        error={
          new Error("This screen could not be loaded. Your saved work is safe.")
        }
      />
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
