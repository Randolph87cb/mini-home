import { Image as KonvaImage, Rect, Text } from "react-konva";
import { getRenderedSize } from "../scene/sceneMath";

export function SceneNode({
  item,
  image,
  debugVisible,
  editMode,
  isSelected,
  onInteract,
  onPropDragEnd,
  onLayoutDragEnd,
}) {
  if (!image) {
    return null;
  }

  const size = getRenderedSize(item, image);
  const draggable = item.draggable || (editMode && item.layoutEditable);
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
        onClick={() => onInteract(item)}
        onTap={() => onInteract(item)}
        onDragEnd={(event) => {
          if (!draggable) {
            return;
          }

          if (item.kind === "prop") {
            onPropDragEnd(item, event);
            return;
          }

          onLayoutDragEnd(item, event);
        }}
      />
      {debugVisible || isSelected ? (
        <>
          <Rect
            x={x}
            y={y}
            width={size.width}
            height={size.height}
            stroke={isSelected ? "rgba(160, 108, 87, 0.95)" : "rgba(203, 120, 104, 0.75)"}
            dash={[6, 4]}
            listening={false}
          />
          {debugVisible ? (
            <Text
              x={x}
              y={y - 18}
              text={item.id}
              fontSize={11}
              fill="#6b5149"
              padding={4}
              listening={false}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
