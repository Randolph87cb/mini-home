import { Layer, Stage } from "react-konva";
import { DebugGrid } from "./DebugGrid";
import { SceneNode } from "./SceneNode";

export function SceneStage({
  manifest,
  stageWidth,
  stageHeight,
  stageScale,
  sortedSceneItems,
  assetImageMap,
  debugVisible,
  editMode,
  selectedItemId,
  onInteract,
  onPropDragEnd,
  onLayoutDragEnd,
}) {
  if (!manifest) {
    return <div className="loading-copy">正在加载场景资源…</div>;
  }

  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      scaleX={stageScale}
      scaleY={stageScale}
    >
      <Layer>
        {debugVisible ? <DebugGrid manifest={manifest} /> : null}
        {sortedSceneItems.map((item) => (
          <SceneNode
            key={`${item.kind}-${item.id}`}
            item={item}
            image={assetImageMap[item.id]}
            debugVisible={debugVisible}
            editMode={editMode}
            isSelected={selectedItemId === item.id}
            onInteract={onInteract}
            onPropDragEnd={onPropDragEnd}
            onLayoutDragEnd={onLayoutDragEnd}
          />
        ))}
      </Layer>
    </Stage>
  );
}
