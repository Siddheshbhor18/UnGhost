import { Composition } from "remotion";
import {
  GradingComposition,
  GRADING_DURATION,
  GRADING_FPS,
  GRADING_W,
  GRADING_H,
} from "./GradingComposition";

/**
 * Remotion root — registers the AI-grading composition for CLI rendering
 * (`npx remotion render`). The rendered video is embedded on the landing as a
 * plain <video>, so no Remotion Player runtime ships to the browser.
 */
export function RemotionRoot() {
  return (
    <Composition
      id="AiGrading"
      component={GradingComposition}
      durationInFrames={GRADING_DURATION}
      fps={GRADING_FPS}
      width={GRADING_W}
      height={GRADING_H}
    />
  );
}
