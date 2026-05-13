export const HOME_STORAGE_KEY = "mini-home-home-data-v1";

export const OCCUPANTS = [
  { id: "you", label: "我" },
  { id: "her", label: "她" },
];

export const QUICK_NOTE_TARGETS = {
  tv: {
    targetId: "tv-body",
    title: "电视便签",
    shortTitle: "电视",
    placeholder: "写一句留在电视旁的话，比如今晚一起看什么。",
    empty: "这里还没有便签。先写一句一起看的小约定。",
  },
  pullup: {
    targetId: "pullup-bar",
    title: "单杠便签",
    shortTitle: "单杠",
    placeholder: "写一句留在单杠旁的话，比如今天也辛苦了。",
    empty: "这里还没有便签。先留一句鼓励或调侃。",
  },
};

export const SCENE_ITEM_META = {
  "sofa-main": {
    label: "沙发",
    description: "现在主要是角色坐姿和客厅中心关系的锚点。",
    layoutEditable: true,
  },
  "tv-body": {
    label: "电视",
    description: "点击可以看电视旁的便签，也可以在编辑模式里调整位置。",
    layoutEditable: true,
  },
  "pullup-bar": {
    label: "单杠",
    description: "点击可以看单杠旁的便签，也可以在编辑模式里调整位置。",
    layoutEditable: true,
  },
  "coffee-table": {
    label: "茶几",
    description: "茶几位置会影响零食和水杯的拖拽有效区域。",
    layoutEditable: true,
  },
  "letter-board": {
    label: "信件板",
    description: "点击会打开长信列表与编辑区。",
    layoutEditable: true,
  },
  "snack-bag": {
    label: "零食",
    description: "当前不承载留言，但会跟着茶几一起决定桌面气氛。",
    layoutEditable: true,
  },
  "water-cup": {
    label: "水杯",
    description: "当前不承载留言，但会保留拖动后的位置。",
    layoutEditable: true,
  },
  "avatar-sit-together": {
    label: "双人坐姿",
    description: "默认客厅状态下的角色位置。",
    layoutEditable: true,
  },
  "avatar-watch-tv": {
    label: "看电视坐姿",
    description: "看电视时的角色位置。",
    layoutEditable: true,
  },
  "avatar-read-letter": {
    label: "读信姿态",
    description: "读信时的角色位置。",
    layoutEditable: true,
  },
  "avatar-pullup-01": {
    label: "引体帧 1",
    description: "引体动画的第一帧位置。",
    layoutEditable: true,
  },
  "avatar-pullup-02": {
    label: "引体帧 2",
    description: "引体动画的第二帧位置。",
    layoutEditable: true,
  },
};

export const NOTE_TARGET_BY_ITEM_ID = {
  "tv-body": QUICK_NOTE_TARGETS.tv,
  "pullup-bar": QUICK_NOTE_TARGETS.pullup,
};

const defaultUpdatedAt = "2026-05-13T21:20:00+08:00";

export function createInitialPropPositions(manifest) {
  return Object.fromEntries(manifest.props.map((item) => [item.id, { x: item.x, y: item.y }]));
}

export function createDefaultHomeData(manifest) {
  return {
    version: 1,
    updatedAt: defaultUpdatedAt,
    propPositions: createInitialPropPositions(manifest),
    layoutOverrides: {},
    shortNotesByTarget: {
      "tv-body": [
        {
          id: "seed-tv-note",
          authorId: "her",
          body: "如果你比我早到家，就先把电视打开，我们今晚把这集看完。",
          createdAt: "2026-05-13T20:25:00+08:00",
        },
      ],
      "pullup-bar": [
        {
          id: "seed-pullup-note",
          authorId: "you",
          body: "今天做完引体再回来坐沙发，奖励是桌上的零食。",
          createdAt: "2026-05-13T20:40:00+08:00",
        },
      ],
    },
    letters: [
      {
        id: "seed-letter",
        title: "放在信件板上的第一封信",
        body: "如果你今天回来得很晚，也不用急着说很多话。先坐下来，喝口水，再慢慢把今天告诉我。这个客厅会一直替我们留着灯。",
        authorId: "her",
        createdAt: "2026-05-13T19:55:00+08:00",
        updatedAt: "2026-05-13T19:55:00+08:00",
      },
    ],
  };
}

