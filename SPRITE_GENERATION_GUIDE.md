# Sprite Sheet Generation Guide

This guide explains how to convert PNG sequences into sprite sheets for the stickman React project using ImageMagick.

## 🎯 Quick Start

```bash
# 1. Setup folder structure
./create_spritesheets.sh setup

# 2. Place your PNG sequences in the folders
# 3. Generate sprite sheets
./create_spritesheets.sh generate

# 4. Find output in public/sprites/
```

## 📁 Folder Structure

```
stickman-react/
├── create_spritesheets.sh          # Main script
├── sprite_assets/                  # Input PNG sequences
│   ├── idle/                      # 12 frames
│   ├── walk/                      # 8 frames
│   ├── run/                       # 6 frames
│   ├── attack_slash/              # 6 frames
│   ├── hurt/                      # 3 frames
│   └── victory/                   # 8 frames
└── public/sprites/                # Generated sprite sheets
    ├── idle_sprite.png
    ├── idle_sprite.json
    ├── walk_sprite.png
    └── ...
```

## 🎬 Action Definitions & Frame Requirements

### 1. Idle (12 frames)
**Animation:** Breathing, small bounce, hair sway
- **Frame count:** 12
- **Loop:** Seamless
- **Suggested FPS:** 12 (1 second cycle)

**Visual breakdown:**
```
Frame 1-3:   Downward movement (breath in)
Frame 4-6:   Upward movement (breath out)
Frame 7-9:   Small bounce peak
Frame 10-12: Hair sway completion
```

### 2. Walk (8 frames)
**Animation:** Alternating legs, arm swing, 8-frame contact-plant-push
- **Frame count:** 8
- **Loop:** Seamless
- **Suggested FPS:** 12 (0.67 seconds per step)

**Visual breakdown:**
```
Frame 1-2:   Contact (foot touches ground)
Frame 3-4:   Plant (weight transfer)
Frame 5-6:   Push (propulsion)
Frame 7-8:   Recovery (leg swing forward)
```

### 3. Run (6 frames)
**Animation:** Both feet off ground, hair flow
- **Frame count:** 6
- **Loop:** Seamless
- **Suggested FPS:** 15 (0.4 seconds cycle)

**Visual breakdown:**
```
Frame 1-2:   Airborne (both feet up)
Frame 3-4:   Landing preparation
Frame 5-6:   Hair flow & recovery
```

### 4. Attack Slash (6 frames)
**Animation:** Anticipation → Swing → Follow-through
- **Frame count:** 6
- **Loop:** One-shot
- **Suggested FPS:** 12 (0.5 seconds total)

**Visual breakdown:**
```
Frame 1-2:   Anticipation (wind-up)
Frame 3-4:   Swing (weapon arc)
Frame 5-6:   Follow-through (recovery)
```

### 5. Hurt (3 frames)
**Animation:** Sudden lean back, flash effect
- **Frame count:** 3
- **Loop:** One-shot
- **Suggested FPS:** 12 (0.25 seconds total)

**Visual breakdown:**
```
Frame 1:     Impact (sudden lean)
Frame 2:     Flash effect (optional white overlay)
Frame 3:     Recovery start
```

### 6. Victory (8 frames)
**Animation:** Jump, hand raise, sparkle pop
- **Frame count:** 8
- **Loop:** One-shot
- **Suggested FPS:** 12 (0.67 seconds total)

**Visual breakdown:**
```
Frame 1-2:   Jump preparation
Frame 3-4:   Airborne with hand raise
Frame 5-6:   Landing
Frame 7-8:   Sparkle pop & pose
```

## 📸 PNG Sequence Requirements

### File Naming
The script automatically sorts files numerically. Use any of these formats:
- `frame_01.png`, `frame_02.png`, ... (Recommended)
- `001.png`, `002.png`, ...
- `idle_001.png`, `idle_002.png`, ...
- Any order (script uses `sort -V`)

### Image Specifications
- **Format:** PNG with transparency
- **Consistent dimensions:** All frames must be same size
- **Recommended size:** 64×64, 128×128, or 256×256 pixels
- **Transparent background:** Required

### Example Input Structure
```
sprite_assets/
└── walk/
    ├── frame_01.png  (Contact - right foot)
    ├── frame_02.png  (Plant - right foot)
    ├── frame_03.png  (Push - right foot)
    ├── frame_04.png  (Recovery - right foot)
    ├── frame_05.png  (Contact - left foot)
    ├── frame_06.png  (Plant - left foot)
    ├── frame_07.png  (Push - left foot)
    └── frame_08.png  (Recovery - left foot)
```

