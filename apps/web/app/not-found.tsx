import Link from "next/link";
import { Button } from "@/components/ui";
export default function NotFound() {
  return (
    <main id="main" className="public-page">
      <div className="eyebrow">404 / A different direction</div>
      <h1>This page isn’t here.</h1>
      <p>Let’s get you back to your startup journey.</p>
      <Button asChild>
        <Link href="/">Return to Nexora</Link>
      </Button>
    </main>
  );
}
