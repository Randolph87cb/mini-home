import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const previewStartPort = 4173;

async function main() {
  const manifest = JSON.parse(
    await readFile(path.join(rootDir, "assets", "scene-manifest-v1.json"), "utf8")
  );
  const previewPort = await getAvailablePort(previewStartPort);
  const previewUrl = `http://127.0.0.1:${previewPort}`;

  const previewProcess = startPreviewServer(previewPort);
  let browser;

  try {
    await waitForServer(previewUrl, 20000);
    console.log(`preview ready: ${previewUrl}`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    const consoleErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(previewUrl, { waitUntil: "networkidle" });

    await ensureValidationPass(page, "默认场景");
    console.log("default scene passed");

    await triggerInteraction(page, "tv");
    await expectNoteTitle(page, "电视");
    await ensureValidationPass(page, "电视态");
    console.log("tv interaction passed");

    await page.getByRole("button", { name: "回到沙发" }).click();
    await ensureValidationPass(page, "回到沙发");

    await triggerInteraction(page, "letters");
    await expectNoteTitle(page, "信件板");
    await page.locator(".letter-overlay").waitFor({ state: "visible" });
    await ensureValidationPass(page, "信件态");
    console.log("letters interaction passed");

    await page.getByRole("button", { name: "收起信件" }).click();
    await page.locator(".letter-overlay").waitFor({ state: "hidden" });
    await ensureValidationPass(page, "收起信件后");

    await triggerInteraction(page, "pullup-bar");
    await expectNoteTitle(page, "单杠");
    await page.waitForTimeout(900);
    await ensureValidationPass(page, "引体态");
    console.log("pullup interaction passed");

    await dragProp(page, manifest, "snack-bag", 24, 0);
    await dragProp(page, manifest, "water-cup", -24, 0);
    await ensureValidationPass(page, "拖拽后");
    console.log("drag interaction passed");

    if (consoleErrors.length > 0) {
      throw new Error(
        `验证过程中捕获到控制台错误：\n${consoleErrors.join("\n")}`
      );
    }

    console.log("verify:scene passed");
  } catch (error) {
    if (browser) {
      const page = browser.contexts()[0]?.pages()[0];
      if (page) {
        const failureShot = path.join(os.tmpdir(), "mini-home-verify-scene-failure.png");
        await page.screenshot({ path: failureShot, fullPage: true });
        console.error(`失败截图已保存到 ${failureShot}`);
      }
    }

    throw error;
  } finally {
    await browser?.close();
    await stopProcessTree(previewProcess.pid);
  }
}

function startPreviewServer(port) {
  const command =
    process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`]
      : ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];

  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "pipe",
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  return child;
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Preview server is still booting.
    }

    await delay(250);
  }

  throw new Error(`预览服务没有在 ${timeoutMs}ms 内启动：${url}`);
}

async function getAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const available = await canUsePort(port);
    if (available) {
      return port;
    }
  }

  throw new Error(`没有找到可用的本地预览端口，起始端口 ${startPort}`);
}

function canUsePort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function ensureValidationPass(page, stepName) {
  await page.locator(".validation-card").waitFor({ state: "visible" });
  const badgeText = await page.locator(".validation-badge").textContent();
  const failCount = await page.locator(".validation-list .validation-item-fail").count();

  if (!badgeText?.includes("通过") || failCount > 0) {
    throw new Error(`${stepName} 校验没有通过。badge=${badgeText ?? "空"} failCount=${failCount}`);
  }
}

async function expectNoteTitle(page, title) {
  const heading = page.locator(".note-card h2");
  await heading.waitFor({ state: "visible" });
  const startedAt = Date.now();

  while (Date.now() - startedAt < 3000) {
    const text = (await heading.textContent())?.trim();
    if (text === title) {
      return;
    }

    await page.waitForTimeout(100);
  }

  const text = (await heading.textContent())?.trim();
  throw new Error(`互动标题不对，预期“${title}”，实际“${text ?? "空"}”。`);
}

async function clickSceneItem(page, manifest, itemId) {
  const item = findSceneItem(manifest, itemId);
  if (!item) {
    throw new Error(`找不到场景元素：${itemId}`);
  }

  const point = await getScenePoint(page, manifest, item, 0.5, 0.5);
  await page.mouse.click(point.x, point.y);
}

async function triggerInteraction(page, interactionKind) {
  await page.evaluate((kind) => {
    if (!window.__miniHomeTestApi?.triggerInteraction) {
      throw new Error("页面没有暴露 __miniHomeTestApi.triggerInteraction。");
    }

    window.__miniHomeTestApi.triggerInteraction(kind);
  }, interactionKind);
}

async function dragProp(page, manifest, itemId, deltaX, deltaY) {
  const item = findSceneItem(manifest, itemId);
  if (!item) {
    throw new Error(`找不到拖拽道具：${itemId}`);
  }

  const start = await getScenePoint(page, manifest, item, 0.5, 0.5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}

async function getScenePoint(page, manifest, item, anchorX, anchorY) {
  const canvasBox = await page.locator(".konvajs-content canvas").boundingBox();
  if (!canvasBox) {
    throw new Error("没有找到 Konva canvas。");
  }

  const size = await page.evaluate(
    ({ src, widthHint }) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const width = widthHint ?? image.naturalWidth;
          resolve({ width, height: width * (image.naturalHeight / image.naturalWidth) });
        };
        image.onerror = () => reject(new Error(`无法加载资源 ${src}`));
        image.src = src;
      }),
    { src: item.src, widthHint: item.width ?? null }
  );

  const stageScaleX = canvasBox.width / manifest.stage.width;
  const stageScaleY = canvasBox.height / manifest.stage.height;

  return {
    x: canvasBox.x + (item.x + size.width * anchorX) * stageScaleX,
    y: canvasBox.y + (item.y + size.height * anchorY) * stageScaleY,
  };
}

function findSceneItem(manifest, itemId) {
  return (
    manifest.furniture.find((item) => item.id === itemId) ||
    manifest.props.find((item) => item.id === itemId) ||
    manifest.states.find((item) => item.id === itemId) ||
    manifest.avatars.find((item) => item.id === itemId) ||
    null
  );
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stopProcessTree(pid) {
  if (!pid) {
    return Promise.resolve();
  }

  if (process.platform !== "win32") {
    process.kill(pid, "SIGTERM");
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.once("close", () => resolve());
    killer.once("error", () => resolve());
  });
}

await main();
