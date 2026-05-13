import { getRenderedSize } from "./sceneMath";

export function buildValidationState({
  manifest,
  propPositions,
  layoutOverrides,
  currentMode,
  pullupFrameIndex,
  assetImages,
  editMode,
}) {
  if (editMode) {
    return {
      title: "编辑中",
      badge: "暂停",
      badgeLevel: "",
      checks: [
        {
          level: "pass",
          message: "布局编辑模式中暂不做严格校验，退出编辑后会按当前摆位重新检查。",
        },
      ],
    };
  }

  const activeAvatarId =
    currentMode === "tv"
      ? "avatar-watch-tv"
      : currentMode === "letters"
        ? "avatar-read-letter"
        : currentMode === "pullup"
          ? `avatar-pullup-0${pullupFrameIndex === 0 ? 1 : 2}`
          : "avatar-sit-together";

  const checks = [
    validateVisible(manifest, assetImages.map, layoutOverrides, "tv-body", 0.95, "电视必须完整出现在画面里。"),
    validateVisible(manifest, assetImages.map, layoutOverrides, "sofa-main", 0.9, "沙发必须大部分可见。"),
    validateVisible(manifest, assetImages.map, layoutOverrides, "coffee-table", 0.85, "茶几必须大部分可见。"),
    validateVisible(
      manifest,
      assetImages.map,
      layoutOverrides,
      "letter-board",
      0.9,
      "信件板必须完整出现在上半区。"
    ),
    validateVisible(manifest, assetImages.map, layoutOverrides, "pullup-bar", 0.88, "单杠必须大部分可见。"),
    validateVisible(
      manifest,
      assetImages.map,
      layoutOverrides,
      activeAvatarId,
      0.72,
      "当前角色状态图被裁掉过多。"
    ),
    validateRange(
      manifest,
      assetImages.map,
      layoutOverrides,
      "tv-body",
      "centerX",
      0,
      manifest.stage.width * 0.42,
      "电视没有留在左侧区域。"
    ),
    validateRange(
      manifest,
      assetImages.map,
      layoutOverrides,
      "letter-board",
      "centerX",
      manifest.stage.width * 0.55,
      manifest.stage.width,
      "信件板没有留在右上区域。"
    ),
    validateRange(
      manifest,
      assetImages.map,
      layoutOverrides,
      "letter-board",
      "top",
      0,
      manifest.stage.height * 0.28,
      "信件板没有挂在上半区。"
    ),
    validateRange(
      manifest,
      assetImages.map,
      layoutOverrides,
      "pullup-bar",
      "centerX",
      manifest.stage.width * 0.72,
      manifest.stage.width,
      "单杠没有留在右侧区域。"
    ),
    validateNoHeavyOverlap(
      manifest,
      assetImages.map,
      layoutOverrides,
      "pullup-bar",
      "letter-board",
      0.12,
      "单杠和信件板重叠太多，点击会互相干扰。"
    ),
    validateContainedIn(
      manifest,
      assetImages.map,
      layoutOverrides,
      { ...manifest.props.find((item) => item.id === "snack-bag"), ...propPositions["snack-bag"] },
      "coffee-table",
      0.45,
      "零食已经偏离茶几有效区域。"
    ),
    validateContainedIn(
      manifest,
      assetImages.map,
      layoutOverrides,
      { ...manifest.props.find((item) => item.id === "water-cup"), ...propPositions["water-cup"] },
      "coffee-table",
      0.45,
      "水杯已经偏离茶几有效区域。"
    ),
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

function validateVisible(manifest, imageMap, layoutOverrides, id, minRatio, failMessage) {
  const rect = getItemRect(manifest, imageMap, layoutOverrides, id);
  if (!rect) {
    return failCheck(`${id} 缺失。`);
  }

  const ratio = visibleRatio(rect, manifest.stage);
  if (ratio >= minRatio) {
    return passCheck(`${id} 可见比例 ${Math.round(ratio * 100)}%。`);
  }

  return failCheck(failMessage);
}

function validateRange(manifest, imageMap, layoutOverrides, id, metric, min, max, failMessage) {
  const rect = getItemRect(manifest, imageMap, layoutOverrides, id);
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

function validateNoHeavyOverlap(manifest, imageMap, layoutOverrides, primaryId, secondaryId, maxRatio, failMessage) {
  const primaryRect = getItemRect(manifest, imageMap, layoutOverrides, primaryId);
  const secondaryRect = getItemRect(manifest, imageMap, layoutOverrides, secondaryId);

  if (!primaryRect || !secondaryRect) {
    return failCheck(`${primaryId} 或 ${secondaryId} 缺失。`);
  }

  const overlapRatio =
    rectIntersection(primaryRect, secondaryRect) /
    Math.max(1, primaryRect.width * primaryRect.height);

  if (overlapRatio <= maxRatio) {
    return passCheck(`${primaryId} 与 ${secondaryId} 没有明显互相遮挡。`);
  }

  return failCheck(failMessage);
}

function validateContainedIn(manifest, imageMap, layoutOverrides, dynamicItem, containerId, minRatio, failMessage) {
  const itemRect = getDynamicItemRect(imageMap, dynamicItem);
  const containerRect = getItemRect(manifest, imageMap, layoutOverrides, containerId);

  if (!itemRect || !containerRect) {
    return failCheck(`${dynamicItem.id} 或 ${containerId} 缺失。`);
  }

  const containedRatio =
    rectIntersection(itemRect, containerRect) / Math.max(1, itemRect.width * itemRect.height);

  if (containedRatio >= minRatio) {
    return passCheck(`${dynamicItem.id} 仍在 ${containerId} 的有效范围内。`);
  }

  return failCheck(failMessage);
}

function getItemRect(manifest, imageMap, layoutOverrides, id) {
  const item =
    manifest.furniture.find((entry) => entry.id === id) ||
    manifest.props.find((entry) => entry.id === id) ||
    manifest.states.find((entry) => entry.id === id) ||
    manifest.avatars.find((entry) => entry.id === id) ||
    (manifest.background.id === id ? manifest.background : null);

  if (!item) {
    return null;
  }

  return getDynamicItemRect(imageMap, applyLayoutOverride(item, layoutOverrides, manifest));
}

function applyLayoutOverride(item, layoutOverrides, manifest) {
  const directOverride = layoutOverrides?.[item.id];
  if (directOverride) {
    return {
      ...item,
      x: directOverride.x,
      y: directOverride.y,
    };
  }

  if (item.id === "letter-closed") {
    return offsetFromAnchor(item, "letter-board", layoutOverrides, manifest);
  }

  if (item.id === "tv-screen-off" || item.id === "tv-screen-on") {
    return offsetFromAnchor(item, "tv-body", layoutOverrides, manifest);
  }

  return item;
}

function offsetFromAnchor(item, anchorId, layoutOverrides, manifest) {
  const anchorOverride = layoutOverrides?.[anchorId];
  if (!anchorOverride) {
    return item;
  }

  const anchorItem = manifest.furniture.find((entry) => entry.id === anchorId);
  if (!anchorItem) {
    return item;
  }

  return {
    ...item,
    x: item.x + (anchorOverride.x - anchorItem.x),
    y: item.y + (anchorOverride.y - anchorItem.y),
  };
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
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)
  );
  return width * height;
}

function passCheck(message) {
  return { level: "pass", message };
}

function failCheck(message) {
  return { level: "fail", message };
}
