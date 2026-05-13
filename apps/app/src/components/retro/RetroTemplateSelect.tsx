import { useMemo, useState } from "react";
import { Replace } from "lucide-react";
import { getRetroTemplate } from "@sprintjam/utils";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RetroTemplateGrid } from "./RetroTemplateGrid";

interface RetroTemplateSelectProps {
  value: string;
  onValueChange: (templateId: string) => void;
  disabled?: boolean;
}

export function RetroTemplateSelect({
  value,
  onValueChange,
  disabled = false,
}: RetroTemplateSelectProps) {
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const selectedTemplate = useMemo(() => getRetroTemplate(value), [value]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Retro template
      </p>
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {selectedTemplate.name}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {selectedTemplate.summary}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Replace className="h-4 w-4" />}
            onClick={() => setIsExplainerOpen(true)}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            Change
          </Button>
        </div>
      </div>
      <Modal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        title="Retro templates"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Choose the board structure that best matches the conversation.
          </p>
          <RetroTemplateGrid
            selectedTemplateId={selectedTemplate.id}
            onSelect={(templateId) => {
              onValueChange(templateId);
              setIsExplainerOpen(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
