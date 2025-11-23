import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { RetroFormat } from '@/types';

interface RetroFormatModalProps {
  isOpen: boolean;
  onSelectFormat: (format: RetroFormat) => void;
  onCancel: () => void;
}

const RETRO_FORMATS: Record<
  RetroFormat,
  { label: string; description: string }
> = {
  'start-stop-continue': {
    label: 'Start, Stop, Continue',
    description: 'What should we start doing, stop doing, and continue doing?',
  },
  'went-well-improve-actions': {
    label: 'What Went Well / What to Improve / Actions',
    description: 'Reflect on successes, areas for improvement, and concrete actions.',
  },
  'mad-sad-glad': {
    label: 'Mad, Sad, Glad',
    description: 'What made you mad, sad, or glad during the sprint?',
  },
  'four-ls': {
    label: '4 Ls: Liked, Learned, Lacked, Longed For',
    description: 'What did you like, learn, lack, and long for?',
  },
};

export const RetroFormatModal = ({
  isOpen,
  onSelectFormat,
  onCancel,
}: RetroFormatModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="md">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Start Sprint Retrospective
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose a retrospective format to begin.
          </p>
        </div>

        <div className="space-y-3">
          {(Object.keys(RETRO_FORMATS) as RetroFormat[]).map((formatKey) => (
            <button
              key={formatKey}
              onClick={() => onSelectFormat(formatKey)}
              className="w-full text-left rounded-lg border-2 border-slate-200 dark:border-slate-700 p-4 transition-all hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="font-medium text-slate-900 dark:text-white">
                {RETRO_FORMATS[formatKey].label}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {RETRO_FORMATS[formatKey].description}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
