import { Image as KonvaImage, Rect, Text } from "react-konva";
import { getRenderedSize } from "../scene/sceneMath";

export function SceneNode({ item, image, debugVisible, onInteract, onPropDragEnd }) {
  if (!image) {
    return null;
  }

  const size = getRenderedSize(item, image);
  const interactive = item.interactive || item.interactionKind;
  const draggable = item.draggable;
  const x = item.x ?? 0;
  const y = item.y ?? 0;

  return (
    <>
      <KonvaImage
        image={image}
        x={x}
        y={y}
        width={size.width}
        height={size.height}
        draggable={draggable}
        onClick={() => interactive && onInteract(item.interactionKind)}
        onTap={() => interactive && onInteract(item.interactionKind)}
        onDragEnd={(event) => draggable && onPropDragEnd(item, event)}
      />
      {debugVisible ? (
        <>
          <Rect
            x={x}
            y={y}
            width={size.width}
            height={size.height}
            stroke="rgba(203, 120, 104, 0.75)"
            dash={[6, 4]}
            listening={false}
          />
          <Text
            x={x}
            y={y - 18}
            text={item.id}
            fontSize={11}
            fill="#6b5149"
            padding={4}
            listening={false}
          />
        </>
      ) : null}
    </>
  );
}
