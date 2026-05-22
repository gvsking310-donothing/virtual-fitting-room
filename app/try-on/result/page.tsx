import Link from "next/link";
import { Suspense } from "react";
import TryOnResultClient from "./TryOnResultClient";

export default function TryOnResultPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <div className="flex items-center justify-between">
          <Link href="/try-on" className="text-sm font-medium text-neutral-500">
            返回选择
          </Link>
          <Link href="/try-on/history" className="text-sm font-medium text-neutral-500">
            历史记录
          </Link>
        </div>

        <div className="mt-7 space-y-3">
          <p className="text-sm font-medium text-neutral-500">试穿预览</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-neutral-950">
            AI试穿处理中...
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            当前页面先展示已选择的人物照片和衣服图片。
          </p>
        </div>

        <Suspense
          fallback={
            <div className="mt-8 rounded-3xl bg-neutral-100 px-5 py-8 text-sm text-neutral-600">
              正在读取试穿任务...
            </div>
          }
        >
          <TryOnResultClient />
        </Suspense>
      </section>
    </main>
  );
}
