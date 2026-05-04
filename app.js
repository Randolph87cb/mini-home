const manifestUrl = "./assets/scene-manifest-v1.json";

const sceneElement = document.querySelector("#scene");
const noteTitleElement = document.querySelector("#note-title");
const noteBodyElement = document.querySelector("#note-body");
const statusLineElement = document.querySelector("#status-line");
const resetSceneButton = document.querySelector("#reset-scene");
const toggleTvButton = document.querySelector("#toggle-tv");
const toggleDebugButton = document.querySelector("#toggle-debug");
const letterOverlayElement = document.querySelector("#letter-overlay");
const closeLetterButton = document.querySelector("#close-letter");
const letterOpenImageElement = document.querySelector("#letter-open-image");
const letterBodyElement = document.querySelector("#letter-body");
const validationTitleElement = document.querySelector("#validation-title");
const validationBadgeElement = document.querySelector("#validation-badge");
const validationListElement = document.querySelector("#validation-list");

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

const sceneState = {
  currentMode: "idle",
  tvOn: false,
  drag: null,
  pullupFrameIndex: 0,
  pullupTimer: null,
  propPositions: {},
  debugVisible: new URLSearchParams(window.location.search).get("debug") === "1",
};

let sceneManifest = null;

async function init() {
  sceneManifest = await loadManifest();
  primePropPositions();
  renderScene();
  attachEvents();
}

async function loadManifest() {
  const response = await fetch(manifestUrl);

  if (!response.ok) {
    throw new Error(`Failed to load scene manifest: ${response.status}`);
  }

  return response.json();
}

function primePropPositions() {
  sceneManifest.props.forEach((item) => {
    sceneState.propPositions[item.id] = { x: item.x, y: item.y };
  });
}

function attachEvents() {
  resetSceneButton.addEventListener("click", () => {
    closeLetterOverlay();
    setSceneMode("idle");
    renderScene();
  });

  toggleTvButton.addEventListener("click", () => {
    closeLetterOverlay();
    setSceneMode("tv");
    sceneState.tvOn = !sceneState.tvOn;
    renderScene();
  });

  closeLetterButton.addEventListener("click", closeLetterOverlay);
  letterOverlayElement.addEventListener("click", (event) => {
    if (event.target === letterOverlayElement) {
      closeLetterOverlay();
    }
  });

  toggleDebugButton.addEventListener("click", () => {
    sceneState.debugVisible = !sceneState.debugVisible;
    renderScene();
  });
}

function setSceneMode(mode) {
  clearPullupTimer();
  sceneState.currentMode = mode;

  if (mode !== "tv") {
    sceneState.tvOn = false;
  }

  if (mode === "pullup") {
    startPullupLoop();
  }

  updateCopy();
}

function updateCopy() {
  const copy = noteCopy[sceneState.currentMode] ?? noteCopy.idle;
  noteTitleElement.textContent = copy.title;
  noteBodyElement.textContent = copy.body;
  statusLineElement.textContent = copy.status;
}

function renderScene() {
  const stage = sceneManifest.stage;
  sceneElement.innerHTML = "";
  sceneElement.style.setProperty("--scene-width", stage.width);
  sceneElement.style.setProperty("--scene-height", stage.height);
  sceneElement.classList.toggle("is-debug", sceneState.debugVisible);
  toggleDebugButton.textContent = sceneState.debugVisible ? "隐藏校验" : "显示校验";

  const layers = [];
  layers.push(createImageLayer(sceneManifest.background, "item-background", 0));

  sceneManifest.furniture.forEach((item) => {
    layers.push(createImageLayer(item, `item-${item.id}`, item.z));
  });

  const tvStateAsset = sceneManifest.states.find((item) =>
    item.id === (sceneState.tvOn ? "tv-screen-on" : "tv-screen-off")
  );
  layers.push(createImageLayer(tvStateAsset, `item-tv-screen ${sceneState.tvOn ? "is-on" : ""}`, tvStateAsset.z));

  const letterClosedAsset = sceneManifest.states.find((item) => item.id === "letter-closed");
  layers.push(createImageLayer(letterClosedAsset, "item-letter-closed is-interactive", letterClosedAsset.z, {
    onClick: () => {
      setSceneMode("letters");
      openLetterOverlay();
      renderScene();
    },
  }));

  sceneManifest.props.forEach((item) => {
    const position = sceneState.propPositions[item.id];
    layers.push(
      createImageLayer(
        { ...item, x: position.x, y: position.y },
        `item-${item.id} is-draggable`,
        item.z,
        {
          draggable: true,
        }
      )
    );
  });

  layers.push(createAvatarLayer());

  layers
    .sort((left, right) => left.dataset.z - right.dataset.z)
    .forEach((layer) => sceneElement.appendChild(layer));

  window.requestAnimationFrame(validateSceneLayout);
}

