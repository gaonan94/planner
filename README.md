# 每日科研健身英语规划台

这是一个可以本地使用、也可以部署到线上并跨设备同步的小网页应用。

## 本地打开

双击 `index.html` 就能使用。没配置云端时，数据保存在当前浏览器里。

## 开启跨设备同步

1. 在 Supabase 新建一个项目。
2. 打开 Supabase 的 SQL Editor，运行 `supabase-schema.sql`。
3. 在 Project Settings > API 里复制 Project URL 和 anon public key。
4. 打开本应用，在左侧“云同步”里填入 URL 和 anon key，保存配置。
5. 用邮箱和密码注册或登录。
6. 点“同步”。

之后把这个文件夹部署到 Vercel、Netlify、Cloudflare Pages 或 GitHub Pages。其他设备打开同一个网址，填同一组 Supabase 配置并登录同一个账号，就能看到同一份数据。

自定义标题和主题配色也会随备份导出，并在云同步开启后跟随同一账号同步到其他设备。

如果升级后新增了模块，例如“科研笔记”，请在 Supabase 里重新运行一次 `supabase-schema.sql`，这样云端才允许保存新的记录类型。

## AI 英语建议

设置页里可以配置外部 AI 接口。默认按 OpenAI API 填写：

- 接口地址：`https://api.openai.com/v1`
- 模型：`gpt-5.5`

API Key 只保存在当前浏览器，不会写入备份，也不会同步到云端。若浏览器拦截跨域请求，可以点“复制提示词”，粘贴到 ChatGPT 网页版或其他 AI 工具里使用。

## 部署建议

最省事的路线是把这个文件夹上传到 GitHub，然后开启 GitHub Pages。想用更顺手的预览和域名，可以拖到 Netlify 或 Cloudflare Pages。
