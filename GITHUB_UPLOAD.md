# 🚀 上传到 GitHub 指南

## 方法 1: 使用 GitHub 网站（推荐）

### 步骤 1: 在 GitHub 创建新仓库
1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `stickman-fighter-react` (或自定义名称)
   - **Description**: 🔥 火柴人对战游戏 - React版
   - **选择**: Public 或 Private
   - ✅ 勾选 "Add a README file"
3. 点击 "Create repository"

### 步骤 2: 获取仓库 URL
创建成功后，复制仓库地址：
```
https://github.com/<你的用户名>/stickman-fighter-react.git
```

### 步骤 3: 上传代码
在终端执行：

```bash
# 进入项目目录
cd /home/hbpc/stickman-react

# 添加远程仓库（替换下面的 URL）
git remote add origin https://github.com/<你的用户名>/stickman-fighter-react.git

# 推送代码
git push -u origin master
```

---

## 方法 2: 使用 GitHub CLI（如果已安装）

```bash
# 1. 安装 GitHub CLI (如果未安装)
# Ubuntu/Debian:
sudo apt install gh

# 2. 登录 GitHub
gh auth login

# 3. 创建仓库
cd /home/hbpc/stickman-react
gh repo create stickman-fighter-react --public --source=. --remote=origin --push
```

---

## 方法 3: 使用 Git 命令（手动）

```bash
# 1. 在 GitHub 网站创建空仓库（不要勾选 README）

# 2. 设置远程仓库
cd /home/hbpc/stickman-react
git remote add origin https://github.com/<你的用户名>/stickman-fighter-react.git

# 3. 重命名分支（如果需要）
git branch -M main

# 4. 推送
git push -u origin main
```

---

## 📝 推送后的操作

### 1. 验证推送成功
访问：`https://github.com/<你的用户名>/stickman-fighter-react`

### 2. 部署到线上（任选其一）

#### 选项 A: Render（推荐）
1. 访问 https://render.com
2. 点击 "New" → "Web Service"
3. 连接 GitHub 仓库
4. 使用配置：
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview`
   - Port: `4173`

#### 选项 B: Vercel
1. 访问 https://vercel.com
2. 导入 GitHub 仓库
3. 自动部署

#### 选项 C: Netlify
1. 访问 https://app.netlify.com
2. "Add new site" → "Import from Git"
3. 选择仓库，构建配置：
   - Build command: `npm run build`
   - Publish directory: `dist`

---

## 🔑 常见问题

### Q: 权限被拒绝
```bash
# 需要设置 SSH 密钥或使用 HTTPS
git remote set-url origin https://github.com/<用户名>/<仓库>.git
```

### Q: 已有远程仓库
```bash
# 查看现有远程
git remote -v

# 删除旧的
git remote remove origin

# 添加新的
git remote add origin <新URL>
```

### Q: 推送失败
```bash
# 拉取最新更改（如果有）
git pull origin master --allow-unrelated-histories

# 再次推送
git push origin master
```

---

## ✅ 完成检查清单

- [ ] GitHub 仓库已创建
- [ ] 代码已推送
- [ ] 仓库页面可访问
- [ ] 部署到 Render/Vercel/Netlify
- [ ] 在线地址可访问
- [ ] 测试游戏功能

---

## 🎯 完成后

你的游戏将可以通过以下方式访问：
- **源代码**: `https://github.com/<用户名>/stickman-fighter-react`
- **在线游戏**: `https://<你的应用>.onrender.com` (或 Vercel/Netlify 域名)

享受你的 React 火柴人对战游戏！ 🎮