function createAvatarLayer() {
  if (sceneState.currentMode === "pullup") {
    const frameAsset =
      sceneManifest.avatars.find(
        (item) => item.id === (sceneState.pullupFrameIndex === 0 ? "avatar-pullup-01" : "avatar-pullup-02")
      ) ?? sceneManifest.avatars.find((item) => item.id === "avatar-pullup-01");

    return createImageLayer(frameAsset, "item-avatar item-avatar-pullup", frameAsset.z);
  }

  const avatarIdByMode = {
    idle: "avatar-sit-together",
    tv: "avatar-watch-tv",
    letters: "avatar-read-letter",
  };

  const avatarAsset = sceneManifest.avatars.find((item) => item.id === avatarIdByMode[sceneState.currentMode]);
  return createImageLayer(avatarAsset, `item-avatar item-avatar-${sceneState.currentMode}`, avatarAsset.z);
}

function createImageLayer(item, extraClassName, zIndex, options = {}) {
  const needsButton = item.interactive || options.onClick;
  const wrapper = document.createElement(needsButton ? "button" : "div");
  if (needsButton) {
    wrapper.type = "button";
  }
  wrapper.className = `scene-item ${extraClassName}`.trim();
  wrapper.dataset.id = item.id;
  wrapper.dataset.z = String(zIndex ?? 0);
  wrapper.style.left = `${item.x ?? 0}px`;
  wrapper.style.top = `${item.y ?? 0}px`;
  wrapper.style.width = `${item.width ?? sceneManifest.stage.width}px`;
  wrapper.style.zIndex = String(zIndex ?? 0);
  wrapper.style.background = "transparent";
  wrapper.style.border = "0";
  wrapper.style.padding = "0";

  if (item.id === sceneManifest.background.id) {
    wrapper.setAttribute("aria-label", "客厅背景");
  } else {
    wrapper.setAttribute("aria-label", item.id);
  }

  const image = document.createElement("img");
  image.src = item.src;
  image.alt = "";
  wrapper.appendChild(image);

  if (item.interactive) {
    wrapper.classList.add("is-interactive");
    wrapper.addEventListener("click", (event) => {
      event.stopPropagation();
      handleInteraction(item.interactionKind);
    });
  }

  if (options.onClick) {
    wrapper.addEventListener("click", (event) => {
      event.stopPropagation();
      options.onClick();
    });
  }

  if (options.draggable) {
    wrapper.addEventListener("pointerdown", (event) => beginDrag(event, item, wrapper));
  }

  return wrapper;
}

function handleInteraction(kind) {
  if (kind === "tv") {
    closeLetterOverlay();
    setSceneMode("tv");
    sceneState.tvOn = true;
    renderScene();
    return;
  }

  if (kind === "pullup-bar") {
    closeLetterOverlay();
    setSceneMode("pullup");
    renderScene();
    return;
  }

  if (kind === "letters") {
    setSceneMode("letters");
    openLetterOverlay();
    renderScene();
  }
}

function openLetterOverlay() {
  const letterAsset = sceneManifest.states.find((item) => item.id === "letter-open");
  letterOpenImageElement.src = letterAsset.src;
  letterOverlayElement.hidden = false;
  letterOverlayElement.setAttribute("aria-hidden", "false");
  letterBodyElement.textContent =
    "今天也想把一些没那么适合一句话说完的心情，安静地放在这里。以后你回来看到这封信，就像回到这个客厅一样。";
}

function closeLetterOverlay() {
  letterOverlayElement.hidden = true;
  letterOverlayElement.setAttribute("aria-hidden", "true");
}

function startPullupLoop() {
  sceneState.pullupFrameIndex = 0;
  sceneState.pullupTimer = window.setInterval(() => {
    sceneState.pullupFrameIndex = sceneState.pullupFrameIndex === 0 ? 1 : 0;
    renderScene();
  }, 420);
}

function clearPullupTimer() {
  if (sceneState.pullupTimer) {
    window.clearInterval(sceneState.pullupTimer);
    sceneState.pullupTimer = null;
  }
}