export function loadHomeData(manifest) {
  if (typeof window === "undefined") {
    return createDefaultHomeData(manifest);
  }

  const fallback = createDefaultHomeData(manifest);
  const raw = window.localStorage.getItem(HOME_STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeHomeData(parsed, manifest, fallback);
  } catch (error) {
    console.error("Failed to parse saved home data", error);
    return fallback;
  }
}

export function saveHomeData(homeData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(homeData));
}

export function formatHomeTime(isoString) {
  if (!isoString) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function getOccupantLabel(authorId) {
  return OCCUPANTS.find((item) => item.id === authorId)?.label ?? "你们";
}

export function getSceneItemMeta(itemId) {
  return SCENE_ITEM_META[itemId] ?? {
    label: itemId,
    description: "这个物件当前还没有额外说明。",
    layoutEditable: false,
  };
}

export function createEmptyLetterDraft(authorId = "you") {
  return {
    title: "",
    body: "",
    authorId,
  };
}

export function sortLettersByUpdatedAt(letters) {
  return [...letters].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function createEntryId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function isSceneItemLayoutEditable(itemId) {
  return Boolean(getSceneItemMeta(itemId).layoutEditable);
}

function normalizeHomeData(rawData, manifest, fallback) {
  const shortNotesByTarget = {
    "tv-body": normalizeNotes(rawData?.shortNotesByTarget?.["tv-body"]),
    "pullup-bar": normalizeNotes(rawData?.shortNotesByTarget?.["pullup-bar"]),
  };

  return {
    version: 1,
    updatedAt: rawData?.updatedAt ?? fallback.updatedAt,
    propPositions: normalizePropPositions(rawData?.propPositions, manifest, fallback.propPositions),
    layoutOverrides: normalizeLayoutOverrides(rawData?.layoutOverrides),
    shortNotesByTarget,
    letters: normalizeLetters(rawData?.letters, fallback.letters),
  };
}

function normalizeLayoutOverrides(layoutOverrides) {
  if (!layoutOverrides || typeof layoutOverrides !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(layoutOverrides).filter(([, value]) => {
      return typeof value?.x === "number" && typeof value?.y === "number";
    })
  );
}

function normalizePropPositions(savedPositions, manifest, fallbackPositions) {
  const next = {};

  for (const item of manifest.props) {
    const saved = savedPositions?.[item.id];
    next[item.id] = {
      x: typeof saved?.x === "number" ? saved.x : fallbackPositions[item.id].x,
      y: typeof saved?.y === "number" ? saved.y : fallbackPositions[item.id].y,
    };
  }

  return next;
}

function normalizeNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes
    .filter((item) => typeof item?.body === "string" && item.body.trim())
    .map((item) => ({
      id: item.id ?? createEntryId("note"),
      authorId: item.authorId === "her" ? "her" : "you",
      body: item.body.trim(),
      createdAt: item.createdAt ?? defaultUpdatedAt,
    }));
}

function normalizeLetters(letters, fallbackLetters) {
  if (!Array.isArray(letters) || letters.length === 0) {
    return fallbackLetters;
  }

  return letters
    .filter((item) => typeof item?.title === "string" && typeof item?.body === "string")
    .map((item) => ({
      id: item.id ?? createEntryId("letter"),
      title: item.title.trim() || "没有标题的信",
      body: item.body.trim(),
      authorId: item.authorId === "her" ? "her" : "you",
      createdAt: item.createdAt ?? defaultUpdatedAt,
      updatedAt: item.updatedAt ?? item.createdAt ?? defaultUpdatedAt,
    }));
}
