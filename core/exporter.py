import io
import time
import base64
from typing import List, Dict, Optional

from PIL import Image, ImageDraw, ImageFont

from .color_match import ArtkalPalette


def _draw_rounded_rect(draw, coords, radius, fill, outline=None, width=1):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = coords
    
    # Draw the main rectangle parts
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    
    # Draw the four corners
    draw.ellipse([x0, y0, x0 + 2*radius, y0 + 2*radius], fill=fill)
    draw.ellipse([x1 - 2*radius, y0, x1, y0 + 2*radius], fill=fill)
    draw.ellipse([x0, y1 - 2*radius, x0 + 2*radius, y1], fill=fill)
    draw.ellipse([x1 - 2*radius, y1 - 2*radius, x1, y1], fill=fill)
    
    if outline:
        # Draw outline for rounded rect
        draw.arc([x0, y0, x0 + 2*radius, y0 + 2*radius], 180, 270, fill=outline, width=width)
        draw.arc([x1 - 2*radius, y0, x1, y0 + 2*radius], 270, 360, fill=outline, width=width)
        draw.arc([x0, y1 - 2*radius, x0 + 2*radius, y1], 90, 180, fill=outline, width=width)
        draw.arc([x1 - 2*radius, y1 - 2*radius, x1, y1], 0, 90, fill=outline, width=width)
        draw.line([x0 + radius, y0, x1 - radius, y0], fill=outline, width=width)
        draw.line([x0 + radius, y1, x1 - radius, y1], fill=outline, width=width)
        draw.line([x0, y0 + radius, x0, y1 - radius], fill=outline, width=width)
        draw.line([x1, y0 + radius, x1, y1 - radius], fill=outline, width=width)


def _draw_rounded_square(draw, x, y, size, radius, fill, outline=None, width=1):
    """Draw a rounded square at position (x, y) with given size."""
    _draw_rounded_rect(draw, [x, y, x + size, y + size], radius, fill, outline, width)


def _get_text_color(hex_color: str):
    """Return black or white text color based on background brightness."""
    r, g, b = _hex_to_rgb(hex_color)
    brightness = (r * 299 + g * 587 + b * 114) / 1000
    return (0, 0, 0) if brightness > 128 else (255, 255, 255)


def _is_light_color(hex_color: str):
    """Check if a color is light (needs border for visibility)."""
    r, g, b = _hex_to_rgb(hex_color)
    brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 220


def _try_load_font(size):
    """Try to load a monospace font, fall back to default."""
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", size)
    except (OSError, IOError):
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf", size)
        except (OSError, IOError):
            return ImageFont.load_default()


def _try_load_chinese_font(size):
    """Try to load a Chinese font, fall back to default."""
    import os
    
    # Get the directory where this file is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    font_paths = [
        # Font file in the same directory as this script (highest priority)
        os.path.join(current_dir, "wqy-microhei.ttc"),
        # Project bundled fonts
        os.path.join(current_dir, "..", "static/fonts/wqy-microhei.ttc"),
        # System fonts
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for path in font_paths:
        try:
            abs_path = os.path.abspath(path)
            if os.path.exists(abs_path):
                return ImageFont.truetype(abs_path, size)
        except (OSError, IOError):
            continue
    
    # Last resort: try to load any available Chinese font
    try:
        return ImageFont.truetype("wqy-microhei.ttc", size)
    except:
        pass
    
    return ImageFont.load_default()


def _trim_pixel_matrix(pixel_matrix: List[List[Optional[str]]], padding: int = 2):
    """Trim (auto-crop) the pixel matrix to remove empty rows/columns,
    with a padding of empty rows/columns kept around the content.
    
    Returns:
        (trimmed_matrix, min_row, min_col, max_row, max_col)
        where the bounds are inclusive indices of the original matrix (after padding applied).
    """
    if not pixel_matrix or not pixel_matrix[0]:
        return pixel_matrix, 0, 0, len(pixel_matrix) - 1, len(pixel_matrix[0]) - 1

    grid_h = len(pixel_matrix)
    grid_w = len(pixel_matrix[0])

    # Find first and last non-empty row
    min_row = grid_h
    max_row = -1
    for y in range(grid_h):
        for x in range(grid_w):
            if pixel_matrix[y][x] is not None:
                min_row = min(min_row, y)
                max_row = max(max_row, y)
                break

    # Find first and last non-empty column
    min_col = grid_w
    max_col = -1
    for x in range(grid_w):
        for y in range(grid_h):
            if pixel_matrix[y][x] is not None:
                min_col = min(min_col, x)
                max_col = max(max_col, x)
                break

    # If no content found, return original
    if max_row < 0 or max_col < 0:
        return pixel_matrix, 0, 0, grid_h - 1, grid_w - 1

    # Apply padding, clamped to matrix bounds
    min_row = max(0, min_row - padding)
    max_row = min(grid_h - 1, max_row + padding)
    min_col = max(0, min_col - padding)
    max_col = min(grid_w - 1, max_col + padding)

    trimmed = [row[min_col:max_col + 1] for row in pixel_matrix[min_row:max_row + 1]]
    return trimmed, min_row, min_col, max_row, max_col


