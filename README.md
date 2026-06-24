# HashBrown-PinDou

Convert any image into a Perler/Artkal bead pattern. Upload a photo or illustration, adjust parameters, and export a pixel-perfect bead layout.

## Features

- **Image to Bead Pattern**: Convert any image to a bead pattern with precise color matching
- **Multiple Palette Presets**: Support for 96/120/144/168/221 color palettes
- **AI Image Generation**: Generate images from text prompts using AI
- **Bead Board Task Management**: Save, track, and continue your bead projects
- **Interactive Editing**: Manual color adjustment with drag-to-select and fill tools
- **Export Options**: Export patterns as PNG with coordinates and color codes

## Tech Stack

- **Backend**: Python 3.11 / FastAPI
- **Image Processing**: Pillow / NumPy
- **Color Matching**: CIE Lab color space (Euclidean distance)
- **Export**: Pillow (PNG)
- **Frontend**: Vanilla JS + Jinja2 templates
- **Database**: Supabase (PostgreSQL)
- **AI Image Generation**: coze-coding-dev-sdk

## Project Structure

```
Pindou/
├── main.py                 # FastAPI entry, all API endpoints
├── requirements.txt        # Python dependencies
├── core/
│   ├── color_match.py      # CIE Lab conversion, ArtkalPalette
│   ├── quantizer.py        # Image quantization pipeline
│   ├── dithering.py        # Floyd-Steinberg dithering
│   └── exporter.py         # PNG export
├── data/
│   ├── artkal_m_series.json  # Artkal M-series bead colors
│   └── artkal_presets.json   # Preset subsets
├── src/storage/database/
│   ├── model.py            # Database models
│   └── supabase_client.py  # Supabase client
├── templates/
│   └── index.html          # Main page template
└── static/
    ├── style.css           # Styles
    ├── app.js              # Frontend logic
    └── i18n.js             # Internationalization
```

## Quick Start

```bash
pip install -r requirements.txt
python main.py
# Server runs at http://localhost:5000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Main web UI |
| GET | `/api/palette` | Full palette data + presets |
| POST | `/api/generate` | Upload image, return bead pattern |
| POST | `/api/export/png` | Export pattern as PNG |
| POST | `/api/update_cell` | Edit a single cell color |
| POST | `/api/generate-image` | Generate image from text prompt |
| GET/POST/PUT/DELETE | `/api/tasks` | Task management CRUD |

## Image Quantization Pipeline

1. **Preprocessing** - Adaptive contrast, saturation, sharpness enhancement
2. **Sub-palette Selection** - Select most relevant colors from the full palette
3. **LANCZOS Downscale** - Anti-aliased downscale to target grid size
4. **Quantize** - PIL quantize with sub-palette (median cut)
5. **Mode-Pool to Grid** - Majority vote for each grid cell
6. **Color Merging** - Merge similar low-frequency colors
7. **Edge Smoothing** - Replace isolated single-pixel islands
8. **Background Removal** - Flood-fill from border edges (optional)

## Parameter Guide

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Palette Preset | 96/120/144/168/221 | 221 | Number of available bead colors |
| Grid Size | 15x15 ~ 96x96 | 48x48 | Output grid dimensions |
| Max Colors | 0-60 | 0 (auto) | Limit unique colors |
| Color Merge Threshold | 0-50 | 0 | Merge similar colors |
| Contrast | -50 ~ +50 | 0 (auto) | Image contrast |
| Saturation | -50 ~ +50 | 0 (auto) | Color saturation |
| Sharpness | -50 ~ +50 | 0 (auto) | Edge sharpness |
| Background Removal | on/off | off | Remove dominant border color |
| Dithering | on/off | off | Floyd-Steinberg dithering |

## License

MIT License