## 🛠️ Script Commands

### Setup Only
```bash
./create_spritesheets.sh setup
```
Creates the folder structure without generating sprites.

### Generate Sprite Sheets
```bash
./create_spritesheets.sh generate
```
Creates folders (if needed) and generates all sprite sheets.

### Show Sample Structure
```bash
./create_spritesheets.sh sample
```
Displays the expected folder structure and file organization.

### Help
```bash
./create_spritesheets.sh help
```
Shows usage information.

## 🎨 Output Format

### Sprite Sheet Layout
Each sprite sheet is a horizontal strip:
```
[Frame 1][Frame 2][Frame 3]...[Frame N]
```

### Generated Files
For each action, the script creates:
- **PNG file:** `public/sprites/<action>_sprite.png`
- **JSON file:** `public/sprites/<action>_sprite.json`

### JSON Metadata Example
```json
{
    "action": "walk",
    "frameCount": 8,
    "frameWidth": 64,
    "frameHeight": 64,
    "sheetWidth": 512,
    "sheetHeight": 64,
    "fps": 12
}
```

## 🔧 Technical Details

### ImageMagick Commands Used
```bash
montage input_*.png \
    -tile "8x1" \
    -geometry "+0+0" \
    -background none \
    output_sprite.png
```

### Optimization
- **OptiPNG:** Automatically applied if installed (`optipng -o7`)
- **Transparent background:** Preserved
- **No spacing:** Zero padding between frames

### Dependencies
- **Required:** ImageMagick (`montage` command)
- **Optional:** OptiPNG (for compression)

Install on Ubuntu/Debian:
```bash
sudo apt-get install imagemagick optipng
```

Install on macOS:
```bash
brew install imagemagick optipng
```

## 🎮 Using in React

### Loading Sprite Sheets
```javascript
// In your React component
import idleSprite from './public/sprites/idle_sprite.json';
import idleImage from './public/sprites/idle_sprite.png';

// Use metadata for animation
const frameWidth = idleSprite.frameWidth;
const frameHeight = idleSprite.frameHeight;
const frameCount = idleSprite.frameCount;
const fps = idleSprite.fps;
```

### Animation Example
```javascript
class StickmanAnimation {
    constructor(spriteData, image) {
        this.image = image;
        this.frameWidth = spriteData.frameWidth;
        this.frameHeight = spriteData.frameHeight;
        this.frameCount = spriteData.frameCount;
        this.fps = spriteData.fps;
        this.currentFrame = 0;
    }

    draw(ctx, x, y) {
        const sx = this.currentFrame * this.frameWidth;
        ctx.drawImage(
            this.image,
            sx, 0, this.frameWidth, this.frameHeight,
            x, y, this.frameWidth, this.frameHeight
        );
    }

    update(deltaTime) {
        const frameDuration = 1000 / this.fps;
        this.currentFrame = Math.floor(Date.now() / frameDuration) % this.frameCount;
    }
}
```

## 🚨 Troubleshooting

### "No PNG files found"
- Check that files are in the correct folder
- Verify files have `.png` extension
- Run `./create_spritesheets.sh sample` to see expected structure

### "Failed to create sprite sheet"
- Verify ImageMagick is installed: `montage --version`
- Check file permissions
- Ensure PNG files are valid

### Wrong frame order
- Rename files with leading zeros: `01.png`, `02.png`, ...
- The script uses `sort -V` for natural sorting

### Transparent background becomes black
- Ensure input PNGs have transparency
- Check ImageMagick version supports transparency

## 📊 Optimization Tips

1. **Consistent frame sizes:** All frames must be identical dimensions
2. **Power of 2 dimensions:** 64×64, 128×128, 256×256 (better GPU performance)
3. **Minimal padding:** Script uses zero padding for efficiency
4. **OptiPNG:** Install for ~30% file size reduction
5. **Sprite sheet size:** Keep under 2048×2048 for compatibility

## 🎯 Next Steps

1. ✅ Run `./create_spritesheets.sh setup`
2. ✅ Create PNG sequences for each action
3. ✅ Run `./create_spritesheets.sh generate`
4. ✅ Integrate sprite sheets into React components
5. ✅ Update animation system to use sprite sheets

---

**Script Version:** 1.0
**Last Updated:** 2026-01-10
**Compatible with:** ImageMagick 6.x/7.x
