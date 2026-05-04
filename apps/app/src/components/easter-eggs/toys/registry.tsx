import type { ReactElement } from "react";
import {
  CircleDot,
  GalleryHorizontalEnd,
  Route,
  RotateCw,
  SlidersHorizontal,
  ToggleLeft,
} from "lucide-react";

import type { ToyKind } from "@/components/easter-eggs/FidgetToyContext";

import { Joystick } from "./joystick";
import { MiniAbacusToy } from "./mini-abacus";
import { PopPadToy } from "./poppad";
import { SliderMazeToy } from "./slider-maze";
import { SpinnerToy } from "./spinner";
import { SwitchPanelToy } from "./switch-panel";

export type ToyComponentProps = {
  seed: number;
  isSoundEnabled: boolean;
};

export const TOY_OPTIONS: Array<{
  kind: ToyKind;
  label: string;
  Icon: typeof CircleDot;
  Component: (props: ToyComponentProps) => ReactElement;
}> = [
  { kind: "spinner", label: "Spinner", Icon: RotateCw, Component: SpinnerToy },
  { kind: "pop-pad", label: "Pop pad", Icon: CircleDot, Component: PopPadToy },
  {
    kind: "joystick",
    label: "Joystick",
    Icon: SlidersHorizontal,
    Component: Joystick,
  },
  {
    kind: "switch-panel",
    label: "Switch panel",
    Icon: ToggleLeft,
    Component: SwitchPanelToy,
  },
  {
    kind: "slider-maze",
    label: "Slider maze",
    Icon: Route,
    Component: SliderMazeToy,
  },
  {
    kind: "mini-abacus",
    label: "Mini abacus",
    Icon: GalleryHorizontalEnd,
    Component: MiniAbacusToy,
  },
];

export const getToyOption = (kind: ToyKind) =>
  TOY_OPTIONS.find((toy) => toy.kind === kind);

export const getToyTitle = (kind: ToyKind) =>
  getToyOption(kind)?.label ?? "Fidget";
