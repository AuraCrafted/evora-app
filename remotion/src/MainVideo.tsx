import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

import { colors, gradientWarm } from "./theme";
import { Intro } from "./scenes/Intro";
import { ScreenScene } from "./scenes/ScreenScene";
import { Outro } from "./scenes/Outro";

loadFraunces();
loadInter();

const SCENE = 120;
const TRANS = 18;
// 6 scenes, 5 transitions -> 6*SCENE - 5*TRANS
export const TOTAL_FRAMES = 6 * SCENE - 5 * TRANS;

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = Math.sin((frame / durationInFrames) * Math.PI * 2) * 30;
  return (
    <AbsoluteFill style={{ background: gradientWarm }}>
      {/* Floating blurred blobs */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.coral}55, transparent 65%)`,
          top: -200 + drift,
          left: -200,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.lilac}88, transparent 65%)`,
          bottom: -150 - drift,
          right: -150,
          filter: "blur(50px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.apricot}66, transparent 70%)`,
          top: "30%",
          right: "20%",
          filter: "blur(60px)",
          transform: `translateY(${drift * 0.5}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      opacity: 0.06,
      mixBlendMode: "multiply",
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
    }}
  />
);

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ durationInFrames: TRANS, config: { damping: 200 } })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <ScreenScene
            image="images/screenshot-2.png"
            eyebrow="Step 01"
            title="Swipe to roll."
            body="One small action, picked for right now. Two minutes or twenty — your call."
            side="right"
            accent={colors.coral}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ durationInFrames: TRANS, config: { damping: 200 } })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <ScreenScene
            image="images/screenshot-3.png"
            eyebrow="Step 02"
            title="Accept. Do it. Done."
            body="Tap I'll do it and start. Keep building momentum with one small yes."
            side="left"
            accent={colors.coralDeep}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ durationInFrames: TRANS, config: { damping: 200 } })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <ScreenScene
            image="images/screenshot-4.png"
            eyebrow="Step 03"
            title="Track your streak."
            body="See recent rolls, completed nudges, skips, and the momentum you’re building." 
            side="right"
            accent={colors.apricot}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ durationInFrames: TRANS, config: { damping: 200 } })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <ScreenScene
            image="images/screenshot-5.png"
            eyebrow="Step 04"
            title="Coach in your pocket."
            body="Talk it through and get grounded support for the next few minutes."
            side="left"
            accent={colors.sage}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ durationInFrames: TRANS, config: { damping: 200 } })} />

        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Outro image="images/screenshot-1.png" />
        </TransitionSeries.Sequence>


      </TransitionSeries>
      <Grain />
    </AbsoluteFill>
  );
};
