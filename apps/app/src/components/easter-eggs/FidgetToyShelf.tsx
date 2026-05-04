import { useCallback, useMemo } from "react";
import { Grip, Trash2, Volume2, VolumeX, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  type ActiveToy,
  MAX_FIDGET_TOYS,
  type ToyKind,
  useFidgetToys,
} from "@/components/easter-eggs/FidgetToyContext";
import { useDraggableFidget } from "@/components/easter-eggs/useDraggableFidget";
import {
  getToyOption,
  getToyTitle,
  TOY_OPTIONS,
} from "./toys/registry";

export function FidgetToyShelf() {
  const {
    isPickerOpen,
    isSoundEnabled,
    closePicker,
    toys,
    addToy,
    removeToy,
    clearToys,
    toggleSound,
    updateToyPosition,
  } = useFidgetToys();
  const visibleToys = useMemo(() => toys.slice(-MAX_FIDGET_TOYS), [toys]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {isPickerOpen ? (
        <FidgetPicker
          activeToyCount={visibleToys.length}
          isSoundEnabled={isSoundEnabled}
          onAddToy={addToy}
          onClear={clearToys}
          onClose={closePicker}
          onToggleSound={toggleSound}
        />
      ) : null}

      {visibleToys.map((toy) => (
        <DraggableToy
          key={toy.id}
          toy={toy}
          onRemove={() => removeToy(toy.id)}
          onPositionChange={(position) => updateToyPosition(toy.id, position)}
          isSoundEnabled={isSoundEnabled}
        />
      ))}
    </div>
  );
}

function FidgetPicker({
  activeToyCount,
  isSoundEnabled,
  onAddToy,
  onClear,
  onClose,
  onToggleSound,
}: {
  activeToyCount: number;
  isSoundEnabled: boolean;
  onAddToy: (kind: ToyKind) => void;
  onClear: () => void;
  onClose: () => void;
  onToggleSound: () => void;
}) {
  const pickerBounds = useMemo(() => ({ width: 360, height: 330 }), []);
  const { position, isDragging, startDrag } = useDraggableFidget(
    {
      x: 28,
      y: 120,
    },
    pickerBounds,
  );

  return (
    <section
      className={`pointer-events-auto fixed w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-floating backdrop-blur transition-shadow dark:border-white/15 dark:bg-slate-950/95 ${isDragging ? "shadow-2xl" : ""
        }`}
      style={{ left: position.x, top: position.y }}
      aria-label="Fidget box"
    >
      <WindowHeader
        title="Fidget box"
        onPointerDown={startDrag}
        onClose={onClose}
      />
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
        <span>
          {activeToyCount}/{MAX_FIDGET_TOYS} toys
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSound}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={
              isSoundEnabled ? "Mute fidget sounds" : "Unmute fidget sounds"
            }
          >
            {isSoundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={activeToyCount === 0}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Clear fidget toys"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {TOY_OPTIONS.map(({ kind, label, Icon }) => (
          <Button
            key={kind}
            type="button"
            variant="unstyled"
            onClick={() => onAddToy(kind)}
            className="min-h-20 flex-col rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-brand-300/50"
          >
            <Icon className="h-5 w-5" />
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}

function DraggableToy({
  toy,
  onRemove,
  onPositionChange,
  isSoundEnabled,
}: {
  toy: ActiveToy;
  onRemove: () => void;
  onPositionChange: (position: ActiveToy["position"]) => void;
  isSoundEnabled: boolean;
}) {
  const toyOption = getToyOption(toy.kind);
  const ToyComponent = toyOption?.Component;
  const handlePositionChange = useCallback(
    (position: ActiveToy["position"]) => onPositionChange(position),
    [onPositionChange],
  );
  const { position, isDragging, startDrag } =
    useDraggableFidget(toy.position, undefined, handlePositionChange);

  return (
    <section
      className={`pointer-events-auto fixed w-52 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-floating backdrop-blur transition-shadow dark:border-white/15 dark:bg-slate-950/95 ${isDragging ? "shadow-2xl" : ""
        }`}
      style={{ left: position.x, top: position.y }}
      aria-label={getToyTitle(toy.kind)}
    >
      <WindowHeader
        title={getToyTitle(toy.kind)}
        onPointerDown={startDrag}
        onClose={onRemove}
      />
      <div className="p-4">
        {ToyComponent ? (
          <ToyComponent
            seed={toy.visualSeed}
            isSoundEnabled={isSoundEnabled}
          />
        ) : null}
      </div>
    </section>
  );
}

function WindowHeader({
  title,
  onPointerDown,
  onClose,
}: {
  title: string;
  onPointerDown: ReturnType<typeof useDraggableFidget>["startDrag"];
  onClose: () => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="flex cursor-grab items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 active:cursor-grabbing dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
    >
      <span className="inline-flex items-center gap-2">
        <Grip className="h-3.5 w-3.5" />
        {title}
      </span>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClose}
        className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={`Close ${title}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
