import { expect, test, type Page } from "@playwright/test";

type ScreenshotDiff = Readonly<{
  avgRgbDiff: number;
  changedRatio: number;
  maxRgbDiff: number;
}>;

type DiffRegion = Readonly<{
  xEnd: number;
}>;

async function compareSceneScreenshots(page: Page, before: Buffer, after: Buffer, region?: DiffRegion): Promise<ScreenshotDiff> {
  return page.evaluate(
    async ({ afterBase64, beforeBase64, xEnd }) => {
      async function decodeScreenshot(base64: string): Promise<ImageData> {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          throw new Error("2D screenshot context unavailable.");
        }

        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      }

      const first = await decodeScreenshot(beforeBase64);
      const second = await decodeScreenshot(afterBase64);
      const channel = (data: Uint8ClampedArray, offset: number) => data[offset] ?? 0;
      let diffTotal = 0;
      let maxRgbDiff = 0;
      let changedSamples = 0;
      let sampleCount = 0;

      for (let y = 80; y < first.height - 20; y += 4) {
        for (let x = 0; x < Math.min(xEnd, first.width); x += 4) {
          const offset = (y * first.width + x) * 4;
          const rgbDiff =
            Math.abs(channel(first.data, offset) - channel(second.data, offset)) +
            Math.abs(channel(first.data, offset + 1) - channel(second.data, offset + 1)) +
            Math.abs(channel(first.data, offset + 2) - channel(second.data, offset + 2));
          diffTotal += rgbDiff;
          maxRgbDiff = Math.max(maxRgbDiff, rgbDiff);
          if (rgbDiff > 24) {
            changedSamples += 1;
          }
          sampleCount += 1;
        }
      }

      return {
        avgRgbDiff: diffTotal / sampleCount,
        changedRatio: changedSamples / sampleCount,
        maxRgbDiff,
      };
    },
    { afterBase64: after.toString("base64"), beforeBase64: before.toString("base64"), xEnd: region?.xEnd ?? 540 },
  );
}

async function setDebugRange(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).fill(value);
  await page.waitForTimeout(300);
}

