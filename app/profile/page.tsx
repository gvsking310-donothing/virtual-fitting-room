import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-2xl shadow-stone-300/45 backdrop-blur">
        <Link href="/" className="text-sm font-medium text-stone-500">
          返回首页
        </Link>

        <div className="mt-7 space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal text-stone-950">
            完善用户资料
          </h1>
          <p className="text-sm leading-6 text-stone-600">
            用于生成更准确的虚拟试衣效果。
          </p>
        </div>

        <form className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">身高</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="请输入身高 cm"
              className="h-13 w-full rounded-2xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-950"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">体重</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="请输入体重 kg"
              className="h-13 w-full rounded-2xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-950"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">性别</span>
            <select className="h-13 w-full rounded-2xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-950">
              <option value="">请选择</option>
              <option value="female">女</option>
              <option value="male">男</option>
              <option value="other">其他</option>
            </select>
          </label>

          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 text-center transition active:scale-[0.99]">
            <span className="text-sm font-semibold text-stone-800">
              上传头像
            </span>
            <span className="text-xs text-stone-500">支持 JPG / PNG</span>
            <input type="file" accept="image/*" className="sr-only" />
          </label>

          <button
            type="button"
            className="h-14 w-full rounded-full bg-stone-950 text-base font-semibold text-white shadow-lg shadow-stone-400/50 transition active:scale-[0.98]"
          >
            保存资料
          </button>
        </form>
      </section>
    </main>
  );
}
