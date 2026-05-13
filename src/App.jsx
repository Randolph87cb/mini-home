import { useEffect, useMemo, useRef, useState } from "react";
import { LetterOverlay } from "./components/LetterOverlay";
import { SceneStage } from "./components/SceneStage";
import { SidePanel } from "./components/SidePanel";
import { useAssetImages } from "./hooks/useAssetImages";
import { noteCopy } from "./noteCopy";
import { clampToZone, getRenderedSize } from "./scene/sceneMath";
import { buildValidationState } from "./scene/validation";

const manifestUrl = "/assets/scene-manifest-v1.json";

function App() {
  const [manifest, setManifest] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [currentMode, setCurrentMode] = useState("idle");
  const [tvOn, setTvOn] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [pullupFrameIndex, setPullupFrameIndex] = useState(0);
  const [propPositions, setPropPositions] = useState({});
  const [frameWidth, setFrameWidth] = useState(0);
  const sceneFrameRef = useRef(null);

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
        setPropPositions(createInitialPropPositions(data));
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

  const assetImages = useAssetImages(manifest);
  const stageScale = manifest && frameWidth ? frameWidth / manifest.stage.width : 1;
  const currentCopy = noteCopy[currentMode] ?? noteCopy.idle;

  const activeAvatar = useMemo(() => {
    if (!manifest) {
      return null;
    }

    if (currentMode === "pullup") {
      const pullupAvatarId = pullupFrameIndex === 0 ? "avatar-pullup-01" : "avatar-pullup-02";
      return manifest.avatars.find((item) => item.id === pullupAvatarId);
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

  const validation = useMemo(() => {
    if (!manifest || !assetImages.ready) {
      return { title: "等待检查", badge: "--", badgeLevel: "", checks: [] };
    }

    return buildValidationState({
      manifest,
      propPositions,
      currentMode,
      pullupFrameIndex,
      assetImages,
    });
  }, [assetImages, currentMode, manifest, propPositions, pullupFrameIndex]);

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
    setPropPositions(createInitialPropPositions(manifest));
  };

  const handleToggleTv = () => {
    setLetterOpen(false);
    setCurrentMode("tv");
    setTvOn((value) => !value);
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
  }, [currentMode, letterOpen, pullupFrameIndex, tvOn, manifest]);

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
            <SceneStage
              manifest={manifest}
              stageScale={stageScale}
              sortedSceneItems={sortedSceneItems}
              assetImageMap={assetImages.map}
              debugVisible={debugVisible}
              onInteract={handleSceneInteraction}
              onPropDragEnd={handlePropDragEnd}
            />
            <LetterOverlay
              manifest={manifest}
              open={letterOpen}
              onClose={() => setLetterOpen(false)}
            />
          </div>
        </section>

        <SidePanel
          currentCopy={currentCopy}
          validation={validation}
          debugVisible={debugVisible}
          onResetScene={resetScene}
          onToggleTv={handleToggleTv}
          onToggleDebug={() => setDebugVisible((value) => !value)}
        />
      </main>
    </div>
  );
}

function createInitialPropPositions(manifest) {
  return Object.fromEntries(manifest.props.map((item) => [item.id, { x: item.x, y: item.y }]));
}

export default App;
