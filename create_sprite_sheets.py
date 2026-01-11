#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将PNG序列合并为精灵表
输入: sprite_assets/action/frame_01.png
输出: public/sprites/action_sprite.png + .json
"""

import os
import json
from PIL import Image

# 配置
SPRITE_ASSETS_DIR = "sprite_assets"
OUTPUT_DIR = "public/sprites"
ACTIONS = ['idle', 'walk', 'run', 'attack_slash', 'hurt', 'victory']

def create_sprite_sheet(action):
    """为单个动作创建精灵表"""
    action_dir = os.path.join(SPRITE_ASSETS_DIR, action)

    if not os.path.exists(action_dir):
        print(f"⚠️  跳过 {action}: 目录不存在")
        return None

    # 获取所有PNG文件
    png_files = [f for f in os.listdir(action_dir) if f.endswith('.png')]
    png_files.sort()  # 确保顺序

    if not png_files:
        print(f"⚠️  跳过 {action}: 没有PNG文件")
        return None

    print(f"  处理 {action} ({len(png_files)}帧)...")

    # 加载所有帧
    frames = []
    for filename in png_files:
        filepath = os.path.join(action_dir, filename)
        img = Image.open(filepath)
        frames.append(img)

    # 获取第一帧的尺寸
    frame_width, frame_height = frames[0].size

    # 创建精灵表（水平排列）
    sheet_width = frame_width * len(frames)
    sheet_height = frame_height

    sprite_sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))

    # 粘贴每一帧
    for i, frame in enumerate(frames):
        x = i * frame_width
        sprite_sheet.paste(frame, (x, 0))

    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 保存精灵表
    output_png = os.path.join(OUTPUT_DIR, f"{action}_sprite.png")
    sprite_sheet.save(output_png, 'PNG')

    # 读取元数据（如果存在）
    metadata_file = os.path.join(SPRITE_ASSETS_DIR, "metadata.json")
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r', encoding='utf-8') as f:
            all_metadata = json.load(f)
        metadata = all_metadata.get(action, {})
    else:
        # 默认元数据
        metadata = {
            'action': action,
            'frameCount': len(frames),
            'frameWidth': frame_width,
            'frameHeight': frame_height,
            'sheetWidth': sheet_width,
            'sheetHeight': sheet_height,
            'fps': 12
        }

    # 补充完整信息
    metadata['frameCount'] = len(frames)
    metadata['frameWidth'] = frame_width
    metadata['frameHeight'] = frame_height
    metadata['sheetWidth'] = sheet_width
    metadata['sheetHeight'] = sheet_height

    # 保存元数据
    output_json = os.path.join(OUTPUT_DIR, f"{action}_sprite.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    # 文件大小
    file_size = os.path.getsize(output_png) / 1024

    print(f"    ✓ {output_png} ({file_size:.1f}KB)")
    print(f"    ✓ {output_json}")

    return metadata

def main():
    print("=" * 60)
    print("🖼️  精灵表生成器 (Pillow)")
    print("=" * 60)

    print(f"\n输入: {SPRITE_ASSETS_DIR}/")
    print(f"输出: {OUTPUT_DIR}/")
    print()

    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 处理所有动作
    results = {}
    for action in ACTIONS:
        metadata = create_sprite_sheet(action)
        if metadata:
            results[action] = metadata

    # 生成汇总信息
    print(f"\n📊 生成统计:")
    print(f"   动作数量: {len(results)}/{len(ACTIONS)}")

    total_frames = sum(m['frameCount'] for m in results.values())
    total_size = sum(
        os.path.getsize(os.path.join(OUTPUT_DIR, f"{action}_sprite.png"))
        for action in results.keys()
    ) / 1024

    print(f"   总帧数: {total_frames}")
    print(f"   总大小: {total_size:.1f}KB")

    if len(results) == len(ACTIONS):
        print(f"\n✅ 全部动作生成成功！")
    else:
        missing = set(ACTIONS) - set(results.keys())
        print(f"\n⚠️  缺失的动作: {', '.join(missing)}")

    print(f"\n📁 文件位置:")
    for action in results.keys():
        print(f"   {action:15} → {OUTPUT_DIR}/{action}_sprite.*")

    print(f"\n🎮 下一步:")
    print(f"   1. 检查生成的精灵表")
    print(f"   2. 在游戏中使用 SpriteAnimation 类加载")
    print(f"   3. 享受夸张的动画效果！")

if __name__ == "__main__":
    main()
