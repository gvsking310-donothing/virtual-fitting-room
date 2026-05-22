import Link from "next/link";

export default function TryOnProcessingPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-between rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <Link href="/try-on" className="text-sm font-medium text-neutral-500">
          返回选择
        </Link>

        <div className="space-y-5">
          <div className="h-2 w-20 rounded-full bg-neutral-950" />
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-500">试穿预览</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-neutral-950">
              AI试穿处理中...
            </h1>
            <p className="text-sm leading-6 text-neutral-600">
              真实 AI 试穿能力即将接入，请前往结果页查看当前选择。
            </p>
          </div>
        </div>

        <Link
          href="/try-on/result"
          className="flex h-14 w-full items-center justify-center rounded-full bg-neutral-950 text-base font-semibold text-white shadow-lg shadow-neutral-300 transition active:scale-[0.98]"
        >
          查看结果页
        </Link>
      </section>
    </main>
  );
}
