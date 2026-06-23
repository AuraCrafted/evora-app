import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { colors } from "../theme";

interface Props {
  image: string;
  eyebrow: string;
  title: string;
  body: string;
  side: "left" | "right";
  accent: string;
}

export const ScreenScene: React.FC<Props> = ({ image, eyebrow, title, body, side, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneSpring = spring({ frame, fps, config: { damping: 16, stiffness: 95 } });
  const phoneX = interpolate(phoneSpring, [0, 1], [side === "right" ? 220 : -220, 0]);
  const phoneRot = interpolate(phoneSpring, [0, 1], [side === "right" ? 12 : -12, side === "right" ? -4 : 4]);
  const float = Math.sin(frame / 24) * 10;

  const eyebrowO = interpolate(frame, [8, 24], [0, 1], { extrapolateRight: "clamp" });
  const eyebrowY = interpolate(frame, [8, 24], [16, 0], { extrapolateRight: "clamp" });

  const titleSpring = spring({ frame: frame - 16, fps, config: { damping: 20, stiffness: 110 } });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const bodyO = interpolate(frame, [40, 58], [0, 1], { extrapolateRight: "clamp" });
  const bodyY = interpolate(frame, [40, 58], [20, 0], { extrapolateRight: "clamp" });

  const textBlock = (
    <div style={{ flex: 1, color: colors.ink, padding: side === "right" ? "0 100px 0 40px" : "0 40px 0 100px" }}>
      <div
        style={{
          opacity: eyebrowO,
          transform: `translateY(${eyebrowY}px)`,
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: accent,
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ width: 50, height: 2, background: accent }} />
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: "Fraunces",
          fontWeight: 600,
          fontSize: 130,
          lineHeight: 0.98,
          letterSpacing: -3,
          opacity: titleSpring,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          opacity: bodyO,
          transform: `translateY(${bodyY}px)`,
          fontFamily: "Inter",
          fontSize: 30,
          color: colors.inkSoft,
          marginTop: 36,
          maxWidth: 620,
          lineHeight: 1.4,
        }}
      >
        {body}
      </div>
    </div>
  );

  const phoneBlock = (
    <div
      style={{
        flex: "0 0 560px",
        display: "flex",
        justifyContent: "center",
        transform: `translateX(${phoneX}px) translateY(${float}px) rotate(${phoneRot}deg)`,
        opacity: phoneSpring,
      }}
    >
      <div style={{ position: "relative" }}>
        <Img
          src={staticFile(image)}
          style={{ height: 880, width: "auto" }}
        />

      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", padding: "0 120px" }}>
      {side === "right" ? (
        <>
          {textBlock}
          {phoneBlock}
        </>
      ) : (
        <>
          {phoneBlock}
          {textBlock}
        </>
      )}
    </AbsoluteFill>
  );
};
