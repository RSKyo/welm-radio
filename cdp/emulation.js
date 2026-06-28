import { getClient } from "./client.js";

/**
 * 获取 Emulation 域客户端。
 */
async function getEmulation(targetId, options = {}) {
  const { Emulation } = await getClient(targetId, options);

  return Emulation;
}

/**
 * 应用设备指标。
 */
async function setDeviceMetrics(targetId, metrics, options = {}) {
  const Emulation = await getEmulation(targetId, options);

  await Emulation.setDeviceMetricsOverride(metrics);

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Viewport
 * ----------------------------------------------------------------------------
 */

/**
 * 设置视口。
 */
export async function setViewport(targetId, width, height, options = {}) {
  const deviceScaleFactor = options.deviceScaleFactor ?? 1;

  const mobile = options.mobile;

  return setDeviceMetrics(
    targetId,
    {
      width,
      height,
      deviceScaleFactor,
      mobile,
    },
    options,
  );
}

/**
 * 设置桌面视口。
 */
export async function setDesktopViewport(
  targetId,
  width = 1440,
  height = 900,
  options = {},
) {
  return setViewport(targetId, width, height, {
    ...options,
    mobile: false,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
  });
}

/**
 * 设置移动端视口。
 */
export async function setMobileViewport(
  targetId,
  width = 390,
  height = 844,
  options = {},
) {
  const deviceScaleFactor = options.deviceScaleFactor ?? 3;

  const screenWidth = options.screenWidth ?? width;
  const screenHeight = options.screenHeight ?? height;

  const orientation =
    height >= width
      ? { type: "portraitPrimary", angle: 0 }
      : { type: "landscapePrimary", angle: 90 };

  return setDeviceMetrics(
    targetId,
    {
      width,
      height,
      mobile: true,
      deviceScaleFactor,
      screenWidth,
      screenHeight,
      screenOrientation: options.screenOrientation ?? orientation,
    },
    options,
  );
}

/**
 * ----------------------------------------------------------------------------
 * User Agent
 * ----------------------------------------------------------------------------
 */

/**
 * 设置 User-Agent。
 */
export async function setUserAgent(targetId, userAgent, options = {}) {
  if (typeof userAgent !== "string" || userAgent.trim() === "") {
    throw new Error(`userAgent must be a non-empty string`);
  }

  const Emulation = await getEmulation(targetId, options);

  const params = {
    userAgent,
  };

  if (options.acceptLanguage != null) {
    params.acceptLanguage = options.acceptLanguage;
  }

  if (options.platform != null) {
    params.platform = options.platform;
  }

  if (options.userAgentMetadata != null) {
    params.userAgentMetadata = options.userAgentMetadata;
  }

  await Emulation.setUserAgentOverride(params);

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Touch
 * ----------------------------------------------------------------------------
 */

/**
 * 设置触摸模拟。
 */
async function setTouchEmulation(
  targetId,
  enabled = true,
  maxTouchPoints = 1,
  options = {},
) {
  const Emulation = await getEmulation(targetId, options);

  await Emulation.setTouchEmulationEnabled({
    enabled,
    maxTouchPoints,
  });

  return true;
}

/**
 * ----------------------------------------------------------------------------
 * Presets
 * ----------------------------------------------------------------------------
 */

/**
 * 一键切到桌面端环境。
 */
export async function emulateDesktop(targetId, options = {}) {
  const width = options.width ?? 1440;
  const height = options.height ?? 900;
  const deviceScaleFactor = options.deviceScaleFactor ?? 1;

  await setDesktopViewport(targetId, width, height, {
    ...options,
    deviceScaleFactor,
  });

  await setTouchEmulation(targetId, false, 0, options);

  if (options.userAgent) {
    await setUserAgent(targetId, options.userAgent, {
      ...options,
      platform: options.platform ?? "MacIntel",
    });
  }

  return true;
}

/**
 * 一键切到移动端环境。
 */
export async function emulateMobile(targetId, options = {}) {
  const width = options.width ?? 390;
  const height = options.height ?? 844;
  const deviceScaleFactor = options.deviceScaleFactor ?? 3;
  const maxTouchPoints = options.maxTouchPoints ?? 5;

  await setMobileViewport(targetId, width, height, {
    ...options,
    deviceScaleFactor,
  });

  await setTouchEmulation(targetId, true, maxTouchPoints, options);

  if (options.userAgent) {
    await setUserAgent(targetId, options.userAgent, {
      ...options,
      platform: options.platform ?? "iPhone",
    });
  }

  return true;
}
