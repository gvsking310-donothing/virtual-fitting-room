import Link from "next/link";

const roadmap = [
  {
    version: "MVP v1.0",
    status: "已完成",
    description: "完成从资料录入到首次试穿演示的核心闭环。",
    items: [
      { label: "用户资料", done: true },
      { label: "全身照", done: true },
      { label: "衣服上传", done: true },
      { label: "试穿", done: true },
      { label: "收藏", done: true },
      { label: "穿搭组合", done: true },
      { label: "MVP检查", done: true },
    ],
  },
  {
    version: "V1.1",
    status: "下一阶段",
    description: "提升 AI 生成链路和结果交付质量。",
    items: [
      { label: "真实AI试穿", done: false },
      { label: "更真实试穿结果", done: false },
      { label: "下载高清图", done: false },
    ],
  },
  {
    version: "V1.2",
    status: "扩展试戴",
    description: "覆盖更多配饰和细分类目的虚拟搭配。",
    items: [
      { label: "帽子试戴", done: false },
      { label: "眼镜试戴", done: false },
      { label: "包包试背", done: false },
      { label: "首饰试戴", done: false },
    ],
  },
  {
    version: "V2.0",
    status: "长期方向",
    description: "从单品试穿升级到完整造型智能体验。",
    items: [
      { label: "全身虚拟试穿", done: false },
      { label: "一键换装", done: false },
      { label: "穿搭推荐", done: false },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-neutral-500">
            返回首页
          </Link>
          <Link href="/checklist" className="text-sm font-medium text-neutral-500">
            MVP检查
          </Link>
        </div>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">Project Roadmap</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            项目路线图
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            用一条清晰时间轴展示当前完成度和下一阶段计划。
          </p>
        </div>

        <div className="mt-8 space-y-0">
          {roadmap.map((phase, index) => (
            <article key={phase.version} className="relative pl-8">
              {index < roadmap.length - 1 ? (
                <div className="absolute left-[9px] top-5 h-full w-px bg-neutral-200" />
              ) : null}

              <div className="absolute left-0 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-950 bg-white">
                <span
                  className={
                    phase.status === "已完成"
                      ? "h-2.5 w-2.5 rounded-full bg-neutral-950"
                      : "h-2.5 w-2.5 rounded-full bg-neutral-200"
                  }
                />
              </div>

              <div className="pb-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-950">
                      {phase.version}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">
                      {phase.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600">
                    {phase.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  {phase.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-neutral-950">
                        {item.label}
                      </span>
                      <span className="text-sm text-neutral-600">
                        {item.done ? "✅" : "🔲"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
