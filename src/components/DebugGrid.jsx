import { Line } from "react-konva";

export function DebugGrid({ manifest }) {
  const lines = [];

  for (let x = 0; x <= manifest.stage.width; x += 48) {
    lines.push(
      <Line
        key={`vertical-${x}`}
        points={[x, 0, x, manifest.stage.height]}
        stroke="rgba(214, 158, 147, 0.2)"
        listening={false}
      />
    );
  }

  for (let y = 0; y <= manifest.stage.height; y += 48) {
    lines.push(
      <Line
        key={`horizontal-${y}`}
        points={[0, y, manifest.stage.width, y]}
        stroke="rgba(214, 158, 147, 0.2)"
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}
