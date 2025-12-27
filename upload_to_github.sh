#!/bin/bash
# GitHub 上传助手脚本

echo "==================================="
echo "🔥 GitHub 上传助手"
echo "==================================="
echo ""

# 检查是否在 git 仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是 git 仓库"
    exit 1
fi

# 检查是否有远程仓库
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)

if [ -n "$CURRENT_REMOTE" ]; then
    echo "✅ 当前远程仓库: $CURRENT_REMOTE"
    echo ""
    read -p "是否要推送代码到此仓库? (y/n): " push_confirm
    if [ "$push_confirm" = "y" ]; then
        echo ""
        echo "🚀 正在推送代码..."
        git push -u origin master
        echo ""
        echo "✅ 推送完成!"
        echo ""
        echo "请访问: $CURRENT_REMOTE"
        exit 0
    fi
fi

echo "📝 请按以下步骤操作:"
echo ""
echo "1. 访问 https://github.com/new"
echo "   - 创建新仓库 (例如: stickman-fighter-react)"
echo "   - 不要勾选 'Add a README file'"
echo ""
echo "2. 复制仓库 URL，格式如下:"
echo "   https://github.com/<你的用户名>/stickman-fighter-react.git"
echo ""
echo "3. 在下方粘贴仓库 URL:"
read -p "仓库 URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ 未输入 URL，退出"
    exit 1
fi

echo ""
echo "🔧 配置远程仓库..."
git remote add origin "$REPO_URL"

echo "🚀 正在推送代码..."
git push -u origin master

echo ""
echo "✅ 完成!"
echo ""
echo "仓库地址: $REPO_URL"
echo ""
echo "下一步:"
echo "  - 部署到 Render: https://render.com"
echo "  - 部署到 Vercel: https://vercel.com"
echo "  - 查看部署指南: cat GITHUB_UPLOAD.md"
