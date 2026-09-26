import { Workspace } from "@/components/workspace";
import { Onboarding } from "@/components/onboarding";
export default function Page() {
  return (
    <Workspace roles={["FOUNDER", "COFOUNDER"]}>
      <Onboarding />
    </Workspace>
  );
}
