import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-between rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span className="font-medium">Virtual Fitting</span>
          <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs text-white">
            AI
          </span>
        </div>

        <div className="space-y-7">
          <div className="space-y-4">
            <p className="text-sm font-medium text-neutral-500">智能穿搭预览</p>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal text-neutral-950">
              AI虚拟试衣间
            </h1>
            <p className="max-w-xs text-base leading-7 text-neutral-600">
              上传资料，快速生成更贴合你的试衣体验。
            </p>
          </div>

          <Link
            href="/profile"
            className="flex h-14 w-full items-center justify-center rounded-full bg-neutral-950 text-base font-semibold text-white shadow-lg shadow-neutral-300 transition active:scale-[0.98]"
          >
            开始体验
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs text-neutral-600">
          <div className="rounded-2xl bg-neutral-100 px-2 py-3">身形资料</div>
          <Link href="/try-on" className="rounded-2xl bg-neutral-100 px-2 py-3">
            AI试穿
          </Link>
          <Link href="/clothes" className="rounded-2xl bg-neutral-100 px-2 py-3">
            上传服装
          </Link>
        </div>
      </section>
    </main>
  );
}
