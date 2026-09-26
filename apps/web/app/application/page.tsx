import { Workspace } from "@/components/workspace";
import { ApplicationScreen } from "@/components/application";
export default function Page() {
  return (
    <Workspace roles={["FOUNDER", "COFOUNDER"]}>
      <ApplicationScreen />
    </Workspace>
  );
}