function beginDrag(event, item, element) {
  event.preventDefault();
  event.stopPropagation();

  const zone = sceneManifest.dragZones.find((entry) => entry.allowed.includes(item.id));
  if (!zone) {
    return;
  }

  const startPosition = sceneState.propPositions[item.id];
  const sceneRect = sceneElement.getBoundingClientRect();
  const scale = getSceneScale();
  const pointerX = (event.clientX - sceneRect.left) / scale;
  const pointerY = (event.clientY - sceneRect.top) / scale;
  sceneState.drag = {
    itemId: item.id,
    zone,
    element,
    offsetX: pointerX - startPosition.x,
    offsetY: pointerY - startPosition.y,
  };

  element.classList.add("is-dragging");
  element.setPointerCapture(event.pointerId);
  element.addEventListener("pointermove", handleDragMove);
  element.addEventListener("pointerup", endDrag);
  element.addEventListener("pointercancel", endDrag);
}

function handleDragMove(event) {
  if (!sceneState.drag) {
    return;
  }

  const gridSize = sceneManifest.stage.gridSize;
  const zone = sceneState.drag.zone;
  const draggedItem = sceneManifest.props.find((item) => item.id === sceneState.drag.itemId);
  const dragElement = sceneState.drag.element;
  const dragHeight = dragElement.getBoundingClientRect().height / getSceneScale();
  const sceneRect = sceneElement.getBoundingClientRect();
  const scale = getSceneScale();
  const pointerX = (event.clientX - sceneRect.left) / scale;
  const pointerY = (event.clientY - sceneRect.top) / scale;

  let nextX = pointerX - sceneState.drag.offsetX;
  let nextY = pointerY - sceneState.drag.offsetY;

  nextX = Math.max(zone.x, Math.min(zone.x + zone.width - draggedItem.width, nextX));
  nextY = Math.max(zone.y, Math.min(zone.y + zone.height - dragHeight, nextY));

  sceneState.propPositions[draggedItem.id] = {
    x: snapToGrid(nextX, gridSize, zone.x),
    y: snapToGrid(nextY, gridSize, zone.y),
  };

  dragElement.style.left = `${sceneState.propPositions[draggedItem.id].x}px`;
  dragElement.style.top = `${sceneState.propPositions[draggedItem.id].y}px`;
}

function endDrag(event) {
  const currentTarget = event.currentTarget;
  currentTarget.classList.remove("is-dragging");
  currentTarget.releasePointerCapture(event.pointerId);
  currentTarget.removeEventListener("pointermove", handleDragMove);
  currentTarget.removeEventListener("pointerup", endDrag);
  currentTarget.removeEventListener("pointercancel", endDrag);
  sceneState.drag = null;
  renderScene();
}

function snapToGrid(value, gridSize, zoneOrigin) {
  const relative = value - zoneOrigin;
  return zoneOrigin + Math.round(relative / gridSize) * gridSize;
}

function getSceneScale() {
  return sceneElement.clientWidth / sceneManifest.stage.width;
}

function validateSceneLayout() {
  const sceneRect = sceneElement.getBoundingClientRect();
  const activeAvatarId =
    sceneState.currentMode === "tv"
      ? "avatar-watch-tv"
      : sceneState.currentMode === "letters"
        ? "avatar-read-letter"
        : sceneState.currentMode === "pullup"
          ? `avatar-pullup-0${sceneState.pullupFrameIndex === 0 ? 1 : 2}`
          : "avatar-sit-together";

  const checks = [
    validateVisible("tv-body", 0.95, "电视必须完整出现在画面里。"),
    validateVisible("sofa-main", 0.9, "沙发必须大部分可见。"),
    validateVisible("coffee-table", 0.85, "茶几必须大部分可见。"),
    validateVisible("letter-board", 0.9, "信件板必须完整出现在上半区。"),
    validateVisible("pullup-bar", 0.88, "单杠必须大部分可见。"),
    validateVisible(activeAvatarId, 0.72, "当前角色状态图被裁掉过多。"),
    validateRange("tv-body", "centerX", 0, sceneRect.width * 0.42, "电视没有留在左侧区域。"),
    validateRange("letter-board", "centerX", sceneRect.width * 0.55, sceneRect.width, "信件板没有留在右上区域。"),
    validateRange("letter-board", "top", 0, sceneRect.height * 0.28, "信件板没有挂在上半区。"),
    validateRange("pullup-bar", "centerX", sceneRect.width * 0.72, sceneRect.width, "单杠没有留在右侧区域。"),
    validateNoHeavyOverlap("pullup-bar", "letter-board", 0.12, "单杠和信件板重叠太多，点击会互相干扰。"),
    validateContainedIn("snack-bag", "coffee-table", 0.45, "零食已经偏离茶几有效区域。"),
    validateContainedIn("water-cup", "coffee-table", 0.45, "水杯已经偏离茶几有效区域。"),
  ];

  renderValidationResults(checks);
}

