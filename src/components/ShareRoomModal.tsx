import { type FC, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomKey: string;
}

const ShareRoomModal: FC<ShareRoomModalProps> = ({
  isOpen,
  onClose,
  roomKey,
}) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shareableUrl = `${window.location.origin}/?join=${roomKey}`;

  const handleCopy = () => {
    if (inputRef.current) {
      inputRef.current.select();
      navigator.clipboard.writeText(shareableUrl);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Room" size="md">
      <div className="space-y-6">
        <div>
          <label
            htmlFor="share-room-url"
            className="mb-2 block text-sm text-slate-600 dark:text-slate-300"
          >
            Share this link with your team:
          </label>
          <div className="flex gap-2">
            <input
              id="share-room-url"
              ref={inputRef}
              type="text"
              readOnly
              value={shareableUrl}
              aria-label="Shareable room URL"
              className="flex-1 rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:ring-brand-900 dark:focus:border-brand-400"
            />
            <Button onClick={handleCopy} variant="primary" size="md">
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Or scan this QR code:
          </p>
          <div className="p-4 bg-white/80 dark:bg-slate-900/60 border border-white/50 dark:border-white/10 rounded-2xl shadow-sm">
            <QRCodeSVG
              value={shareableUrl}
              size={200}
              title="QR code for room invite link"
              role="img"
              aria-label="QR code for room invite link"
            />
          </div>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-300 italic">
          Anyone with this link can join this planning room.
        </div>
      </div>
    </Modal>
  );
};

export default ShareRoomModal; 