test("cards open into an immersive scene and return with Escape and browser Back", async ({ page }) => {
  test.setTimeout(45_000);

  await page.goto("/");

  await expect(page.getByRole("button", { name: "Enter Sol immersive scene" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Terra immersive scene" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Luna immersive scene" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open SofianeBel on GitHub" })).toHaveAttribute("href", "https://github.com/SofianeBel");
  await expect(page.getByText("Systema Solera is not affiliated with OpenAI.")).toBeVisible();
  await expect(page.getByText("Flagship model for ambitious agentic work")).toBeVisible();
  await expect(page.getByText("$5.00")).toBeVisible();
  await expect(page.getByText("$0.50")).toBeVisible();
  await expect(page.getByText("$30.00")).toBeVisible();

  await page.getByRole("button", { name: "Enter Terra immersive scene" }).click();
  await expect(page.getByRole("button", { name: "Return to model grid" })).toBeFocused();
  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeVisible();
  await expect(page.locator(".scene-view canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause camera orbit" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Expand Terra scene details, Input $2.50" })).toBeVisible();
  await expect(page.getByText("Drag to orbit")).toBeHidden();

  await page.getByRole("button", { name: "Expand Terra scene details, Input $2.50" }).click();
  await expect(page.getByText("Drag to orbit")).toBeVisible();
  await expect(page.getByText("Scale: fixed scene / camera zoom")).toBeVisible();
  await expect(page.getByText("Diameter")).toBeVisible();
  await expect(page.getByText("149.6M km from Sol")).toBeVisible();
  await expect(page.getByText("Surface area 510.1M km²")).toBeVisible();
  await expect(page.getByText("Distant astres")).toBeVisible();
  await expect(page.getByText("Photosphere area 6.09T km²")).toBeVisible();
  await expect(page.getByText("Surface area 37.9M km²")).toBeVisible();
  await page.mouse.move(760, 420);
  await page.mouse.down();
  await page.mouse.move(900, 380);
  await page.mouse.up();

  await page.getByRole("button", { name: "Collapse Terra scene details, Input $2.50" }).click();
  await expect(page.getByText("Drag to orbit")).toBeHidden();
  await expect(page.getByRole("button", { name: "Expand Terra scene details, Input $2.50" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Enter Terra immersive scene" })).toBeFocused();
  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeHidden();

  await page.getByRole("button", { name: "Enter Sol immersive scene" }).click();
  await page.getByRole("button", { name: "Expand Sol scene details, Input $5.00" }).click();
  await expect(page.getByText("Radiation zone")).toBeVisible();
  await expect(page.getByText("High energy field")).toBeVisible();
  await expect(page.getByText("Stable orbit required")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Enter Luna immersive scene" }).click();
  await expect(page).toHaveURL(/#luna$/);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Enter Luna immersive scene" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Luna immersive scene" })).toBeFocused();
  await expect(page.getByRole("region", { name: "Luna immersive scene" })).toBeHidden();

  await page.goForward();
  await expect(page).toHaveURL(/#luna$/);
  await expect(page.getByRole("region", { name: "Luna immersive scene" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Return to model grid" })).toBeFocused();

  await page.goto("/#terra");
  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeVisible();
  await page.getByRole("button", { name: "Expand Terra scene details, Input $2.50" }).click();
  await expect(page.getByText("Clouds and night lights")).toBeVisible();
});

test("Solera Live disabled fallback preserves the solo grid", async ({ page }) => {
  await page.route("**/api/solera-live/config", (route) =>
    route.fulfill({
      json: {
        enabled: false,
        provider: "mock",
        supportedRegions: ["eu", "us"],
        defaultRegion: "eu",
        room: { targetSize: 8, maxSize: 16, assignmentTtlSeconds: 120 },
        chat: { maxLength: 240, rateLimitCount: 5, rateLimitWindowSeconds: 10 },
        tokenTtlSeconds: 900,
        unavailableReason: "feature_flag_disabled",
      },
    }),
  );
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Solera Live unavailable" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Enter Sol immersive scene" })).toBeVisible();
  await page.getByRole("button", { name: "Enter Luna immersive scene" }).click();
  await expect(page.getByRole("region", { name: "Luna immersive scene" })).toBeVisible();
});

test("Solera Live opt-in joins a mock room, sends chat, pings, and reports", async ({ page }) => {
  const config = {
    enabled: true,
    provider: "mock",
    supportedRegions: ["eu", "us"],
    defaultRegion: "eu",
    room: { targetSize: 8, maxSize: 16, assignmentTtlSeconds: 120 },
    chat: { maxLength: 240, rateLimitCount: 5, rateLimitWindowSeconds: 10 },
    tokenTtlSeconds: 900,
  };
  const assignment = {
    region: "eu",
    roomId: "solera-eu-001",
    occupancyEstimate: 1,
    channels: {
      presence: "solera-live:eu:solera-eu-001:presence",
      chat: "solera-live:eu:solera-eu-001:chat",
      pings: "solera-live:eu:solera-eu-001:pings",
      occupancy: "solera-live:eu:solera-eu-001:occupancy",
    },
    expiresAt: "2026-06-30T12:02:00.000Z",
  };

  await page.route("**/api/solera-live/config", (route) => route.fulfill({ json: config }));
  await page.route("**/api/solera-live/rooms/assign", (route) => route.fulfill({ json: assignment }));
  await page.route("**/api/solera-live/report", (route) => route.fulfill({ json: { ok: true, reportId: "report-1", storedIn: "memory" } }));
  await page.goto("/");

  await page.getByLabel("Name").fill("Aster");
  await page.getByLabel("Region").selectOption("eu");
  await page.getByRole("button", { name: "Join Solera Live" }).click();

  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await expect(page.getByText("EU")).toBeVisible();
  await expect(page.getByText("1/16")).toBeVisible();

  await page.getByRole("button", { name: "Toggle Solera Live chat" }).click();
  await page.getByLabel("Solera Live message").fill("https://example.com");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Links are not available in public chat.")).toBeVisible();

  await page.getByLabel("Solera Live message").fill("d u m b a s s");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("That message is not safe for public chat.")).toBeVisible();

  await page.getByLabel("Solera Live message").fill("Hello Solera");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Hello Solera")).toBeVisible();
  await page.getByRole("button", { name: "Report" }).click();
  await expect(page.getByText("Report acknowledged.")).toBeVisible();

  await page.getByRole("button", { name: "Ping Sol" }).click();
  await expect(page.getByText("Ping from Aster near Sol")).toBeVisible();

  await page.getByRole("button", { name: "Enter Terra immersive scene" }).click();
  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ping Terra" })).toBeEnabled();
  await page.getByRole("button", { name: "Ping Terra" }).click();
  await expect(page.getByText("Ping from Aster near Terra")).toBeVisible();
  await page.getByLabel("Solera Live message").fill("Still live on Terra");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Still live on Terra")).toBeVisible();
});

test("camera rotation toggle pauses camera orbit without freezing scene motion", async ({ page }) => {
  await page.goto("/#terra");

  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeVisible();
  await expect(page.locator(".scene-view canvas")).toBeVisible();

  await page.getByRole("button", { name: "Pause camera orbit" }).click();
  await expect(page.getByRole("button", { name: "Resume camera orbit" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(500);

  const before = await page.locator(".scene-view").screenshot();
  await page.waitForTimeout(1200);
  const after = await page.locator(".scene-view").screenshot();
  const diff = await compareSceneScreenshots(page, before, after, { xEnd: 900 });

  expect(diff.avgRgbDiff).toBeGreaterThan(0.2);
  expect(diff.changedRatio).toBeGreaterThan(0.002);
});

test("debug controls expose live scene tuning and reset to defaults", async ({ page }) => {
  await page.goto("/#terra");

  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeVisible();
  await page.getByRole("button", { name: "Open debug controls" }).click();
  await expect(page.getByRole("group", { name: "Debug scene parameters" })).toBeVisible();

  const sceneScale = page.getByLabel("Scene scale");
  await expect(sceneScale).toHaveValue("1");
  await sceneScale.fill("1.35");
  await expect(sceneScale).toHaveValue("1.35");
  await expect(page.getByText("1.35x")).toBeVisible();

  await page.getByRole("button", { name: "Reset debug controls" }).click();
  await expect(sceneScale).toHaveValue("1");
});

test("debug global motion freezes visible Three scene when set to zero", async ({ page }) => {
  // Given: a live immersive scene and the debug panel set to zero global motion.
  await page.goto("/#terra");
  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeVisible();
  await expect(page.locator(".scene-view canvas")).toBeVisible();
  await page.getByRole("button", { name: "Open debug controls" }).click();
  await page.locator("#debug-motion-scale").fill("0");
  await page.getByRole("button", { name: "Close debug controls" }).click();
  await page.waitForTimeout(1600);

  // When: the rendered scene is sampled twice after motion should be frozen.
  const before = await page.locator(".scene-view").screenshot();
  await page.waitForTimeout(1000);
  const after = await page.locator(".scene-view").screenshot();
  const diff = await compareSceneScreenshots(page, before, after);

  // Then: only negligible browser noise should remain.
  expect(diff.avgRgbDiff).toBeLessThan(1.2);
  expect(diff.changedRatio).toBeLessThan(0.012);
});

test("debug sliders visibly change shader light and orbit opacity", async ({ page }) => {
  await page.goto("/#terra");
  await expect(page.getByRole("region", { name: "Terra immersive scene" })).toBeVisible();
  await expect(page.locator(".scene-view canvas")).toBeVisible();
  await page.getByRole("button", { name: "Open debug controls" }).click();
  await setDebugRange(page, "#debug-motion-scale", "0");
  const sceneBox = await page.locator(".scene-view").boundingBox();
  expect(sceneBox).not.toBeNull();

  const beforeLight = await page.locator(".scene-view").screenshot();
  await setDebugRange(page, "#debug-light-intensity", "2.4");
  const afterLight = await page.locator(".scene-view").screenshot();
  const lightDiff = await compareSceneScreenshots(page, beforeLight, afterLight, { xEnd: sceneBox?.width ?? 540 });
  expect(lightDiff.avgRgbDiff).toBeGreaterThan(4);
  expect(lightDiff.changedRatio).toBeGreaterThan(0.02);

  await page.getByRole("button", { name: "Reset debug controls" }).click();
  await setDebugRange(page, "#debug-motion-scale", "0");
  const beforeOrbit = await page.locator(".scene-view").screenshot();
  await setDebugRange(page, "#debug-orbit-opacity", "2");
  const afterOrbit = await page.locator(".scene-view").screenshot();
  const orbitDiff = await compareSceneScreenshots(page, beforeOrbit, afterOrbit, { xEnd: sceneBox?.width ?? 540 });
  expect(orbitDiff.avgRgbDiff).toBeGreaterThan(2);
  expect(orbitDiff.changedRatio).toBeGreaterThan(0.01);
});
