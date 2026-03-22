import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { ClaudeCodeTutorial } from "./compositions/ClaudeCodeTutorial/ClaudeCodeTutorial";
import { calculateMetadata } from "./compositions/ClaudeCodeTutorial/calculateMetadata";
import { TutorialConfigSchema } from "./compositions/ClaudeCodeTutorial/schema";

const defaultTutorialProps = {
  id: "default",
  title: "Tutorial",
  description: "",
  fps: 30 as const,
  width: 1280 as const,
  height: 720 as const,
  scenes: [
    { type: "intro" as const, title: "Tutorial", durationInSeconds: 3 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ClaudeCodeTutorial"
        component={ClaudeCodeTutorial}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        schema={TutorialConfigSchema}
        defaultProps={defaultTutorialProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
