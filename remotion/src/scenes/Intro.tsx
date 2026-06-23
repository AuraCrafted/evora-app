import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { colors } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrowO = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: "clamp" });
  const eyebrowY = interpolate(frame, [6, 22], [12, 0], { extrapolateRight: "clamp" });

  const titleSpring = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 110 } });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const wordReveal = (delay: number) => {
    const o = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateRight: "clamp" });
    const y = interpolate(frame, [delay, delay + 18], [30, 0], { extrapolateRight: "clamp" });
    return { opacity: o, transform: `translateY(${y}px)` };
  };

  const subO = interpolate(frame, [60, 78], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [60, 78], [16, 0], { extrapolateRight: "clamp" });

  const phoneSpring = spring({ frame: frame - 24, fps, config: { damping: 14, stiffness: 90 } });
  const phoneY = interpolate(phoneSpring, [0, 1], [80, 0]);
  const phoneRot = interpolate(phoneSpring, [0, 1], [10, -6]);
  const float = Math.sin(frame / 22) * 8;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", padding: "0 140px" }}>
      <div style={{ flex: 1, color: colors.ink }}>
        <div
          style={{
            opacity: eyebrowO,
            transform: `translateY(${eyebrowY}px)`,
            fontFamily: "Inter",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: colors.coralDeep,
            marginBottom: 28,
          }}
        >
          ✦ Meet Evora
        </div>

        <div
          style={{
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 180,
            lineHeight: 0.95,
            letterSpacing: -4,
            transform: `translateY(${titleY}px)`,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
        >
          <div style={wordReveal(18)}>Tiny actions,</div>
          <div style={{ ...wordReveal(34), fontStyle: "italic", color: colors.coralDeep }}>big momentum.</div>
        </div>

        <div
          style={{
            opacity: subO,
            transform: `translateY(${subY}px)`,
            fontFamily: "Inter",
            fontSize: 28,
            color: colors.inkSoft,
            marginTop: 36,
            maxWidth: 620,
            lineHeight: 1.4,
          }}
        >
          Roll the dice. Get one small nudge. Build a life of momentum, one swipe at a time.
        </div>
      </div>

      <div
        style={{
          flex: "0 0 540px",
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${phoneY + float}px) rotate(${phoneRot}deg)`,
          opacity: phoneSpring,
        }}
      >
        <div style={{ position: "relative" }}>
          <Img
            src={staticFile("images/screenshot-1.png")}
            style={{ height: 820, width: "auto" }}
          />

        </div>
      </div>
    </AbsoluteFill>
  );
};
