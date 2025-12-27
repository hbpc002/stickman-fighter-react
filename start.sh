#!/bin/bash
# 启动脚本

echo "🔥 火柴人对战游戏 - React版"
echo "================================"
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
fi

echo ""
echo "请选择启动模式："
echo "1) 开发模式 (推荐) - 支持热更新"
echo "2) 生产模式 - 本地预览"
echo "3) 仅构建"
echo "4) 查看帮助"
echo ""
read -p "输入选项 [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 启动开发服务器..."
        npm run dev
        ;;
    2)
        echo ""
        echo "🔨 构建并启动预览..."
        npm run build && npm run preview
        ;;
    3)
        echo ""
        echo "🔨 仅构建..."
        npm run build
        ;;
    4)
        echo ""
        echo "📖 使用说明："
        echo "   开发模式: npm run dev"
        echo "   构建: npm run build"
        echo "   预览: npm run preview"
        echo ""
        echo "🎮 游戏控制："
        echo "   玩家1 (红色): W/A/D/空格/S"
        echo "   玩家2 (蓝色): ↑/←/→/J/K"
        echo ""
        echo "📱 移动端：使用屏幕按钮控制"
        ;;
    *)
        echo "❌ 无效选项"
        ;;
esac
