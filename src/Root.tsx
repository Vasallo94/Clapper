import React from "react";
import "./index.css";
import { Composition } from "remotion";
import { ClaudeCodeTutorial } from "./compositions/ClaudeCodeTutorial/ClaudeCodeTutorial";
import { calculateMetadata } from "./compositions/ClaudeCodeTutorial/calculateMetadata";
import { TutorialConfigSchema } from "./compositions/ClaudeCodeTutorial/schema";
import { ProductShort } from "./compositions/ProductShort/ProductShort";
import { calculateMetadata as calculateProductShortMetadata } from "./compositions/ProductShort/calculateMetadata";
import { ProductShortConfigSchema } from "./compositions/ProductShort/schema";

const defaultTutorialProps = {
  id: "default",
  title: "Tutorial",
  description: "",
  fps: 30 as const,
  width: 1280 as const,
  height: 720 as const,
  theme: "linea-directa" as const,
  scenes: [
    { type: "intro" as const, title: "Tutorial", durationInSeconds: 3 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
      <Composition
        id="ProductShort"
        component={ProductShort}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        schema={ProductShortConfigSchema}
        defaultProps={{
          id: "default",
          composition: "ProductShort" as const,
          product: "Seguro de Coche",
          headline: "Todo riesgo desde 168€/año",
          theme: "linea-directa" as const,
          fps: 30 as const,
          width: 1080 as const,
          height: 1920 as const,
          scenes: [
            { type: "hero" as const, title: "Seguro de Coche", durationInSeconds: 4 },
          ],
        }}
        calculateMetadata={calculateProductShortMetadata}
      />
    </>
  );
};
