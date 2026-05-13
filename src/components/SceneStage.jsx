import { Layer, Stage } from "react-konva";
import { DebugGrid } from "./DebugGrid";
import { SceneNode } from "./SceneNode";

export function SceneStage({
  manifest,
  stageScale,
  sortedSceneItems,
  assetImageMap,
  debugVisible,
  onInteract,
  onPropDragEnd,
}) {
  if (!manifest) {
    return <div className="loading-copy">正在加载场景资源…</div>;
  }

  return (
    <Stage
      width={manifest.stage.width}
      height={manifest.stage.height}
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
            onInteract={onInteract}
            onPropDragEnd={onPropDragEnd}
          />
        ))}
      </Layer>
    </Stage>
  );
}
