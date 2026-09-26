import { Workspace } from "@/components/workspace";
import { AdminScreen } from "@/components/admin";
export default function Page() {
  return (
    <Workspace roles={["ADMIN", "SUPER_ADMIN", "REVIEWER"]}>
      <AdminScreen />
    </Workspace>
  );
}
