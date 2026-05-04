import {
  type PointerEvent as ReactPointerEvent,
  useMemo,
} from "react";
import {
  CircleDot,
  Grip,
  RotateCw,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  type ActiveToy,
  type ToyKind,
  useFidgetToys,
} from "@/components/easter-eggs/FidgetToyContext";
import { useDraggableFidget } from "@/components/easter-eggs/useDraggableFidget";
import { Joystick } from "./toys/joystick";
import { SpinnerToy } from "./toys/spinner";
import { PopPadToy } from "./toys/poppad";

const TOY_OPTIONS: Array<{
  kind: ToyKind;
  label: string;
  Icon: typeof CircleDot;
}> = [
    { kind: "spinner", label: "Spinner", Icon: RotateCw },
    { kind: "pop-pad", label: "Pop pad", Icon: CircleDot },
    { kind: "joystick", label: "Joystick", Icon: SlidersHorizontal },
  ];

const getToyTitle = (kind: ToyKind) =>
  TOY_OPTIONS.find((toy) => toy.kind === kind)?.label ?? "Fidget";

export function FidgetToyShelf() {
  const { isPickerOpen, closePicker, toys, addToy, removeToy } =
    useFidgetToys();
  const visibleToys = useMemo(() => toys.slice(-5), [toys]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {isPickerOpen ? (
        <FidgetPicker onAddToy={addToy} onClose={closePicker} />
      ) : null}

      {visibleToys.map((toy, index) => (
        <DraggableToy
          key={toy.id}
          toy={toy}
          index={index}
          onRemove={() => removeToy(toy.id)}
        />
      ))}
    </div>
  );
}

function FidgetPicker({
  onAddToy,
  onClose,
}: {
  onAddToy: (kind: ToyKind) => void;
  onClose: () => void;
}) {
  const { position, isDragging, startDrag } = useDraggableFidget({
    x: 28,
    y: 120,
  }, { width: 360, height: 220 });

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
  index,
  onRemove,
}: {
  toy: ActiveToy;
  index: number;
  onRemove: () => void;
}) {
  const initialPosition = useMemo(
    () => ({
      x: 28 + index * 28,
      y: 96 + index * 22,
    }),
    [index],
  );
  const { position, isDragging, startDrag } =
    useDraggableFidget(initialPosition);

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
        {toy.kind === "spinner" ? (
          <SpinnerToy seed={toy.createdAt} />
        ) : toy.kind === "pop-pad" ? (
          <PopPadToy />
        ) : (
          <Joystick />
        )}
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