function validateVisible(id, minRatio, failMessage) {
  const targetRect = getSceneItemRect(id);
  if (!targetRect) {
    return failCheck(`${id} 缺失。`);
  }

  const ratio = visibleRatioWithinScene(targetRect);
  if (ratio >= minRatio) {
    return passCheck(`${id} 可见比例 ${Math.round(ratio * 100)}%。`);
  }

  return failCheck(failMessage);
}

function validateRange(id, metric, min, max, failMessage) {
  const targetRect = getSceneItemRect(id);
  if (!targetRect) {
    return failCheck(`${id} 缺失。`);
  }

  const metrics = {
    left: targetRect.left,
    right: targetRect.right,
    top: targetRect.top,
    bottom: targetRect.bottom,
    centerX: targetRect.left + targetRect.width / 2,
    centerY: targetRect.top + targetRect.height / 2,
  };

  const value = metrics[metric];
  if (value >= min && value <= max) {
    return passCheck(`${id} 的 ${metric} 在预期范围内。`);
  }

  return failCheck(failMessage);
}

function validateNoHeavyOverlap(primaryId, secondaryId, maxRatio, failMessage) {
  const primaryRect = getSceneItemRect(primaryId);
  const secondaryRect = getSceneItemRect(secondaryId);
  if (!primaryRect || !secondaryRect) {
    return failCheck(`${primaryId} 或 ${secondaryId} 缺失。`);
  }

  const overlapArea = intersectionArea(primaryRect, secondaryRect);
  const overlapRatio = overlapArea / Math.max(1, primaryRect.width * primaryRect.height);
  if (overlapRatio <= maxRatio) {
    return passCheck(`${primaryId} 与 ${secondaryId} 没有明显互相遮挡。`);
  }

  return failCheck(failMessage);
}

function validateContainedIn(itemId, containerId, minRatio, failMessage) {
  const itemRect = getSceneItemRect(itemId);
  const containerRect = getSceneItemRect(containerId);
  if (!itemRect || !containerRect) {
    return failCheck(`${itemId} 或 ${containerId} 缺失。`);
  }

  const containmentRatio = intersectionArea(itemRect, containerRect) / Math.max(1, itemRect.width * itemRect.height);
  if (containmentRatio >= minRatio) {
    return passCheck(`${itemId} 仍在 ${containerId} 的有效范围内。`);
  }

  return failCheck(failMessage);
}

function visibleRatioWithinScene(targetRect) {
  const sceneRect = sceneElement.getBoundingClientRect();
  return intersectionArea(targetRect, sceneRect) / Math.max(1, targetRect.width * targetRect.height);
}

function intersectionArea(leftRect, rightRect) {
  const width = Math.max(0, Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left));
  const height = Math.max(0, Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top));
  return width * height;
}

function getSceneItemRect(id) {
  const element = sceneElement.querySelector(`[data-id="${id}"]`);
  return element?.getBoundingClientRect() ?? null;
}

function renderValidationResults(checks) {
  const failures = checks.filter((item) => item.level === "fail");
  validationListElement.innerHTML = "";

  checks.forEach((check) => {
    const item = document.createElement("li");
    item.className = `validation-item-${check.level}`;
    item.textContent = check.message;
    validationListElement.appendChild(item);
  });

  validationBadgeElement.classList.remove("is-pass", "is-warn", "is-fail");

  if (failures.length > 0) {
    validationTitleElement.textContent = "存在布局问题";
    validationBadgeElement.textContent = `${failures.length} 个错误`;
    validationBadgeElement.classList.add("is-fail");
    return;
  }

  validationTitleElement.textContent = "布局通过";
  validationBadgeElement.textContent = "通过";
  validationBadgeElement.classList.add("is-pass");
}

function passCheck(message) {
  return { level: "pass", message };
}

function failCheck(message) {
  return { level: "fail", message };
}

window.addEventListener("beforeunload", clearPullupTimer);

init().catch((error) => {
  console.error(error);
  noteTitleElement.textContent = "加载失败";
  noteBodyElement.textContent = "场景清单没有成功读取。请用本地静态服务器打开这个项目，而不是直接双击 HTML。";
});
