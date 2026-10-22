import { Composition } from "remotion";
import { Showreel } from "./Showreel";
import T from "./timing.json";

export const Root = () => (
  <Composition id="Showreel" component={Showreel} durationInFrames={T.fps * T.duration} fps={T.fps} width={1920} height={1080} />
);
