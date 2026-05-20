import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-between rounded-[2rem] border border-white/70 bg-white/65 p-6 shadow-2xl shadow-stone-300/45 backdrop-blur">
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span className="font-medium">Virtual Fitting</span>
          <span className="rounded-full bg-stone-950 px-3 py-1 text-xs text-white">
            AI
          </span>
        </div>

        <div className="space-y-7">
          <div className="space-y-4">
            <p className="text-sm font-medium text-stone-500">智能穿搭预览</p>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal text-stone-950">
              AI虚拟试衣间
            </h1>
            <p className="max-w-xs text-base leading-7 text-stone-600">
              上传资料，快速生成更贴合你的试衣体验。
            </p>
          </div>

          <Link
            href="/profile"
            className="flex h-14 w-full items-center justify-center rounded-full bg-stone-950 text-base font-semibold text-white shadow-lg shadow-stone-400/50 transition active:scale-[0.98]"
          >
            开始体验
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs text-stone-600">
          <div className="rounded-2xl bg-white/70 px-2 py-3">身形资料</div>
          <div className="rounded-2xl bg-white/70 px-2 py-3">头像上传</div>
          <div className="rounded-2xl bg-white/70 px-2 py-3">智能推荐</div>
        </div>
      </section>
    </main>
  );
}
