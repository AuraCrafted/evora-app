import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { colors } from "../theme";

export const Outro: React.FC<{ image: string }> = ({ image }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.85, 1]);

  const subO = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [30, 50], [16, 0], { extrapolateRight: "clamp" });

  const ctaSpring = spring({ frame: frame - 50, fps, config: { damping: 14, stiffness: 110 } });
  const ctaY = interpolate(ctaSpring, [0, 1], [30, 0]);

  const phoneSpring = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 90 } });
  const phoneY = interpolate(phoneSpring, [0, 1], [60, 0]);
  const float = Math.sin(frame / 22) * 8;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", padding: "0 140px" }}>
      <div style={{ flex: 1, color: colors.ink }}>
        <div
          style={{
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 240,
            lineHeight: 0.9,
            letterSpacing: -6,
            transform: `scale(${titleScale})`,
            transformOrigin: "left",
            opacity: titleSpring,
          }}
        >
          Evora
        </div>
        <div
          style={{
            opacity: subO,
            transform: `translateY(${subY}px)`,
            fontFamily: "Fraunces",
            fontStyle: "italic",
            fontSize: 56,
            color: colors.coralDeep,
            marginTop: 24,
          }}
        >
          One nudge at a time.
        </div>
        <div
          style={{
            transform: `translateY(${ctaY}px)`,
            opacity: ctaSpring,
            marginTop: 60,
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 36px",
            borderRadius: 999,
            background: colors.ink,
            color: colors.bg,
            fontFamily: "Inter",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 28 }}></span>
          Download on the App Store
        </div>
      </div>
      <div
        style={{
          flex: "0 0 540px",
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${phoneY + float}px) rotate(4deg)`,
          opacity: phoneSpring,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: -60,
              borderRadius: 100,
              background: `radial-gradient(circle, ${colors.apricot}77, transparent 70%)`,
              filter: "blur(50px)",
            }}
          />
          <Img
            src={staticFile(image)}
            style={{ height: 820, width: "auto", filter: `drop-shadow(0 40px 60px ${colors.coralDeep}55)` }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
