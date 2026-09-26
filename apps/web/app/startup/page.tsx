import { Workspace } from "@/components/workspace";
import { StartupProfile } from "@/components/application";
export default function Page() {
  return (
    <Workspace roles={["FOUNDER", "COFOUNDER"]}>
      <StartupProfile />
    </Workspace>
  );
}
