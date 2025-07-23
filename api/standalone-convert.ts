import { VercelRequest, VercelResponse } from "@vercel/node";

// 时区偏移计算
function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const target = new Date(
      utc.toLocaleString("en-US", { timeZone: timezone })
    );
    return (target.getTime() - utc.getTime()) / 60000;
  } catch (error) {
    return 0;
  }
}

// 时区转换
function convertTimezone(date: Date, fromTz: string, toTz: string): Date {
  try {
    const fromOffset = getTimezoneOffset(fromTz);
    const toOffset = getTimezoneOffset(toTz);
    const offsetDiff = toOffset - fromOffset;
    return new Date(date.getTime() + offsetDiff * 60000);
  } catch (error) {
    return date;
  }
}

// 相对时间
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const absDiff = Math.abs(diffInSeconds);
  const prefix = diffInSeconds < 0 ? "in" : "";
  const suffix = diffInSeconds > 0 ? "ago" : "";

  if (absDiff < 60) return `${prefix} ${absDiff} seconds ${suffix}`.trim();
  if (absDiff < 3600)
    return `${prefix} ${Math.floor(absDiff / 60)} minutes ${suffix}`.trim();
  if (absDiff < 86400)
    return `${prefix} ${Math.floor(absDiff / 3600)} hours ${suffix}`.trim();
  return `${prefix} ${Math.floor(absDiff / 86400)} days ${suffix}`.trim();
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const startTime = Date.now();

  try {
    const params = req.method === "GET" ? req.query : req.body;
    const { timestamp, date, timezone, targetTimezone, format } = params;

    // 验证输入
    if (!timestamp && !date) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Please provide timestamp or date",
        },
      });
    }

    let inputDate: Date;
    let inputTimestamp: number;

    if (timestamp) {
      const ts = parseInt(String(timestamp));
      if (isNaN(ts) || ts < 0) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "Invalid timestamp" },
        });
      }
      inputTimestamp = ts;
      inputDate = new Date(ts * 1000);
    } else {
      inputDate = new Date(String(date));
      if (isNaN(inputDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "Invalid date format" },
        });
      }
      inputTimestamp = Math.floor(inputDate.getTime() / 1000);
    }

    // 时区转换
    if (timezone && targetTimezone) {
      inputDate = convertTimezone(
        inputDate,
        String(timezone),
        String(targetTimezone)
      );
      inputTimestamp = Math.floor(inputDate.getTime() / 1000);
    }

    // 格式化
    const formats: any = {
      iso8601: inputDate.toISOString(),
      utc: inputDate.toUTCString(),
      timestamp: inputTimestamp,
      local: inputDate.toLocaleString(),
      date: inputDate.toLocaleDateString(),
      time: inputDate.toLocaleTimeString(),
      relative: getRelativeTime(inputDate),
    };

    // 自定义格式
    if (format) {
      const fmt = String(format).toLowerCase();
      switch (fmt) {
        case "short":
          formats.custom = inputDate.toLocaleDateString("en-US", {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
          });
          break;
        case "long":
          formats.custom = inputDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          break;
        case "year":
          formats.custom = inputDate.getFullYear().toString();
          break;
        case "month":
          formats.custom = (inputDate.getMonth() + 1).toString();
          break;
        case "day":
          formats.custom = inputDate.getDate().toString();
          break;
        default:
          formats.custom = inputDate.toISOString();
      }
    }

    const result = {
      input: timestamp || date,
      timestamp: inputTimestamp,
      formats,
      ...(timezone || targetTimezone
        ? {
            timezone: {
              original: timezone || "UTC",
              target: targetTimezone || timezone || "UTC",
              offset: targetTimezone
                ? getTimezoneOffset(String(targetTimezone))
                : 0,
            },
          }
        : {}),
    };

    res.status(200).json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        itemCount: 1,
        cacheHit: false,
      },
    });
  } catch (error) {
    console.error("Convert error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Conversion failed" },
    });
  }
}
