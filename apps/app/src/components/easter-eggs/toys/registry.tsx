import type { ReactElement } from "react";
import {
  CircleDot,
  Cuboid,
  GalleryHorizontalEnd,
  Magnet,
  Route,
  RotateCw,
  SlidersHorizontal,
  ToggleLeft,
  Volleyball,
} from "lucide-react";

import type { ToyKind } from "@/components/easter-eggs/FidgetToyContext";

import { DeskCubeToy } from "./desk-cube";
import { Joystick } from "./joystick";
import { MagnetBallsToy } from "./magnet-balls";
import { MiniAbacusToy } from "./mini-abacus";
import { PopPadToy } from "./poppad";
import { RubberBandBallToy } from "./rubber-band-ball";
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
  {
    kind: "desk-cube",
    label: "Desk cube",
    Icon: Cuboid,
    Component: DeskCubeToy,
  },
  {
    kind: "magnet-balls",
    label: "Magnet balls",
    Icon: Magnet,
    Component: MagnetBallsToy,
  },
  {
    kind: "rubber-band-ball",
    label: "Rubber band ball",
    Icon: Volleyball,
    Component: RubberBandBallToy,
  },
];

export const getToyOption = (kind: ToyKind) =>
  TOY_OPTIONS.find((toy) => toy.kind === kind);

export const getToyTitle = (kind: ToyKind) =>
  getToyOption(kind)?.label ?? "Fidget";
