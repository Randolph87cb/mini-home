import { useEffect, useMemo, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";

const manifestUrl = "/assets/scene-manifest-v1.json";

const noteCopy = {
  idle: {
    title: "回到客厅",
    body: "先从电视、单杠或信件板开始。桌上的零食和水杯可以拖一拖，看看这个小家慢慢有生活痕迹的样子。",
    status: "你们现在坐在沙发上，她靠着你。",
  },
  tv: {
    title: "电视",
    body: "电视亮起来以后，客厅会更像一天结束后真正待着的地方。这里适合放一个轻一点的节目，也适合留一句一起看的话。",
    status: "你们切到了看电视的状态。",
  },
  pullup: {
    title: "单杠",
    body: "单杠这边更像一个会留下生活状态的角落。点开之后主角会做引体，用很轻的动作让这个房间有一点动起来的感觉。",
    status: "你切到了引体状态，她暂时不在画面里。",
  },
  letters: {
    title: "信件板",
    body: "信件板承接那些不适合一句话说完的内容。展开以后，不像聊天，而像认真留给对方的一封信。",
    status: "你们切到了读信的状态。",
  },
};

function App() {
  const [manifest, setManifest] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [currentMode, setCurrentMode] = useState("idle");
  const [tvOn, setTvOn] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [pullupFrameIndex, setPullupFrameIndex] = useState(0);
  const [propPositions, setPropPositions] = useState({});
  const sceneFrameRef = useRef(null);
  const [frameWidth, setFrameWidth] = useState(0);

  useEffect(() => {
    let disposed = false;

    fetch(manifestUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load scene manifest: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        if (disposed) {
          return;
        }

        setManifest(data);
        setPropPositions(
          Object.fromEntries(data.props.map((item) => [item.id, { x: item.x, y: item.y }]))
        );
      })
      .catch((error) => {
        console.error(error);
        setLoadError("场景清单没有成功读取。请先运行 `npm run dev`。");
      });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!manifest) {
      return undefined;
    }

    const handleResize = () => {
      if (!sceneFrameRef.current) {
        return;
      }

      setFrameWidth(sceneFrameRef.current.clientWidth);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(sceneFrameRef.current);

    return () => observer.disconnect();
  }, [manifest]);

  useEffect(() => {
    if (currentMode !== "pullup") {
      setPullupFrameIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPullupFrameIndex((value) => (value === 0 ? 1 : 0));
    }, 420);

    return () => window.clearInterval(timer);
  }, [currentMode]);

  const stageScale = manifest && frameWidth ? frameWidth / manifest.stage.width : 1;
  const stageHeight = manifest ? Math.round(manifest.stage.height * stageScale) : 720;
  const currentCopy = noteCopy[currentMode] ?? noteCopy.idle;

  const assetImages = useAssetImages(manifest);

  const activeAvatar = useMemo(() => {
    if (!manifest) {
      return null;
    }

    if (currentMode === "pullup") {
      return manifest.avatars.find((item) => item.id === (pullupFrameIndex === 0 ? "avatar-pullup-01" : "avatar-pullup-02"));
    }

    const avatarIdByMode = {
      idle: "avatar-sit-together",
      tv: "avatar-watch-tv",
      letters: "avatar-read-letter",
    };

    return manifest.avatars.find((item) => item.id === avatarIdByMode[currentMode]);
  }, [currentMode, manifest, pullupFrameIndex]);

  const tvState = useMemo(() => {
    if (!manifest) {
      return null;
    }

    return manifest.states.find((item) => item.id === (tvOn ? "tv-screen-on" : "tv-screen-off"));
  }, [manifest, tvOn]);

  const validation = useMemo(() => {
    if (!manifest || !assetImages.ready) {
      return { title: "等待检查", badge: "--", badgeLevel: "", checks: [] };
    }

    return buildValidationState({ manifest, propPositions, currentMode, pullupFrameIndex, assetImages });
  }, [assetImages.map, assetImages.ready, currentMode, manifest, propPositions, pullupFrameIndex]);

  const sortedSceneItems = useMemo(() => {
    if (!manifest || !activeAvatar || !tvState) {
      return [];
    }

    const letterClosed = manifest.states.find((item) => item.id === "letter-closed");

    const items = [
      { ...manifest.background, z: 0, kind: "background" },
      ...manifest.furniture.map((item) => ({ ...item, kind: "furniture" })),
      { ...tvState, kind: "state" },
      { ...letterClosed, kind: "state", interactive: true, interactionKind: "letters" },
      ...manifest.props.map((item) => ({
        ...item,
        kind: "prop",
        x: propPositions[item.id]?.x ?? item.x,
        y: propPositions[item.id]?.y ?? item.y,
      })),
      { ...activeAvatar, kind: "avatar" },
    ];

    return items.sort((left, right) => left.z - right.z);
  }, [activeAvatar, manifest, propPositions, tvState]);

  const handleSceneInteraction = (kind) => {
    if (kind === "tv") {
      setLetterOpen(false);
      setCurrentMode("tv");
      setTvOn(true);
      return;
    }

    if (kind === "pullup-bar") {
      setLetterOpen(false);
      setCurrentMode("pullup");
      setTvOn(false);
      return;
    }

    if (kind === "letters") {
      setCurrentMode("letters");
      setTvOn(false);
      setLetterOpen(true);
    }
  };

  const resetScene = () => {
    if (!manifest) {
      return;
    }

    setCurrentMode("idle");
    setTvOn(false);
    setLetterOpen(false);
    setPullupFrameIndex(0);
    setPropPositions(Object.fromEntries(manifest.props.map((item) => [item.id, { x: item.x, y: item.y }])));
  };

  const handlePropDragEnd = (item, event) => {
    if (!manifest) {
      return;
    }

    const zone = manifest.dragZones.find((entry) => entry.allowed.includes(item.id));
    if (!zone) {
      return;
    }

    const node = event.target;
    const renderedSize = getRenderedSize(item, assetImages.map[item.id]);
    const clamped = clampToZone(
      {
        x: node.x(),
        y: node.y(),
      },
      renderedSize,
      zone,
      manifest.stage.gridSize
    );

    setPropPositions((current) => ({
      ...current,
      [item.id]: clamped,
    }));
  };

  useEffect(() => {
    window.__miniHomeTestApi = {
      triggerInteraction: handleSceneInteraction,
      resetScene,
      getState: () => ({
        currentMode,
        tvOn,
        letterOpen,
        pullupFrameIndex,
      }),
    };

    return () => {
      delete window.__miniHomeTestApi;
    };
  }, [currentMode, letterOpen, pullupFrameIndex, tvOn]);

  if (loadError) {
    return <div className="error-shell">{loadError}</div>;
  }

  return (
    <div className="page-shell">
      <header className="hero-copy">
        <p className="eyebrow">our little room on the web</p>
        <h1>线上小家</h1>
        <p className="intro">一个可以一起回来坐坐、摆一摆桌上的小东西、留下一点话的小客厅。</p>
      </header>

      <main className="app-shell">
        <section className="stage-card" aria-label="客厅主场景">
          <div className="scene-frame" ref={sceneFrameRef}>
            {manifest ? (
              <Stage width={manifest.stage.width} height={manifest.stage.height} scaleX={stageScale} scaleY={stageScale}>
                <Layer>
                  {debugVisible ? <DebugGrid manifest={manifest} /> : null}
                  {sortedSceneItems.map((item) => (
                    <SceneNode
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      image={assetImages.map[item.id]}
                      debugVisible={debugVisible}
                      onInteract={handleSceneInteraction}
                      onPropDragEnd={handlePropDragEnd}
                    />
                  ))}
                </Layer>
              </Stage>
            ) : (
              <div className="loading-copy">正在加载场景资源…</div>
            )}

            {letterOpen && manifest ? (
              <div className="letter-overlay" aria-hidden="false">
                <div className="letter-panel">
                  <button className="overlay-close" type="button" onClick={() => setLetterOpen(false)}>
                    收起信件
                  </button>
                  <img src={manifest.states.find((item) => item.id === "letter-open")?.src} alt="展开的信件" />
                  <div className="letter-copy">
                    <p className="letter-kicker">信件板</p>
                    <h2>留给你慢慢看的话</h2>
                    <p>今天也想把一些没那么适合一句话说完的心情，安静地放在这里。以后你回来看到这封信，就像回到这个客厅一样。</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="side-panel">
          <section className="note-card">
            <p className="card-kicker">当前互动</p>
            <h2>{currentCopy.title}</h2>
            <p>{currentCopy.body}</p>
          </section>

          <section className="control-card">
            <p className="card-kicker">客厅状态</p>
            <p>{currentCopy.status}</p>
            <div className="control-actions">
              <button type="button" onClick={resetScene}>回到沙发</button>
              <button
                type="button"
                onClick={() => {
                  setLetterOpen(false);
                  setCurrentMode("tv");
                  setTvOn((value) => !value);
                }}
              >
                切换电视
              </button>
              <button type="button" onClick={() => setDebugVisible((value) => !value)}>
                {debugVisible ? "隐藏校验" : "显示校验"}
              </button>
            </div>
          </section>

          <section className="validation-card">
            <div className="validation-header">
              <div>
                <p className="card-kicker">场景校验</p>
                <h2>{validation.title}</h2>
              </div>
              <span className={`validation-badge ${validation.badgeLevel}`}>{validation.badge}</span>
            </div>
            <ul className="validation-list">
              {validation.checks.map((check) => (
                <li key={check.message} className={`validation-item-${check.level}`}>
                  {check.message}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}

function SceneNode({ item, image, debugVisible, onInteract, onPropDragEnd }) {
  if (!image) {
    return null;
  }

  const size = getRenderedSize(item, image);
  const interactive = item.interactive || item.interactionKind;
  const draggable = item.draggable;

  return (
    <>
      <KonvaImage
        image={image}
        x={item.x ?? 0}
        y={item.y ?? 0}
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
            x={item.x ?? 0}
            y={item.y ?? 0}
            width={size.width}
            height={size.height}
            stroke="rgba(203, 120, 104, 0.75)"
            dash={[6, 4]}
            listening={false}
          />
          <Text
            x={item.x ?? 0}
            y={(item.y ?? 0) - 18}
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

function DebugGrid({ manifest }) {
  const lines = [];
  for (let x = 0; x <= manifest.stage.width; x += 48) {
    lines.push(<Line key={`vertical-${x}`} points={[x, 0, x, manifest.stage.height]} stroke="rgba(214, 158, 147, 0.2)" listening={false} />);
  }

  for (let y = 0; y <= manifest.stage.height; y += 48) {
    lines.push(<Line key={`horizontal-${y}`} points={[0, y, manifest.stage.width, y]} stroke="rgba(214, 158, 147, 0.2)" listening={false} />);
  }

  return <>{lines}</>;
}

function useAssetImages(manifest) {
  const [map, setMap] = useState({});

  useEffect(() => {
    if (!manifest) {
      return undefined;
    }

    let disposed = false;
    const uniqueItems = [
      manifest.background,
      ...manifest.furniture,
      ...manifest.props,
      ...manifest.states,
      ...manifest.avatars,
    ];

    Promise.all(
      uniqueItems.map(
        (item) =>
          new Promise((resolve, reject) => {
            const image = new window.Image();
            image.crossOrigin = "anonymous";
            image.onload = () => resolve([item.id, image]);
            image.onerror = reject;
            image.src = item.src;
          })
      )
    )
      .then((entries) => {
        if (disposed) {
          return;
        }

        setMap(Object.fromEntries(entries));
      })
      .catch((error) => {
        console.error("Failed to load scene assets", error);
      });

    return () => {
      disposed = true;
    };
  }, [manifest]);

  return { map, ready: Object.keys(map).length > 0 };
}

function getRenderedSize(item, image) {
  if (!image) {
    return { width: item.width ?? 0, height: 0 };
  }

  const width = item.width ?? image.width;
  const height = width * (image.height / image.width);
  return { width, height };
}

function clampToZone(position, size, zone, gridSize) {
  const nextX = Math.max(zone.x, Math.min(zone.x + zone.width - size.width, position.x));
  const nextY = Math.max(zone.y, Math.min(zone.y + zone.height - size.height, position.y));
  return {
    x: zone.x + Math.round((nextX - zone.x) / gridSize) * gridSize,
    y: zone.y + Math.round((nextY - zone.y) / gridSize) * gridSize,
  };
}

function buildValidationState({ manifest, propPositions, currentMode, pullupFrameIndex, assetImages }) {
  const activeAvatarId =
    currentMode === "tv"
      ? "avatar-watch-tv"
      : currentMode === "letters"
        ? "avatar-read-letter"
        : currentMode === "pullup"
          ? `avatar-pullup-0${pullupFrameIndex === 0 ? 1 : 2}`
          : "avatar-sit-together";

  const checks = [
    validateVisible(manifest, assetImages.map, "tv-body", 0.95, "电视必须完整出现在画面里。"),
    validateVisible(manifest, assetImages.map, "sofa-main", 0.9, "沙发必须大部分可见。"),
    validateVisible(manifest, assetImages.map, "coffee-table", 0.85, "茶几必须大部分可见。"),
    validateVisible(manifest, assetImages.map, "letter-board", 0.9, "信件板必须完整出现在上半区。"),
    validateVisible(manifest, assetImages.map, "pullup-bar", 0.88, "单杠必须大部分可见。"),
    validateVisible(manifest, assetImages.map, activeAvatarId, 0.72, "当前角色状态图被裁掉过多。"),
    validateRange(manifest, assetImages.map, "tv-body", "centerX", 0, manifest.stage.width * 0.42, "电视没有留在左侧区域。"),
    validateRange(manifest, assetImages.map, "letter-board", "centerX", manifest.stage.width * 0.55, manifest.stage.width, "信件板没有留在右上区域。"),
    validateRange(manifest, assetImages.map, "letter-board", "top", 0, manifest.stage.height * 0.28, "信件板没有挂在上半区。"),
    validateRange(manifest, assetImages.map, "pullup-bar", "centerX", manifest.stage.width * 0.72, manifest.stage.width, "单杠没有留在右侧区域。"),
    validateNoHeavyOverlap(manifest, assetImages.map, "pullup-bar", "letter-board", 0.12, "单杠和信件板重叠太多，点击会互相干扰。"),
    validateContainedIn(manifest, assetImages.map, { ...manifest.props.find((item) => item.id === "snack-bag"), ...propPositions["snack-bag"] }, "coffee-table", 0.45, "零食已经偏离茶几有效区域。"),
    validateContainedIn(manifest, assetImages.map, { ...manifest.props.find((item) => item.id === "water-cup"), ...propPositions["water-cup"] }, "coffee-table", 0.45, "水杯已经偏离茶几有效区域。"),
  ];

  const failures = checks.filter((item) => item.level === "fail");
  if (failures.length > 0) {
    return {
      title: "存在布局问题",
      badge: `${failures.length} 个错误`,
      badgeLevel: "is-fail",
      checks,
    };
  }

  return {
    title: "布局通过",
    badge: "通过",
    badgeLevel: "is-pass",
    checks,
  };
}

function validateVisible(manifest, imageMap, id, minRatio, failMessage) {
  const rect = getItemRect(manifest, imageMap, id);
  if (!rect) {
    return failCheck(`${id} 缺失。`);
  }

  const ratio = visibleRatio(rect, manifest.stage);
  if (ratio >= minRatio) {
    return passCheck(`${id} 可见比例 ${Math.round(ratio * 100)}%。`);
  }

  return failCheck(failMessage);
}

function validateRange(manifest, imageMap, id, metric, min, max, failMessage) {
  const rect = getItemRect(manifest, imageMap, id);
  if (!rect) {
    return failCheck(`${id} 缺失。`);
  }

  const metrics = {
    left: rect.x,
    right: rect.x + rect.width,
    top: rect.y,
    bottom: rect.y + rect.height,
    centerX: rect.x + rect.width / 2,
    centerY: rect.y + rect.height / 2,
  };

  if (metrics[metric] >= min && metrics[metric] <= max) {
    return passCheck(`${id} 的 ${metric} 在预期范围内。`);
  }

  return failCheck(failMessage);
}

function validateNoHeavyOverlap(manifest, imageMap, primaryId, secondaryId, maxRatio, failMessage) {
  const primaryRect = getItemRect(manifest, imageMap, primaryId);
  const secondaryRect = getItemRect(manifest, imageMap, secondaryId);
  if (!primaryRect || !secondaryRect) {
    return failCheck(`${primaryId} 或 ${secondaryId} 缺失。`);
  }

  const overlapRatio = rectIntersection(primaryRect, secondaryRect) / Math.max(1, primaryRect.width * primaryRect.height);
  if (overlapRatio <= maxRatio) {
    return passCheck(`${primaryId} 与 ${secondaryId} 没有明显互相遮挡。`);
  }

  return failCheck(failMessage);
}

function validateContainedIn(manifest, imageMap, dynamicItem, containerId, minRatio, failMessage) {
  const itemRect = getDynamicItemRect(imageMap, dynamicItem);
  const containerRect = getItemRect(manifest, imageMap, containerId);
  if (!itemRect || !containerRect) {
    return failCheck(`${dynamicItem.id} 或 ${containerId} 缺失。`);
  }

  const containedRatio = rectIntersection(itemRect, containerRect) / Math.max(1, itemRect.width * itemRect.height);
  if (containedRatio >= minRatio) {
    return passCheck(`${dynamicItem.id} 仍在 ${containerId} 的有效范围内。`);
  }

  return failCheck(failMessage);
}

function getItemRect(manifest, imageMap, id) {
  const item =
    manifest.furniture.find((entry) => entry.id === id) ||
    manifest.props.find((entry) => entry.id === id) ||
    manifest.states.find((entry) => entry.id === id) ||
    manifest.avatars.find((entry) => entry.id === id) ||
    (manifest.background.id === id ? manifest.background : null);

  if (!item) {
    return null;
  }

  return getDynamicItemRect(imageMap, item);
}

function getDynamicItemRect(imageMap, item) {
  const image = imageMap[item.id];
  if (!image) {
    return null;
  }

  const size = getRenderedSize(item, image);
  return {
    x: item.x ?? 0,
    y: item.y ?? 0,
    width: size.width,
    height: size.height,
  };
}

function visibleRatio(rect, stage) {
  const stageRect = { x: 0, y: 0, width: stage.width, height: stage.height };
  return rectIntersection(rect, stageRect) / Math.max(1, rect.width * rect.height);
}

function rectIntersection(left, right) {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  return width * height;
}

function passCheck(message) {
  return { level: "pass", message };
}

function failCheck(message) {
  return { level: "fail", message };
}

export default App;
