#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
夸张火柴人精灵表生成器 - 使用Pillow
生成动态夸张的火柴人动作序列
"""

import os
from PIL import Image, ImageDraw
import math

# 配置
FRAME_SIZE = (128, 128)  # 每帧大小
BACKGROUND = (0, 0, 0, 0)  # 透明背景
LINE_COLOR = (255, 255, 255)  # 白色线条
ACCENT_COLOR = (255, 200, 0)  # 强调色（用于武器、特效）

# 动作配置
ACTIONS = {
    'idle': {
        'frames': 12,
        'fps': 10,
        'description': '呼吸、微动、准备战斗'
    },
    'walk': {
        'frames': 8,
        'fps': 12,
        'description': '夸张的步伐，手臂大摆动'
    },
    'run': {
        'frames': 6,
        'fps': 15,
        'description': '飞奔，身体前倾，双腿大跨度'
    },
    'attack_slash': {
        'frames': 8,
        'fps': 12,
        'description': '大范围挥砍，身体扭转'
    },
    'hurt': {
        'frames': 6,
        'fps': 15,
        'description': '猛烈后仰，夸张的痛苦表情'
    },
    'victory': {
        'frames': 12,
        'fps': 10,
        'description': '跳跃欢呼，双手高举'
    }
}

class ExaggeratedStickman:
    """夸张火柴人绘制器"""

    def __init__(self, size=128):
        self.size = size
        self.center = size // 2
        self.ground = size - 20  # 地面位置

    def draw_line(self, draw, x1, y1, x2, y2, width=3, color=LINE_COLOR):
        """绘制线条"""
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)

    def draw_circle(self, draw, x, y, radius, width=3, color=LINE_COLOR):
        """绘制圆圈"""
        draw.ellipse(
            [x-radius, y-radius, x+radius, y+radius],
            outline=color,
            width=width
        )

    def draw_head(self, draw, x, y, scale=1.0, angry=False, dizzy=False):
        """绘制头部"""
        radius = int(8 * scale)
        self.draw_circle(draw, x, y, radius)

        # 眼睛
        if angry:
            # 愤怒眼（斜线）
            draw.line([x-3, y-2, x-1, y], fill=LINE_COLOR, width=2)
            draw.line([x+1, y, x+3, y-2], fill=LINE_COLOR, width=2)
        elif dizzy:
            # 眩晕眼（X）
            draw.line([x-3, y-2, x-1, y], fill=LINE_COLOR, width=1)
            draw.line([x-1, y-2, x-3, y], fill=LINE_COLOR, width=1)
            draw.line([x+1, y-2, x+3, y], fill=LINE_COLOR, width=1)
            draw.line([x+3, y-2, x+1, y], fill=LINE_COLOR, width=1)
        else:
            # 正常眼（点）
            draw.ellipse([x-3, y-2, x-2, y-1], fill=LINE_COLOR)
            draw.ellipse([x+2, y-2, x+3, y-1], fill=LINE_COLOR)

    def draw_body(self, draw, x, y, length=25):
        """绘制身体"""
        self.draw_line(draw, x, y, x, y + length)

    def draw_arm(self, draw, x, y, angle, length=20, bend=0):
        """绘制手臂"""
        rad = math.radians(angle)
        end_x = x + length * math.cos(rad)
        end_y = y + length * math.sin(rad)

        self.draw_line(draw, x, y, end_x, end_y)

        # 弯曲的手肘
        if bend != 0:
            bend_rad = math.radians(bend)
            mid_x = (x + end_x) / 2 + 5 * math.sin(bend_rad)
            mid_y = (y + end_y) / 2 + 5 * math.cos(bend_rad)
            self.draw_line(draw, x, y, mid_x, mid_y)
            self.draw_line(draw, mid_x, mid_y, end_x, end_y)

    def draw_leg(self, draw, x, y, angle, length=25, bend=0):
        """绘制腿部"""
        rad = math.radians(angle)
        end_x = x + length * math.cos(rad)
        end_y = y + length * math.sin(rad)

        # 弯曲的膝盖
        if bend != 0:
            bend_rad = math.radians(bend)
            mid_x = x + (length/2) * math.cos(rad) + 5 * math.sin(bend_rad)
            mid_y = y + (length/2) * math.sin(rad) + 5 * math.cos(bend_rad)
            self.draw_line(draw, x, y, mid_x, mid_y)
            self.draw_line(draw, mid_x, mid_y, end_x, end_y)
        else:
            self.draw_line(draw, x, y, end_x, end_y)

        return end_x, end_y

    def draw_sparkle(self, draw, x, y, frame):
        """绘制星星特效"""
        size = 3 + (frame % 3)
        draw.line([x-size, y, x+size, y], fill=ACCENT_COLOR, width=2)
        draw.line([x, y-size, x, y+size], fill=ACCENT_COLOR, width=2)
        draw.line([x-size*0.7, y-size*0.7, x+size*0.7, y+size*0.7], fill=ACCENT_COLOR, width=1)
        draw.line([x-size*0.7, y+size*0.7, x+size*0.7, y-size*0.7], fill=ACCENT_COLOR, width=1)

    def draw_shockwave(self, draw, x, y, frame):
        """绘制冲击波"""
        radius = 5 + frame * 2
        self.draw_circle(draw, x, y, radius, width=2, color=ACCENT_COLOR)
        if frame > 1:
            self.draw_circle(draw, x, y, radius-4, width=1, color=ACCENT_COLOR)

    # ============ 动作生成器 ============

    def generate_idle(self, frame, total_frames):
        """待机 - 呼吸、微动"""
        t = frame / total_frames * 2 * math.pi

        # 身体上下浮动
        body_offset = math.sin(t) * 3

        # 手臂轻微摆动
        arm_sway = math.sin(t * 2) * 5

        return {
            'head': (self.center, self.ground - 55 + body_offset),
            'body_top': (self.center, self.ground - 45 + body_offset),
            'body_bottom': (self.center, self.ground - 20 + body_offset),
            'left_arm': {'angle': 160 + arm_sway, 'bend': 0},
            'right_arm': {'angle': 20 - arm_sway, 'bend': 0},
            'left_leg': {'angle': 170, 'bend': 0},
            'right_leg': {'angle': 190, 'bend': 0},
            'effects': []
        }

    def generate_walk(self, frame, total_frames):
        """行走 - 夸张的步伐"""
        # 8帧循环：0-1-2-3右脚前，4-5-6-7左脚前
        phase = frame % 8

        # 夸张的摆动幅度
        swing = math.sin(phase * math.pi / 4) * 20

        if phase < 4:
            # 右脚在前
            leg_front = {'angle': 160 + swing * 0.5, 'bend': -10}
            leg_back = {'angle': 190 - swing * 0.5, 'bend': 5}
            arm_front = {'angle': 20 + swing, 'bend': 0}
            arm_back = {'angle': 160 - swing, 'bend': 0}
        else:
            # 左脚在前
            leg_front = {'angle': 200 - swing * 0.5, 'bend': 10}
            leg_back = {'angle': 170 + swing * 0.5, 'bend': -5}
            arm_front = {'angle': 160 - swing, 'bend': 0}
            arm_back = {'angle': 20 + swing, 'bend': 0}

        # 身体轻微上下
        bounce = abs(math.sin(phase * math.pi / 4)) * 2

        return {
            'head': (self.center, self.ground - 55 + bounce),
            'body_top': (self.center, self.ground - 45 + bounce),
            'body_bottom': (self.center, self.ground - 20 + bounce),
            'left_arm': arm_back,
            'right_arm': arm_front,
            'left_leg': leg_back,
            'right_leg': leg_front,
            'effects': []
        }

    def generate_run(self, frame, total_frames):
        """奔跑 - 双脚离地，身体前倾"""
        phase = frame % 6

        # 飞奔时的腿部大跨度
        leg_swing = math.sin(phase * math.pi / 3) * 35

        # 身体前倾
        body_tilt = 15

        # 双脚交替
        if phase < 3:
            # 右腿前
            left_leg = {'angle': 140 - leg_swing, 'bend': -15}
            right_leg = {'angle': 210 + leg_swing, 'bend': 15}
        else:
            # 左腿前
            left_leg = {'angle': 210 + leg_swing, 'bend': 15}
            right_leg = {'angle': 140 - leg_swing, 'bend': -15}

        # 手臂大幅摆动
        arm_swing = math.sin(phase * math.pi / 1.5) * 40

        # 身体上下跳动
        bounce = abs(math.sin(phase * math.pi / 3)) * 5

        return {
            'head': (self.center + 2, self.ground - 55 + bounce),
            'body_top': (self.center + 1, self.ground - 45 + bounce),
            'body_bottom': (self.center, self.ground - 20 + bounce),
            'left_arm': {'angle': 160 + arm_swing, 'bend': -10},
            'right_arm': {'angle': 20 - arm_swing, 'bend': 10},
            'left_leg': left_leg,
            'right_leg': right_leg,
            'effects': []
        }

    def generate_attack(self, frame, total_frames):
        """攻击 - 大范围挥砍"""
        # 0-2: 准备，3-5: 挥砍，6-7: 收招

        if frame < 3:
            # 准备阶段
            phase = frame / 3
            arm_back = 160 + phase * 20
            body_twist = 0
            effects = []
        elif frame < 6:
            # 挥砍阶段
            phase = (frame - 3) / 3
            arm_back = 180 - phase * 100  # 快速向前
            body_twist = 10
            effects = ['shockwave'] if frame == 5 else []
        else:
            # 收招
            phase = (frame - 6) / 2
            arm_back = 80 + phase * 40
            body_twist = 5
            effects = []

        return {
            'head': (self.center + body_twist, self.ground - 55),
            'body_top': (self.center + body_twist, self.ground - 45),
            'body_bottom': (self.center + body_twist, self.ground - 20),
            'left_arm': {'angle': arm_back, 'bend': -20},
            'right_arm': {'angle': 20, 'bend': 0},
            'left_leg': {'angle': 170, 'bend': 0},
            'right_leg': {'angle': 190, 'bend': 0},
            'effects': effects
        }

    def generate_hurt(self, frame, total_frames):
        """受伤 - 猛烈后仰"""
        # 0-1: 被击中，2-3: 后仰最大，4-5: 恢复

        if frame < 2:
            # 被击中
            tilt = -10
            leg_spread = 0
            arm_fly = 30
            dizzy = False
        elif frame < 4:
            # 后仰最大
            tilt = -25
            leg_spread = 15
            arm_fly = 60
            dizzy = True
        else:
            # 恢复
            tilt = -5
            leg_spread = 5
            arm_fly = 15
            dizzy = False

        return {
            'head': (self.center, self.ground - 55 + tilt),
            'body_top': (self.center, self.ground - 45 + tilt),
            'body_bottom': (self.center, self.ground - 20),
            'left_arm': {'angle': 150 + arm_fly, 'bend': 0},
            'right_arm': {'angle': 30 - arm_fly, 'bend': 0},
            'left_leg': {'angle': 170 + leg_spread, 'bend': 0},
            'right_leg': {'angle': 190 - leg_spread, 'bend': 0},
            'effects': ['dizzy'] if dizzy else []
        }

    def generate_victory(self, frame, total_frames):
        """胜利 - 跳跃欢呼"""
        # 0-2: 起跳，3-5: 空中，6-8: 落地，9-11: 欢呼

        if frame < 3:
            # 起跳
            bounce = frame * 5
            arm_up = 140 - frame * 20
            leg_bend = 5
        elif frame < 6:
            # 空中
            bounce = 15 + math.sin((frame-3) * math.pi / 3) * 5
            arm_up = 80
            leg_bend = 20
        elif frame < 9:
            # 落地
            bounce = 15 - (frame-6) * 3
            arm_up = 100
            leg_bend = 10
        else:
            # 欢呼
            bounce = 2 + math.sin((frame-9) * math.pi / 1.5) * 3
            arm_up = 60 + math.sin((frame-9) * math.pi) * 20
            leg_bend = 5

        # 星星特效
        sparkle = frame >= 3 and frame < 9

        return {
            'head': (self.center, self.ground - 55 - bounce),
            'body_top': (self.center, self.ground - 45 - bounce),
            'body_bottom': (self.center, self.ground - 20 - bounce),
            'left_arm': {'angle': arm_up + 20, 'bend': 0},
            'right_arm': {'angle': arm_up - 20, 'bend': 0},
            'left_leg': {'angle': 170, 'bend': leg_bend},
            'right_leg': {'angle': 190, 'bend': -leg_bend},
            'effects': ['sparkle'] if sparkle else []
        }

    def draw_frame(self, action, frame, total_frames):
        """绘制单帧"""
        # 创建透明画布
        img = Image.new('RGBA', FRAME_SIZE, BACKGROUND)
        draw = ImageDraw.Draw(img)

        # 获取动作数据
        if action == 'idle':
            data = self.generate_idle(frame, total_frames)
        elif action == 'walk':
            data = self.generate_walk(frame, total_frames)
        elif action == 'run':
            data = self.generate_run(frame, total_frames)
        elif action == 'attack_slash':
            data = self.generate_attack(frame, total_frames)
        elif action == 'hurt':
            data = self.generate_hurt(frame, total_frames)
        elif action == 'victory':
            data = self.generate_victory(frame, total_frames)
        else:
            data = self.generate_idle(frame, total_frames)

        # 绘制身体各部分
        head_x, head_y = data['head']
        body_top_x, body_top_y = data['body_top']
        body_bottom_x, body_bottom_y = data['body_bottom']

        # 头部
        angry = 'angry' in data.get('effects', [])
        dizzy = 'dizzy' in data.get('effects', [])
        self.draw_head(draw, head_x, head_y, angry=angry, dizzy=dizzy)

        # 身体
        self.draw_body(draw, body_top_x, body_top_y, length=body_bottom_y - body_top_y)

        # 手臂
        left_arm = data['left_arm']
        right_arm = data['right_arm']
        self.draw_arm(draw, body_top_x, body_top_y,
                     left_arm['angle'], bend=left_arm['bend'])
        self.draw_arm(draw, body_top_x, body_top_y,
                     right_arm['angle'], bend=right_arm['bend'])

        # 腿部
        left_leg = data['left_leg']
        right_leg = data['right_leg']
        self.draw_leg(draw, body_bottom_x, body_bottom_y,
                     left_leg['angle'], bend=left_leg['bend'])
        self.draw_leg(draw, body_bottom_x, body_bottom_y,
                     right_leg['angle'], bend=right_leg['bend'])

        # 特效
        effects = data.get('effects', [])
        if 'sparkle' in effects:
            # 多个星星
            for i in range(3):
                offset_x = (i-1) * 20
                offset_y = -20 - (i%2)*10
                self.draw_sparkle(draw, head_x + offset_x, head_y + offset_y, frame)

        if 'shockwave' in effects:
            self.draw_shockwave(draw, body_top_x + 25, body_top_y, 2)

        return img

    def generate_action_sequence(self, action, output_dir):
        """生成一个动作的所有帧"""
        config = ACTIONS[action]
        frames = config['frames']

        print(f"  生成 {action} ({frames}帧, {config['fps']}FPS)...")

        # 创建输出目录
        action_dir = os.path.join(output_dir, action)
        os.makedirs(action_dir, exist_ok=True)

        # 生成每一帧
        for i in range(frames):
            img = self.draw_frame(action, i, frames)
            filename = f"frame_{i+1:02d}.png"
            filepath = os.path.join(action_dir, filename)
            img.save(filepath)

        print(f"    ✓ 已保存到 {action_dir}/")

        # 生成元数据
        metadata = {
            'action': action,
            'frameCount': frames,
            'frameWidth': FRAME_SIZE[0],
            'frameHeight': FRAME_SIZE[1],
            'fps': config['fps'],
            'description': config['description']
        }

        return metadata

def main():
    """主函数"""
    print("=" * 60)
    print("🔥 夸张火柴人精灵表生成器")
    print("=" * 60)

    # 输出目录
    output_base = "sprite_assets"
    os.makedirs(output_base, exist_ok=True)

    print(f"\n输出目录: {output_base}")
    print(f"帧大小: {FRAME_SIZE[0]}x{FRAME_SIZE[1]}")
    print(f"背景: 透明")
    print()

    # 创建绘制器
    stickman = ExaggeratedStickman(FRAME_SIZE[0])

    # 生成所有动作
    all_metadata = {}

    for action in ACTIONS.keys():
        metadata = stickman.generate_action_sequence(action, output_base)
        all_metadata[action] = metadata

    # 保存全局元数据
    import json
    metadata_file = os.path.join(output_base, "metadata.json")
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(all_metadata, f, indent=2, ensure_ascii=False)

    print(f"\n✅ 全部完成！")
    print(f"   元数据: {metadata_file}")
    print(f"\n下一步:")
    print(f"   1. 检查 {output_base}/ 目录")
    print(f"   2. 运行: python create_sprite_sheets.py")
    print(f"   3. 集成到游戏")

    print("\n动作说明:")
    for action, config in ACTIONS.items():
        print(f"   {action:15} - {config['description']}")

if __name__ == "__main__":
    main()
