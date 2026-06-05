import Link from "next/link";
import AiProviderClient from "./AiProviderClient";

export default function AiProviderPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-neutral-500">
            返回首页
          </Link>
          <Link href="/try-on" className="text-sm font-medium text-neutral-500">
            去试穿
          </Link>
        </div>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">AI Provider</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            试穿引擎管理
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            切换当前 AI 试穿引擎。真实 Provider 调用失败时会自动降级到 Mock。
          </p>
        </div>

        <AiProviderClient />
      </section>
    </main>
  );
}
