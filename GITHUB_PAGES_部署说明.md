# GitHub Pages 部署说明

## 方式 A：网页端上传，最适合现在

1. 打开 GitHub，登录账号。
2. 新建仓库，例如 `planner`。
3. 选择 Public。
4. 不要勾选自动创建 README。
5. 进入新仓库后，点 `uploading an existing file`。
6. 解压 `科研规划台-GitHub-Pages.zip`。
7. 把解压出来的所有文件拖进 GitHub 上传区。
8. Commit changes。
9. 打开仓库 `Settings`。
10. 进入 `Pages`。
11. Source 选择 `Deploy from a branch`。
12. Branch 选择 `main`，目录选择 `/root`，保存。
13. 等 1-3 分钟，GitHub 会给出网址：
    `https://你的用户名.github.io/仓库名/`

## 上线后

- 主应用：`https://你的用户名.github.io/仓库名/`
- 使用手册：`https://你的用户名.github.io/仓库名/使用手册.html`
- 部署说明：`https://你的用户名.github.io/仓库名/部署到公网.html`

## 跨设备同步

GitHub Pages 只负责让网页“在哪里都能打开”。如果你还想手机、电脑看到同一份记录，需要在应用里进入：

`设置 -> 云同步`

然后填 Supabase URL 和 anon key，注册/登录后点同步。
