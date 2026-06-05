import Link from "next/link";
import TryOnHistoryClient from "../try-on/history/TryOnHistoryClient";

export default function FavoritesPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-neutral-500">
            返回首页
          </Link>
          <Link href="/try-on/history" className="text-sm font-medium text-neutral-500">
            试穿记录
          </Link>
        </div>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">收藏</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            我的收藏
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            只查看已收藏的试穿结果，随时取消收藏或再次生成。
          </p>
        </div>

        <TryOnHistoryClient favoritesOnly />
      </section>
    </main>
  );
}
