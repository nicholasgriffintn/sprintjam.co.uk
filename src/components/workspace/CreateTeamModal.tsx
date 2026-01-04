import { useState } from "react";
import { Users } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createTeam, type Team } from "@/lib/workspace-service";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated: (team: Team) => void;
}

export function CreateTeamModal({
  isOpen,
  onClose,
  onTeamCreated,
}: CreateTeamModalProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const team = await createTeam(name.trim());
      setName("");
      onTeamCreated(team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Team" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Team name"
          placeholder="e.g., Engineering Team"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<Users className="h-4 w-4" />}
          error={error}
          fullWidth
          required
          autoFocus
          disabled={isLoading}
          maxLength={100}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!name.trim()}>
            Create Team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
