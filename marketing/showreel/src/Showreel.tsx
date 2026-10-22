import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CUT } from "./theme";
import { Hook, Problem, Solution } from "./scenes/intro";
import { AdminShow, CustomerShow, RiderShow } from "./scenes/showcase";
import { Benefits, CTA, DropFall } from "./scenes/outro";

/** Overlap so outgoing transitions can finish over the incoming scene. */
const OVER = 6;

const scenes: { from: number; to: number; C: React.FC; overlap?: number }[] = [
  { from: CUT.hook, to: CUT.problem, C: Hook },
  { from: CUT.problem, to: CUT.solution, C: Problem },
  { from: CUT.solution, to: CUT.customer, C: Solution },
  { from: CUT.customer, to: CUT.rider, C: CustomerShow },
  { from: CUT.rider, to: CUT.admin, C: RiderShow },
  { from: CUT.admin, to: CUT.benefits, C: AdminShow },
  { from: CUT.benefits, to: CUT.cta, C: Benefits },
  { from: CUT.cta, to: CUT.end, C: CTA, overlap: 0 },
];

export const Showreel: React.FC = () => (
  <AbsoluteFill style={{ background: "#061a38" }}>
    {scenes.map(({ from, to, C, overlap = OVER }, i) => (
      <Sequence key={i} from={from} durationInFrames={to - from + overlap} name={C.name}>
        <C />
      </Sequence>
    ))}
    <Sequence from={CUT.cta - 9} durationInFrames={10} name="DropFall">
      <DropFall />
    </Sequence>
    <Audio src={staticFile("audio/master.wav")} />
  </AbsoluteFill>
);
