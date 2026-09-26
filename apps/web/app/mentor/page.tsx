import { Workspace } from "@/components/workspace";
import { RoleLanding } from "@/components/settings";
export default function Page() {
  return (
    <Workspace roles={["MENTOR"]}>
      <RoleLanding role="MENTOR" />
    </Workspace>
  );
}
