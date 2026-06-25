# HashBrown-PinDou 🍓

把任意图片转换成拼豆（Perler/Artkal）图纸。上传照片或插画，调整参数，导出像素级精准的拼豆布局。

## 功能特性

- **图片转拼豆图纸**：任意图片转拼豆图纸，精准颜色匹配
- **多色板预设**：支持 96/120/144/168/221 色板
- **AI 文字生图**：用文字描述生成图片（火山引擎豆包 Seedream）
- **拼豆任务管理**：保存、追踪、继续你的拼豆项目
- **交互式编辑**：手动调色，支持拖选与填充工具
- **导出选项**：导出带坐标和颜色编号的 PNG 图纸

## 技术栈

- **后端**：Python 3.11 / FastAPI
- **图像处理**：Pillow / NumPy
- **颜色匹配**：CIE Lab 色彩空间（欧氏距离）
- **导出**：Pillow（PNG）
- **前端**：Vanilla JS + Jinja2 模板
- **数据存储**：本地 JSON 文件（pindou_task/tasks.json）
- **AI 生图**：火山引擎方舟 Ark API（豆包 Seedream）

## 项目结构

```
HashBrown-PinDou/
├── main.py                 # FastAPI 入口，所有 API 接口
├── requirements.txt        # Python 依赖
├── render.yaml             # Render.com 部署配置
├── core/                   # 图像处理核心
│   ├── color_match.py      # CIE Lab 转换、ArtkalPalette
│   ├── quantizer.py        # 图像量化主管线
│   ├── dithering.py        # Floyd-Steinberg 抖动
│   └── exporter.py         # PNG 导出
├── data/                   # Artkal 色卡数据
│   ├── artkal_m_series.json  # Artkal M 系列全色卡（221 色）
│   └── artkal_presets.json   # 色板预设子集
├── pindou_task/            # 任务数据存储
│   ├── local_client.py     # 本地 JSON 任务 CRUD
│   └── tasks.json          # 任务数据（运行时生成，已 gitignore）
├── pindou_pic/             # AI 生图产物（运行时生成，已 gitignore）
├── templates/
│   └── index.html          # 主页面模板
└── static/                 # 前端资源
    ├── style.css           # 样式
    ├── app.js              # 前端逻辑
    └── i18n.js             # 国际化
```

## 快速开始

```bash
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8080
# 服务运行在 http://localhost:8080
```

### 环境变量

复制 `.env.example` 为 `.env` 并填写：

```env
ARK_API_KEY=你的火山引擎方舟 API Key   # 必填，否则 AI 生图不可用
ARK_DEFAULT_MODEL=ep-m-20260403150322-jjxqm
ARK_IMAGE_API_URL=https://ark.cn-beijing.volces.com/api/v3/images/generations
PORT=8080
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 主页面 |
| GET | `/api/palette` | 获取色板数据与预设 |
| POST | `/api/generate` | 上传图片，返回拼豆图纸 |
| POST | `/api/export/png` | 导出图纸为 PNG |
| POST | `/api/update_cell` | 编辑单个格子颜色 |
| POST | `/api/generate-image` | 文字生成图片（AI） |
| GET/POST/PUT/DELETE | `/api/tasks` | 任务管理 CRUD |
| GET/DELETE | `/api/art-pics` | AI 生图历史列表/清理 |

## 图像量化流程

1. **预处理** — 自适应对比度、饱和度、锐化增强
2. **子色板选择** — 从全色板中选取最相关的颜色
3. **LANCZOS 降采样** — 抗锯齿降采样到目标网格尺寸
4. **量化** — PIL 量化配合子色板（中位切分）
5. **网格多数投票** — 每个网格取众数颜色
6. **颜色合并** — 合并相似的低频颜色
7. **边缘平滑** — 替换孤立的像素点
8. **去背景** — 从边缘洪水填充去除主背景色（可选）

## 参数说明

| 参数 | 范围 | 默认值 | 说明 |
|------|------|--------|------|
| 色板预设 | 96/120/144/168/221 | 221 | 可用拼豆颜色数 |
| 网格尺寸 | 15x15 ~ 96x96 | 48x48 | 输出网格尺寸 |
| 最大颜色数 | 0-60 | 0（自动） | 限制唯一颜色数 |
| 颜色合并阈值 | 0-50 | 0 | 合并相似颜色 |
| 对比度 | -50 ~ +50 | 0（自动） | 图像对比度 |
| 饱和度 | -50 ~ +50 | 0（自动） | 颜色饱和度 |
| 锐度 | -50 ~ +50 | 0（自动） | 边缘锐度 |
| 去背景 | 开/关 | 关 | 去除主边缘色 |
| 抖动 | 开/关 | 关 | Floyd-Steinberg 抖动 |

## 许可证

MIT License
