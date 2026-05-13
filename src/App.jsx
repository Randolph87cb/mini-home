import { useEffect, useMemo, useRef, useState } from "react";
import { LetterOverlay } from "./components/LetterOverlay";
import { SceneStage } from "./components/SceneStage";
import { SidePanel } from "./components/SidePanel";
import { useAssetImages } from "./hooks/useAssetImages";
import { usePersistentHomeData } from "./hooks/usePersistentHomeData";
import {
  createEmptyLetterDraft,
  createEntryId,
  QUICK_NOTE_TARGETS,
  sortLettersByUpdatedAt,
} from "./homeData";
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
  const [frameWidth, setFrameWidth] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteAuthorId, setNoteAuthorId] = useState("you");
  const [activeLetterId, setActiveLetterId] = useState(null);
  const [isCreatingLetter, setIsCreatingLetter] = useState(false);
  const [letterDraft, setLetterDraft] = useState(createEmptyLetterDraft());
  const sceneFrameRef = useRef(null);
  const { homeData, setHomeData, resetHomeData } = usePersistentHomeData(manifest);

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
  const propPositions = homeData?.propPositions ?? {};
  const stageScale = manifest && frameWidth ? frameWidth / manifest.stage.width : 1;
  const currentCopy = noteCopy[currentMode] ?? noteCopy.idle;
  const activeQuickNoteConfig = QUICK_NOTE_TARGETS[currentMode] ?? null;
  const quickNotes = activeQuickNoteConfig
    ? homeData?.shortNotesByTarget?.[activeQuickNoteConfig.targetId] ?? []
    : [];
  const sortedLetters = useMemo(() => sortLettersByUpdatedAt(homeData?.letters ?? []), [homeData]);
  const latestLetter = sortedLetters[0] ?? null;
  const totalNoteCount = useMemo(() => {
    return Object.values(homeData?.shortNotesByTarget ?? {}).reduce((count, notes) => count + notes.length, 0);
  }, [homeData]);

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
    setCurrentMode("idle");
    setTvOn(false);
    setLetterOpen(false);
    setPullupFrameIndex(0);
  };

  const handleToggleTv = () => {
    setLetterOpen(false);
    setCurrentMode("tv");
    setTvOn((value) => !value);
  };

  const handlePropDragEnd = (item, event) => {
    if (!manifest || !homeData) {
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

    setHomeData((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      propPositions: {
        ...current.propPositions,
        [item.id]: clamped,
      },
    }));
  };

  const handleOpenLetters = () => {
    setCurrentMode("letters");
    setTvOn(false);
    setLetterOpen(true);
  };

  const handleSaveNote = () => {
    if (!activeQuickNoteConfig || !homeData) {
      return;
    }

    const body = noteDraft.trim();
    if (!body) {
      return;
    }

    const nextNote = {
      id: createEntryId("note"),
      authorId: noteAuthorId,
      body,
      createdAt: new Date().toISOString(),
    };

    setHomeData((current) => ({
      ...current,
      updatedAt: nextNote.createdAt,
      shortNotesByTarget: {
        ...current.shortNotesByTarget,
        [activeQuickNoteConfig.targetId]: [nextNote, ...(current.shortNotesByTarget[activeQuickNoteConfig.targetId] ?? [])].slice(0, 8),
      },
    }));
    setNoteDraft("");
  };

  const handleRemoveNote = (noteId) => {
    if (!activeQuickNoteConfig || !homeData) {
      return;
    }

    setHomeData((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      shortNotesByTarget: {
        ...current.shortNotesByTarget,
        [activeQuickNoteConfig.targetId]: (current.shortNotesByTarget[activeQuickNoteConfig.targetId] ?? []).filter((item) => item.id !== noteId),
      },
    }));
  };

  const handleCreateLetter = () => {
    setIsCreatingLetter(true);
    setActiveLetterId(null);
    setLetterDraft(createEmptyLetterDraft(letterDraft.authorId));
  };

  const handleSaveLetter = () => {
    if (!homeData) {
      return;
    }

    const title = letterDraft.title.trim();
    const body = letterDraft.body.trim();
    if (!title || !body) {
      return;
    }

    const now = new Date().toISOString();

    if (activeLetterId && !isCreatingLetter) {
      setHomeData((current) => ({
        ...current,
        updatedAt: now,
        letters: current.letters.map((item) =>
          item.id === activeLetterId
            ? {
                ...item,
                title,
                body,
                authorId: letterDraft.authorId,
                updatedAt: now,
              }
            : item
        ),
      }));
      return;
    }

    const nextLetterId = createEntryId("letter");
    setIsCreatingLetter(false);
    setHomeData((current) => ({
      ...current,
      updatedAt: now,
      letters: [
        {
          id: nextLetterId,
          title,
          body,
          authorId: letterDraft.authorId,
          createdAt: now,
          updatedAt: now,
        },
        ...current.letters,
      ],
    }));
    setActiveLetterId(nextLetterId);
  };

  const handleDeleteLetter = (letterId) => {
    if (!homeData) {
      return;
    }

    const remaining = homeData.letters.filter((item) => item.id !== letterId);
    setHomeData((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      letters: remaining,
    }));

    if (activeLetterId === letterId) {
      const nextLetter = sortLettersByUpdatedAt(remaining)[0] ?? null;
      setIsCreatingLetter(!nextLetter);
      setActiveLetterId(nextLetter?.id ?? null);
      setLetterDraft(
        nextLetter
          ? {
              title: nextLetter.title,
              body: nextLetter.body,
              authorId: nextLetter.authorId,
            }
          : createEmptyLetterDraft(letterDraft.authorId)
      );
    }
  };

  useEffect(() => {
    if (!letterOpen) {
      return;
    }

    if (sortedLetters.length === 0) {
      setIsCreatingLetter(true);
      setActiveLetterId(null);
      setLetterDraft(createEmptyLetterDraft(letterDraft.authorId));
      return;
    }

    if (isCreatingLetter) {
      return;
    }

    if (!activeLetterId || !sortedLetters.some((item) => item.id === activeLetterId)) {
      const latest = sortedLetters[0];
      setActiveLetterId(latest.id);
      setLetterDraft({
        title: latest.title,
        body: latest.body,
        authorId: latest.authorId,
      });
    }
  }, [activeLetterId, isCreatingLetter, letterDraft.authorId, letterOpen, sortedLetters]);

  const handleSelectLetter = (letterId) => {
    const nextLetter = sortedLetters.find((item) => item.id === letterId);
    if (!nextLetter) {
      return;
    }

    setIsCreatingLetter(false);
    setActiveLetterId(letterId);
    setLetterDraft({
      title: nextLetter.title,
      body: nextLetter.body,
      authorId: nextLetter.authorId,
    });
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
      getHomeData: () => homeData,
      resetHomeData,
    };

    return () => {
      delete window.__miniHomeTestApi;
    };
  }, [currentMode, homeData, letterOpen, pullupFrameIndex, resetHomeData, tvOn]);

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
              letters={sortedLetters}
              activeLetterId={activeLetterId}
              isCreatingLetter={isCreatingLetter}
              letterDraft={letterDraft}
              onClose={() => setLetterOpen(false)}
              onSelectLetter={handleSelectLetter}
              onCreateLetter={handleCreateLetter}
              onDraftChange={setLetterDraft}
              onSaveLetter={handleSaveLetter}
              onDeleteLetter={handleDeleteLetter}
            />
          </div>
        </section>

        <SidePanel
          currentCopy={currentCopy}
          currentMode={currentMode}
          validation={validation}
          debugVisible={debugVisible}
          quickNotes={quickNotes}
          totalNoteCount={totalNoteCount}
          totalLetterCount={sortedLetters.length}
          latestLetter={latestLetter}
          homeUpdatedAt={homeData?.updatedAt ?? null}
          noteDraft={noteDraft}
          noteAuthorId={noteAuthorId}
          onResetScene={resetScene}
          onToggleTv={handleToggleTv}
          onToggleDebug={() => setDebugVisible((value) => !value)}
          onOpenLetters={handleOpenLetters}
          onNoteDraftChange={setNoteDraft}
          onNoteAuthorChange={setNoteAuthorId}
          onSaveNote={handleSaveNote}
          onRemoveNote={handleRemoveNote}
          onResetHomeData={() => {
            resetHomeData();
            resetScene();
            setIsCreatingLetter(false);
            setActiveLetterId(null);
            setLetterDraft(createEmptyLetterDraft());
            setNoteDraft("");
            setNoteAuthorId("you");
          }}
        />
      </main>
    </div>
  );
}

export default App;
