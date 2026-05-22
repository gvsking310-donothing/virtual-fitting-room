import Link from "next/link";
import TryOnHistoryClient from "./TryOnHistoryClient";

export default function TryOnHistoryPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <Link href="/try-on" className="text-sm font-medium text-neutral-500">
          返回试穿
        </Link>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">历史记录</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            试穿任务
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            查看所有 AI 试穿准备记录和当前状态。
          </p>
        </div>

        <TryOnHistoryClient />
      </section>
    </main>
  );
}
