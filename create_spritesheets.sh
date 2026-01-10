#!/bin/bash
# Sprite Sheet Generator for Stickman React
# Converts PNG sequences into sprite sheets using ImageMagick
#
# Usage: ./create_spritesheets.sh
# Place PNG sequences in the appropriate folders first

# Configuration
SPRITE_DIR="sprite_assets"
OUTPUT_DIR="public/sprites"
TEMP_DIR="/tmp/sprite_temp"

# Action definitions with recommended frame counts
declare -A ACTIONS=(
    ["idle"]="12"      # 12 frames: breathing, small bounce, hair sway
    ["walk"]="8"       # 8 frames: alternating legs, arm swing, contact-plant-push
    ["run"]="6"        # 6 frames: both feet off ground, hair flow
    ["attack_slash"]="6" # 6 frames: anticipation→swing→follow-through
    ["hurt"]="3"       # 3 frames: sudden lean back, flash effect
    ["victory"]="8"    # 8 frames: jump, hand raise, sparkle pop
)

# Create directory structure
setup_directories() {
    echo "📁 Creating directory structure..."

    # Main sprite directory
    mkdir -p "$SPRITE_DIR"
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$TEMP_DIR"

    # Create subdirectories for each action
    for action in "${!ACTIONS[@]}"; do
        mkdir -p "$SPRITE_DIR/$action"
        echo "  ✓ Created: $SPRITE_DIR/$action"
    done

    echo ""
}

# Function to generate sprite sheet for a single action
generate_spritesheet() {
    local action=$1
    local frame_count=$2
    local input_dir="$SPRITE_DIR/$action"
    local output_file="$OUTPUT_DIR/${action}_sprite.png"

    echo "🎨 Processing: $action (${frame_count} frames)"

    # Check if input directory exists and has files
    if [ ! -d "$input_dir" ]; then
        echo "  ⚠️  Warning: Directory $input_dir not found"
        return 1
    fi

    # Count PNG files
    local png_count=$(find "$input_dir" -name "*.png" | wc -l)
    if [ "$png_count" -eq 0 ]; then
        echo "  ⚠️  Warning: No PNG files found in $input_dir"
        return 1
    fi

    echo "  📊 Found $png_count PNG files"

    # Sort files numerically (handles frame_01.png, frame_02.png, etc.)
    local files=($(find "$input_dir" -name "*.png" | sort -V))

    if [ ${#files[@]} -eq 0 ]; then
        echo "  ⚠️  Warning: No files to process"
        return 1
    fi

    # Get dimensions of first frame
    local first_frame="${files[0]}"
    local dimensions=$(identify -format "%wx%h" "$first_frame")
    local width=$(echo $dimensions | cut -d'x' -f1)
    local height=$(echo $dimensions | cut -d'x' -f2)

    echo "  📐 Frame dimensions: ${width}x${height}"

    # Calculate sprite sheet dimensions
    # Horizontal layout for smooth animation
    local sheet_width=$((width * frame_count))
    local sheet_height=$height

    echo "  📏 Sprite sheet: ${sheet_width}x${sheet_height}"

    # Generate sprite sheet using ImageMagick montage
    # -tile ${frame_count}x1: horizontal layout
    # -geometry +0+0: no spacing between frames
    # -background none: transparent background
    montage "${files[@]}" \
        -tile "${frame_count}x1" \
        -geometry "+0+0" \
        -background none \
        "$output_file"

    if [ $? -eq 0 ]; then
        # Optimize the sprite sheet
        if command -v optipng &> /dev/null; then
            echo "  🔧 Optimizing with optipng..."
            optipng -o7 "$output_file" > /dev/null 2>&1
        fi

        # Verify output
        local output_size=$(identify -format "%wx%h" "$output_file")
        echo "  ✅ Success: $output_file (${output_size})"

        # Create metadata file
        cat > "${output_file%.png}.json" << EOF
{
    "action": "$action",
    "frameCount": $frame_count,
    "frameWidth": $width,
    "frameHeight": $height,
    "sheetWidth": $sheet_width,
    "sheetHeight": $sheet_height,
    "fps": 12
}
EOF
        return 0
    else
        echo "  ❌ Error: Failed to create sprite sheet"
        return 1
    fi
}

# Function to generate all sprite sheets
generate_all() {
    echo "🚀 Generating sprite sheets..."
    echo "=========================================="

    local success_count=0
    local total_count=0

    for action in "${!ACTIONS[@]}"; do
        frame_count=${ACTIONS[$action]}
        if generate_spritesheet "$action" "$frame_count"; then
            ((success_count++))
        fi
        ((total_count++))
        echo ""
    done

    echo "=========================================="
    echo "📊 Summary: $success_count/$total_count sprite sheets generated"

    if [ $success_count -eq $total_count ]; then
        echo "🎉 All sprite sheets created successfully!"
    else
        echo "⚠️  Some sprite sheets failed. Check warnings above."
    fi
}

# Function to create sample structure
create_sample_structure() {
    echo "📝 Creating sample folder structure..."
    echo ""
    echo "Place your PNG sequences in these folders:"
    echo ""

    for action in "${!ACTIONS[@]}"; do
        frame_count=${ACTIONS[$action]}
        echo "  $SPRITE_DIR/$action/"
        echo "    Expected: $frame_count frames"
        echo "    Naming: frame_01.png, frame_02.png, ... or any order (sorted numerically)"
        echo ""
    done

    echo "Example file structure:"
    echo "  sprite_assets/"
    echo "  ├── idle/"
    echo "  │   ├── frame_01.png"
    echo "  │   ├── frame_02.png"
    echo "  │   └── ..."
    echo "  ├── walk/"
    echo "  │   ├── 001.png"
    echo "  │   ├── 002.png"
    echo "  │   └── ..."
    echo "  └── ..."
    echo ""
}

# Function to show usage
show_usage() {
    echo "Stickman React - Sprite Sheet Generator"
    echo "======================================="
    echo ""
    echo "Usage:"
    echo "  ./create_spritesheets.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup      - Create folder structure only"
    echo "  generate   - Generate sprite sheets from PNG sequences"
    echo "  sample     - Show sample folder structure"
    echo "  help       - Show this help message"
    echo ""
    echo "Actions:"
    for action in "${!ACTIONS[@]}"; do
        frame_count=${ACTIONS[$action]}
        echo "  • $action: $frame_count frames"
    done
    echo ""
    echo "Steps:"
    echo "  1. Run: ./create_spritesheets.sh setup"
    echo "  2. Place PNG sequences in sprite_assets/<action>/"
    echo "  3. Run: ./create_spritesheets.sh generate"
    echo "  4. Find output in public/sprites/"
    echo ""
}

# Main execution
case "${1:-generate}" in
    "setup")
        setup_directories
        ;;
    "generate")
        setup_directories
        generate_all
        ;;
    "sample")
        create_sample_structure
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        echo "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
