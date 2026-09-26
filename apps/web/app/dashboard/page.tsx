import { Workspace } from "@/components/workspace";
import { Dashboard } from "@/components/dashboard";
export default function Page() {
  return (
    <Workspace roles={["FOUNDER", "COFOUNDER"]}>
      <Dashboard />
    </Workspace>
  );
}
