# virtual-fitting-room

AI 虚拟试衣间，基于 Next.js App Router、TypeScript、Tailwind CSS 和 Supabase。

流程包含用户资料录入、全身照片上传、服装衣橱上传和 AI 试穿准备页，照片会保存到 Supabase Storage。

## 本地开发

```bash
npm install
npm run dev
```

## Supabase

在 Supabase SQL Editor 执行：

```sql
-- supabase/schema.sql
```

然后在 Vercel 环境变量中配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TRYON_PROVIDER=mock
REPLICATE_API_TOKEN=
REPLICATE_MODEL_VERSION=
```

`TRYON_PROVIDER=mock` 是默认模式。切换到 `replicate` 前，需要配置 `REPLICATE_API_TOKEN` 和可用的 `REPLICATE_MODEL_VERSION`。

推送到 GitHub `main` 分支后，Vercel 连接该仓库即可自动部署。
