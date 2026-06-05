import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generateMockTryOn } from "../lib/tryon-provider.ts";

type Check = {
  label: string;
  run: () => Promise<void>;
};

function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];

  for (const envFile of envFiles) {
    const envPath = resolve(process.cwd(), envFile);

    if (!existsSync(envPath)) {
      continue;
    }

    const envContent = readFileSync(envPath, "utf8");

    for (const line of envContent.split("\n")) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 未配置`);
  }

  return value;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return String(error);
}

async function main() {
  loadLocalEnv();

  function getSupabaseClient() {
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  async function checkReadableTable(tableName: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(error.message);
    }
  }

  const checks: Check[] = [
    {
      label: "✅ Supabase 环境变量正常",
      run: async () => {
        requireEnv("NEXT_PUBLIC_SUPABASE_URL");
        requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      },
    },
    {
      label: "✅ users 表正常",
      run: () => checkReadableTable("users"),
    },
    {
      label: "✅ clothes 表正常",
      run: () => checkReadableTable("clothes"),
    },
    {
      label: "✅ try_on_jobs 表正常",
      run: () => checkReadableTable("try_on_jobs"),
    },
    {
      label: "✅ outfit 表正常",
      run: () => checkReadableTable("outfit"),
    },
    {
      label: "✅ 首页数据读取正常",
      run: async () => {
        const supabase = getSupabaseClient();
        const [
          userResult,
          clothesResult,
          tryOnResult,
          favoriteResult,
          recentTryOnResult,
        ] = await Promise.all([
          supabase
            .from("users")
            .select("id, front_photo_url, avatar_url, height, weight, gender")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("clothes").select("*", { count: "exact", head: true }),
          supabase
            .from("try_on_jobs")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("try_on_jobs")
            .select("*", { count: "exact", head: true })
            .eq("is_favorite", true),
          supabase
            .from("try_on_jobs")
            .select(
              "id, user_photo_url, clothing_image_url, result_image_url, status, created_at",
            )
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        const errors = [
          userResult.error,
          clothesResult.error,
          tryOnResult.error,
          favoriteResult.error,
          recentTryOnResult.error,
        ].filter(Boolean);

        if (errors.length > 0) {
          throw new Error(errors.map((error) => error?.message).join("; "));
        }
      },
    },
    {
      label: "✅ mock 试穿正常",
      run: async () => {
        const result = await generateMockTryOn();

        if (!result.result_image_url) {
          throw new Error("mock provider 未返回 result_image_url");
        }
      },
    },
  ];

  for (const check of checks) {
    try {
      await check.run();
      console.log(check.label);
    } catch (error) {
      console.error(`❌ ${check.label.replace(/^✅\s*/, "")}`);
      console.error(formatError(error));
      process.exitCode = 1;
      return;
    }
  }
}

main().catch((error) => {
  console.error("❌ MVP 自动检查失败");
  console.error(formatError(error));
  process.exitCode = 1;
});