def export_png(
    pixel_matrix: List[List[Optional[str]]],
    color_data: Dict[str, str],
    color_summary: List[Dict],
    cell_size: int = 20,
    show_grid: bool = True,
    show_codes_in_cells: bool = True,
    show_coordinates: bool = True,
    palette_preset: str = "221",
    watermark_text: str = "",
    bottom_left_text: str = "",
) -> bytes:
    """Export the bead pattern as a PNG with coordinates, cell codes, and color summary.

    Args:
        pixel_matrix: 2D list of color codes
        color_data: Dict mapping color code -> hex color string
        color_summary: List of color summary dicts
        cell_size: Size of each cell in pixels (default 20)
        show_grid: Whether to draw grid lines
        show_codes_in_cells: Whether to draw color codes in cells
        show_coordinates: Whether to draw coordinate axes
        palette_preset: Preset name for display
        watermark_text: Watermark text displayed across the image
        bottom_left_text: Text to display at bottom left corner

    Returns:
        PNG image as bytes
    """
    if not pixel_matrix or not pixel_matrix[0]:
        return b''

    # --- Auto-trim: remove empty rows/columns ---
    pixel_matrix, orig_min_row, orig_min_col, orig_max_row, orig_max_col = _trim_pixel_matrix(pixel_matrix)

    grid_h = len(pixel_matrix)
    grid_w = len(pixel_matrix[0])

    coord_size = 20 if show_coordinates else 0
    pattern_w = grid_w * cell_size
    pattern_h = grid_h * cell_size

    # --- Draw color summary area (胶囊卡片样式) ---
    # 计算胶囊卡片的尺寸（放大）
    card_h = 36  # 卡片高度（放大）
    card_radius = 18  # 圆角半径
    swatch_size = 24  # 色块大小（放大）
    swatch_radius = 5  # 色块圆角
    card_padding = 10  # 卡片内边距
    
    # 计算每行能放多少卡片，以及所需行数
    n_colors = len(color_summary)
    total_beads = sum(item.get('count', 0) for item in color_summary)
    
    # 预计算每个卡片宽度
    def calc_card_width(item):
        code = item.get('code', '')
        count = item.get('count', 0)
        # 文字宽度估算：放大后的尺寸
        text_width = len(code) * 14 + len(str(count)) * 14 + 25
        return swatch_size + text_width + card_padding * 2 + 10
    
    card_widths = [calc_card_width(item) for item in color_summary]
    card_gap = 16  # 卡片间距
    
    # 计算需要的行数和布局
    rows_cards = []
    current_row = []
    current_width = 0
    max_width = pattern_w - 16  # 左右留白
    
    for i, item in enumerate(color_summary):
        cw = card_widths[i] + (card_gap if current_row else 0)
        if current_width + cw <= max_width:
            current_row.append(i)
            current_width += cw
        else:
            if current_row:
                rows_cards.append(current_row)
            current_row = [i]
            current_width = card_widths[i]
    if current_row:
        rows_cards.append(current_row)
    
    # 卡片行高度 + 统计行高度
    row_h = card_h + 12  # 每行卡片高度（含间距）
    stats_h = 32  # 统计行高度
    summary_h = len(rows_cards) * row_h + stats_h + 24
    
    # 顶部文案区域高度（一行间隔 + 文字高度）
    top_text_h = 28 if bottom_left_text else 0

    img_w = coord_size + pattern_w + coord_size
    img_h = top_text_h + coord_size + pattern_h + coord_size + 1 + summary_h

    img = Image.new('RGBA', (img_w, img_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)

    coord_font = _try_load_font(max(8, cell_size // 3))
    code_font = _try_load_font(max(6, cell_size * 2 // 5)) if show_codes_in_cells else None
    card_font = _try_load_font(16)  # 放大字体
    stats_font = _try_load_chinese_font(16)  # 统计文字
    watermark_font = _try_load_chinese_font(24)

    ox = coord_size  # pattern area origin x
    oy = top_text_h + coord_size  # pattern area origin y（下移以留出顶部文案空间）

    # --- Draw top center text (顶部居中文案) ---
    if bottom_left_text:
        draw.text((img_w // 2, 12), bottom_left_text, fill=(100, 100, 100), font=stats_font, anchor="mt")

    # --- Draw coordinate axes ---
    if show_coordinates:
        coord_color = (136, 136, 136)
        # Top column numbers (1 -> N)
        for x in range(grid_w):
            label = str(x + 1)
            cx = ox + x * cell_size + cell_size // 2
            draw.text((cx, oy - 14), label, fill=coord_color, font=coord_font, anchor="mm")
        # Bottom column numbers (N -> 1, reversed)
        for x in range(grid_w):
            label = str(grid_w - x)
            cx = ox + x * cell_size + cell_size // 2
            draw.text((cx, oy + pattern_h + 10), label, fill=coord_color, font=coord_font, anchor="mm")
        # Left row numbers
        for y in range(grid_h):
            label = str(y + 1)
            cy = oy + y * cell_size + cell_size // 2
            draw.text((ox - 10, cy), label, fill=coord_color, font=coord_font, anchor="mm")
        # Right row numbers
        for y in range(grid_h):
            label = str(y + 1)
            cy = oy + y * cell_size + cell_size // 2
            draw.text((ox + pattern_w + 10, cy), label, fill=coord_color, font=coord_font, anchor="mm")

    # --- Draw cells ---
    for y in range(grid_h):
        for x in range(grid_w):
            code = pixel_matrix[y][x]
            x0 = ox + x * cell_size
            y0 = oy + y * cell_size
            x1 = x0 + cell_size
            y1 = y0 + cell_size

            if code is None:
                # Transparent: draw checkerboard
                bk = max(2, cell_size // 5)
                for cy_c in range(y0, y1, bk):
                    for cx_c in range(x0, x1, bk):
                        ix = (cx_c - x0) // bk
                        iy = (cy_c - y0) // bk
                        clr = (220, 220, 220, 255) if (ix + iy) % 2 == 0 else (180, 180, 180, 255)
                        draw.rectangle([cx_c, cy_c, min(cx_c + bk, x1), min(cy_c + bk, y1)], fill=clr)
            else:
                hex_color = color_data.get(code, '#FFFFFF')
                r, g, b = _hex_to_rgb(hex_color)
                draw.rectangle([x0, y0, x1, y1], fill=(r, g, b, 255))

                # Draw code text if cell is large enough
                if show_codes_in_cells and cell_size >= 16 and code_font:
                    tc = _get_text_color(hex_color)
                    cx = x0 + cell_size // 2
                    cy = y0 + cell_size // 2
                    draw.text((cx, cy), code, fill=tc, font=code_font, anchor="mm")

    # --- Draw grid lines ---
    if show_grid:
        grid_color = (180, 180, 180)
        for x in range(grid_w + 1):
            lx = ox + x * cell_size
            draw.line([(lx, oy), (lx, oy + pattern_h)], fill=grid_color, width=1)
        for y in range(grid_h + 1):
            ly = oy + y * cell_size
            draw.line([(ox, ly), (ox + pattern_w, ly)], fill=grid_color, width=1)

    # --- Draw color summary area (胶囊卡片样式) ---
    summary_top = oy + pattern_h + coord_size + 1
    draw.line([(ox, summary_top - 1), (ox + pattern_w, summary_top - 1)], fill=(230, 230, 230), width=1)
    draw.rectangle([ox, summary_top, ox + pattern_w, img_h], fill=(255, 255, 255, 255))

    # 绘制胶囊卡片（左对齐）
    card_start_y = summary_top + 12
    card_bg_color = (248, 248, 248)  # 浅灰色背景
    
    for row_idx, row in enumerate(rows_cards):
        row_y = card_start_y + row_idx * row_h
        
        # 左对齐：从左边开始
        row_x = ox + 8
        
        for i in row:
            item = color_summary[i]
            cw = card_widths[i]
            
            # 绘制胶囊卡片背景
            _draw_rounded_rect(
                draw, 
                [row_x, row_y, row_x + cw, row_y + card_h],
                card_radius, 
                card_bg_color
            )
            
            # 绘制圆角色块
            hex_c = item.get('hex', '#FFFFFF')
            r, g, b = _hex_to_rgb(hex_c)
            swatch_x = row_x + card_padding
            swatch_y = row_y + (card_h - swatch_size) // 2
            
            # 如果是浅色，添加边框
            outline_color = (200, 200, 200) if _is_light_color(hex_c) else None
            _draw_rounded_square(
                draw, swatch_x, swatch_y, swatch_size, swatch_radius,
                (r, g, b, 255), outline=outline_color, width=1
            )
            
            # 绘制色号和数量
            code = item.get('code', '')
            count = item.get('count', 0)
            
            text_x = swatch_x + swatch_size + 8
            text_y = row_y + (card_h - 16) // 2  # 垂直居中
            
            # 色号（深色加粗）
            draw.text((text_x, text_y), code, fill=(40, 40, 40), font=card_font)
            
            # 数量（在色号后面，灰色）
            count_text = f" {count}"
            bbox = card_font.getbbox(code)
            code_width = bbox[2] - bbox[0]
            draw.text((text_x + code_width, text_y), count_text, fill=(100, 100, 100), font=card_font)
            
            row_x += cw + card_gap
    
    # 绘制底部统计文字
    stats_y = card_start_y + len(rows_cards) * row_h + 8
    stats_text = f"{n_colors}种颜色, 共{total_beads}颗豆子"
    draw.text((ox + 8, stats_y), stats_text, fill=(100, 100, 100), font=stats_font)

    # --- Draw cross grid overlay with watermark (灰色十字格 + 水印) ---
    grid_layer = Image.new('RGBA', img.size, (255, 255, 255, 0))
    grid_draw = ImageDraw.Draw(grid_layer)
    grid_color = (150, 150, 150, 120)  # 灰色半透明
    
    # Draw vertical lines
    for x in range(grid_w + 1):
        lx = ox + x * cell_size
        grid_draw.line([(lx, oy), (lx, oy + pattern_h)], fill=grid_color, width=1)
    # Draw horizontal lines
    for y in range(grid_h + 1):
        ly = oy + y * cell_size
        grid_draw.line([(ox, ly), (ox + pattern_w, ly)], fill=grid_color, width=1)
    
    # Add watermark at grid intersections (稀疏展示, 45度倾斜)
    if watermark_text:
        watermark_color = (50, 50, 50, 180)  # 更深的灰色，更高不透明度
        bbox = grid_draw.textbbox((0, 0), watermark_text, font=watermark_font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        # Create rotated watermark text layer
        # Create a single watermark text image
        text_layer = Image.new('RGBA', (text_w + 20, text_h + 20), (255, 255, 255, 0))
        text_draw = ImageDraw.Draw(text_layer)
        text_draw.text((10, 10), watermark_text, fill=watermark_color, font=watermark_font)

        # Rotate 45 degrees
        rotated_text = text_layer.rotate(-45, expand=True, resample=Image.BICUBIC)
        rotated_w, rotated_h = rotated_text.size

        # Place watermark every 3-4 grid cells to avoid being too dense
        grid_spacing_x = max(cell_size * 5, rotated_w + 20)
        grid_spacing_y = max(cell_size * 5, rotated_h + 20)

        # Calculate starting position aligned with grid
        start_x = ox + cell_size
        start_y = oy + cell_size

        row_idx = 0
        wy = start_y
        while wy < oy + pattern_h:
            # Alternate offset for each row
            wx = start_x + (grid_spacing_x // 2 if row_idx % 2 == 1 else 0)
            while wx < ox + pattern_w:
                grid_layer.paste(rotated_text, (int(wx), int(wy)), rotated_text)
                wx += grid_spacing_x
            wy += grid_spacing_y
            row_idx += 1

        img = Image.alpha_composite(img, grid_layer)

    # Convert RGBA to RGB for PNG output
    bg = Image.new('RGB', img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])

    buf = io.BytesIO()
    bg.save(buf, format='PNG')
    return buf.getvalue()


def generate_preview_base64(
    pixel_matrix: List[List[Optional[str]]],
    palette: ArtkalPalette,
    max_size: int = 400,
) -> str:
    """Generate a base64-encoded preview image for quick display.

    Args:
        pixel_matrix: 2D list of color codes
        palette: ArtkalPalette instance
        max_size: Maximum dimension of the preview image

    Returns:
        Base64-encoded PNG string with data URI prefix
    """
    if not pixel_matrix or not pixel_matrix[0]:
        return ''

    grid_h = len(pixel_matrix)
    grid_w = len(pixel_matrix[0])

    cell_size = max(1, min(max_size // max(grid_w, grid_h), 10))

    img_w = grid_w * cell_size
    img_h = grid_h * cell_size

    img = Image.new('RGB', (img_w, img_h), (255, 255, 255))
    pixels = img.load()

    for y in range(grid_h):
        for x in range(grid_w):
            code = pixel_matrix[y][x]
            if code is not None:
                color_info = palette.get_by_code(code)
                if color_info:
                    r, g, b = color_info['rgb']
                else:
                    r, g, b = 255, 255, 255
            else:
                r, g, b = 220, 220, 220

            for dy in range(cell_size):
                for dx in range(cell_size):
                    px = x * cell_size + dx
                    py = y * cell_size + dy
                    if px < img_w and py < img_h:
                        pixels[px, py] = (r, g, b)

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    return f'data:image/png;base64,{b64}'


def _hex_to_rgb(hex_str: str):
    """Convert hex color string to RGB tuple."""
    hex_str = hex_str.lstrip('#')
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
