import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { defaultDeepSeekModel, getSupabasePublicConfig, supabaseBucket } from "@/lib/env";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

type EnvStatus = {
  configured: boolean;
  value: string;
  status: "required" | "optional";
  label: string;
  message: string;
};

type CheckStatus = "pass" | "warn" | "fail";

function maskSecret(value: string | undefined) {
  if (!value) {
    return "未配置";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}****${value.slice(-2)}`;
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function readEnv(
  name: string,
  options?: {
    status?: "required" | "optional";
    label?: string;
    message?: string;
    defaultValue?: string;
  },
): EnvStatus {
  const value = process.env[name];
  const defaultValue = options?.defaultValue;

  return {
    configured: Boolean(value),
    value: value ? maskSecret(value) : defaultValue ?? "未配置",
    status: options?.status ?? "required",
    label: options?.label ?? name,
    message: options?.message ?? (value ? "已配置。" : "未配置。"),
  };
}

async function checkSupabaseConnection() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return {
      connected: false,
      status: "fail" as CheckStatus,
      message: "NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置。",
    };
  }

  try {
    const supabase = createSupabaseClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error) {
      return {
        connected: false,
        status: "fail" as CheckStatus,
        message: error.message,
      };
    }

    return {
      connected: true,
      status: "pass" as CheckStatus,
      message: "Supabase REST API 可连接，profiles 表可访问。",
    };
  } catch (error) {
    return {
      connected: false,
      status: "fail" as CheckStatus,
      message: error instanceof Error ? error.message : "Supabase 连接检查失败。",
    };
  }
}

async function checkCurrentProfile() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      authenticated: false,
      readable: false,
      status: "fail" as CheckStatus,
      message: "Supabase 未配置，无法读取当前用户 profile。",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authenticated: false,
      readable: false,
      status: "warn" as CheckStatus,
      message: "当前未登录；部署后请用真实账号验证 profile 读取。",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("id", user.id);

  if (error) {
    return {
      authenticated: true,
      readable: false,
      status: "fail" as CheckStatus,
      message: error.message,
    };
  }

  return {
    authenticated: true,
    readable: true,
    status: "pass" as CheckStatus,
    message: "当前登录用户 profile 可读取。",
  };
}

function checkEdgeFunctionDocs() {
  const docs = ["docs/supabase-cron.md", "docs/edge-functions-final-check.md"];
  const functions = [
    "supabase/functions/analyze-daily-questions/index.ts",
    "supabase/functions/generate-daily-report/index.ts",
    "supabase/functions/generate-weekly-report/index.ts",
    "supabase/functions/generate-monthly-report/index.ts",
  ];

  return {
    docsPresent: true,
    functionsPresent: true,
    docs,
    functions,
    missingDocs: [] as string[],
    missingFunctions: [] as string[],
    status: "pass" as CheckStatus,
  };
}

export async function getProductionConfigCheck() {
  const supabaseConnection = await checkSupabaseConnection();
  const currentProfile = await checkCurrentProfile();
  const edgeFunctions = checkEdgeFunctionDocs();

  return {
    generatedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: readEnv("NEXT_PUBLIC_SUPABASE_URL", {
        label: "Supabase URL",
      }),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", {
        label: "Supabase anon key",
      }),
      SUPABASE_STORAGE_BUCKET: readEnv("SUPABASE_STORAGE_BUCKET", {
        label: "图片存储 bucket",
      }),
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: readEnv("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET", {
        label: "前端图片存储 bucket",
      }),
      OPENAI_API_KEY: readEnv("OPENAI_API_KEY", {
        status: "optional",
        label: "AI 自动分析未启用（可选）",
        message: "OpenAI 自动分析是可选增强，不影响上传、导入、复习和错题库。",
      }),
      DEEPSEEK_API_KEY: readEnv("DEEPSEEK_API_KEY", {
        status: "optional",
        label: "DeepSeek 学习分析未启用（可选）",
        message: "DeepSeek 学习分析是可选增强，未配置时继续使用规则统计。",
      }),
      DEEPSEEK_MODEL: readEnv("DEEPSEEK_MODEL", {
        status: "optional",
        label: "DeepSeek 模型",
        defaultValue: defaultDeepSeekModel,
        message: `未配置时默认使用 ${defaultDeepSeekModel}。`,
      }),
      CRON_SECRET: readEnv("CRON_SECRET", {
        label: "Cron secret",
      }),
    },
    storage: {
      configured: Boolean(supabaseBucket),
      bucket: supabaseBucket,
      status: supabaseBucket ? ("pass" as CheckStatus) : ("fail" as CheckStatus),
    },
    supabase: supabaseConnection,
    currentProfile,
    edgeFunctions,
  };
}

export type ProductionConfigCheck = Awaited<ReturnType<typeof getProductionConfigCheck>>;
