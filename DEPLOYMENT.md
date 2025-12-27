# 🚀 部署指南

## Render 部署（推荐）

### 1. 创建 Web Service
1. 登录 [Render](https://render.com)
2. 点击 "New" → "Web Service"
3. 连接你的 GitHub 仓库

### 2. 配置设置
```
Name: stickman-fighter-react
Environment: Node
Build Command: npm install && npm run build
Start Command: npm run preview
Instance Type: Free (或根据需求选择)
Port: 4173
```

### 3. 环境变量（可选）
无需额外环境变量

### 4. 部署
点击 "Create Web Service" 等待部署完成

---

## Vercel 部署（推荐）

### 方法 1: Vercel 网站
1. 登录 [Vercel](https://vercel.com)
2. 点击 "Add New..." → "Project"
3. 导入 GitHub 仓库
4. Vercel 会自动检测配置
5. 点击 "Deploy"

### 方法 2: Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## Netlify 部署

### 1. 连接仓库
1. 登录 [Netlify](https://app.netlify.com)
2. 点击 "Add new site" → "Import an existing project"
3. 连接 GitHub 仓库

### 2. 配置构建
```
Build command: npm run build
Publish directory: dist
```

### 3. 部署
点击 "Deploy site"

---

## GitHub Pages 部署

### 1. 安装 gh-pages
```bash
npm install --save-dev gh-pages
```

### 2. 更新 package.json
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist",
    "predeploy": "npm run build"
  },
  "homepage": "https://<username>.github.io/<repo-name>"
}
```

### 3. 部署
```bash
npm run deploy
```

---

## 本地运行

### 开发模式
```bash
npm install
npm run dev
```
访问 http://localhost:3000

### 生产模式
```bash
npm install
npm run build
npm run preview
```
访问 http://localhost:4173

---

## Docker 部署

### Dockerfile
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 构建和运行
```bash
docker build -t stickman-react .
docker run -p 8080:80 stickman-react
```

---

## 验证部署

部署完成后，检查以下内容：

1. ✅ 游戏画面正常显示
2. ✅ 按钮可以点击
3. ✅ 键盘控制响应
4. ✅ 移动端触摸正常
5. ✅ 全屏功能工作
6. ✅ 武器系统正常

### 浏览器控制台检查
打开开发者工具，确保没有错误信息。

---

## 性能优化建议

### 如果遇到性能问题：
1. 使用 CDN 加速静态资源
2. 启用 Gzip 压缩
3. 使用浏览器缓存
4. 考虑使用 Web Workers（高级）

---

## 故障排除

### 问题：页面空白
- 检查浏览器控制台错误
- 确认构建成功
- 检查网络请求

### 问题：按钮无响应
- 检查事件绑定
- 确认没有 JavaScript 错误

### 问题：移动端显示异常
- 检查 viewport 设置
- 确认触摸事件正常

---

## 技术支持

如有问题，请检查：
1. 浏览器是否支持 Canvas API
2. 是否启用 JavaScript
3. 网络连接正常

**最低浏览器要求：**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
