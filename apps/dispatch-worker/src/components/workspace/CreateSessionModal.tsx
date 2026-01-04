import { useState } from "react";
import { FileText } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { type Team } from "@/lib/workspace-service";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (sessionName: string) => void;
  team: Team;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  onStartSession,
  team,
}: CreateSessionModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onStartSession(name.trim());
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`New Session for ${team.name}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Session name"
          placeholder="e.g., Sprint 42 Planning"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<FileText className="h-4 w-4" />}
          fullWidth
          required
          autoFocus
        />

        <p className="text-sm text-slate-500 dark:text-slate-400">
          You will be redirected to create a room. The session will be linked to
          your team once the room is created.
        </p>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            Continue to Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
