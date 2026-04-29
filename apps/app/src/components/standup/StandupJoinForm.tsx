import { type FormEvent, useEffect, useState } from "react";
import { Key, User } from "lucide-react";
import { motion } from "framer-motion";

import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { getStoredUserName, persistUserName } from "@/hooks/useUserPersistence";
import {
  formatRoomKey,
  validateName,
  validateRoomKey,
} from "@/utils/validators";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export function StandupJoinForm({
  initialStandupKey,
}: {
  initialStandupKey?: string;
}) {
  const navigateTo = useAppNavigation();
  const { user } = useWorkspaceData();
  const workspaceName = user?.name?.trim() ?? "";
  const [userName, setUserName] = useState(() =>
    validateName(workspaceName).ok ? workspaceName : getStoredUserName(),
  );
  const [standupKey, setStandupKey] = useState(
    () => initialStandupKey?.toUpperCase() ?? "",
  );

  useEffect(() => {
    if (!validateName(userName).ok && validateName(workspaceName).ok) {
      setUserName(workspaceName);
    }
  }, [userName, workspaceName]);

  const nameValidation = validateName(userName);
  const keyValidation = validateRoomKey(standupKey);
  const isFormValid = nameValidation.ok && keyValidation.ok;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;
    persistUserName(userName.trim());
    navigateTo("standupRoom", { standupKey: standupKey.trim() });
  };

  return (
    <SurfaceCard className="space-y-6">
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-6">
          <Input
            id="standup-join-name"
            label={
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Your name
              </span>
            }
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name"
            fullWidth
            required
            showValidation
            isValid={nameValidation.ok}
            helperText={nameValidation.ok ? undefined : nameValidation.error}
          />

          <Input
            id="standup-join-key"
            label={
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Standup key
              </span>
            }
            value={standupKey}
            onChange={(e) => setStandupKey(formatRoomKey(e.target.value))}
            placeholder="ABCD"
            fullWidth
            required
            showValidation
            isValid={keyValidation.ok}
            helperText="Key shared by your facilitator"
            className="font-mono tracking-[0.35em]"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigateTo("standup")}
          >
            Back
          </Button>
          <Button
            type="submit"
            fullWidth
            disabled={!isFormValid}
            icon={<User className="h-4 w-4" />}
          >
            Join standup
          </Button>
        </div>
      </motion.form>
    </SurfaceCard>
  );
}
