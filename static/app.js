// === Pindou Frontend Application ===

// Wrapper around fetch for API requests
function fetchWithAuth(url, options = {}) {
  return fetch(url, options);
}

// Global state
window.appState = {
  originalImage: null,
  pixelMatrix: null,
  colorData: {},
  colorSummary: [],
  fullPalette: {},         // code -> {hex, name, ...} for ALL 221 colors
  fullPaletteList: [],     // ordered array of all colors
  presets: {},             // preset definitions from server
  palettePreset: '221',   // current preset key
  gridSize: { width: 0, height: 0 },
  activeColors: new Set(),
  editMode: false,
  brushColor: undefined,    // current brush color code for quick fill (undefined=not selected, null=transparent/X0)
  selectedCells: new Set(), // selected cells for batch edit: "row,col" strings
  hoveredCell: null,        // {row, col} current hovered cell
  isDragging: false,        // drag selection in progress
  dragStart: null,          // {row, col} drag start cell
  sessionId: null,
  totalBeads: 0,
  editingTaskId: null,      // current task being edited (null = new pattern)
  backgroundColor: null,    // background color code (if remove_bg was applied)
};

// === Language / i18n System ===
const translations = {
  en: {
    // Brand
    'app.brand': '🍓 Anything Can Be Beaded',
    // Header Tabs
    'tab.image_generate': '✨ Image Generation',
    'tab.pattern_generate': '🎨 Pattern Generation',
    'tab.bead_board': '🧺 Bead Board',
    
    // Generate Tab
    'generate.prompt': 'Prompt',
    'generate.prompt_hint': 'Detailed description works better',
    'generate.model': 'Model',
    'generate.model_hint': 'Choose the image generation model',
    'generate.reference_image': 'Reference Image (Optional)',
    'generate.ref_hint': 'Upload reference image',
    'generate.ref_desc': 'Optional. Upload a reference image, AI will generate based on it and prompt.',
    'generate.empty': 'Enter prompt to generate image',
    'generate.history': 'History',
    'generate.history_empty': 'No history images yet',
    'generate.clear_confirm': 'Clear all history images? This action cannot be undone.',
    'generate.clear_title': 'Clear History',
    'generate.clear_success': 'History images cleared',

    // Upload
    'upload.drop_hint': 'Drop image here or click to upload',
    'upload.format_hint': 'JPG, PNG, GIF, WEBP',
    'upload.size_error': 'Image too large (max 20MB)',
    'upload.type_error': 'Invalid image format',
    
    // Settings
    'settings.palette_preset': 'Palette Preset',
    'settings.board_size': 'Bead Board Size',
    'settings.fixed_grid': 'Fixed Grid',
    'settings.pixel_block': 'Pixel Block Size',
    'settings.pixel_block_label': 'Pixel block size:',
    'settings.color_controls': 'Color Controls',
    'settings.max_colors': 'Max colors:',
    'settings.max_colors_hint': '0 = unlimited (auto). Drag to limit the number of colors used.',
    'settings.merge_threshold': 'Color merge threshold:',
    'settings.merge_hint': 'Merge similar colors to reduce total count. Higher = more merging.',
    'settings.image_adjustments': 'Image Adjustments',
    'settings.contrast': 'Contrast:',
    'settings.saturation': 'Saturation:',
    'settings.sharpness': 'Sharpness:',
    'settings.adjust_hint': '0 = auto-detect. Drag left to reduce, right to boost.',
    'settings.dithering': 'Dithering',
    'settings.enable_dithering': 'Enable Floyd-Steinberg dithering',
    'settings.dithering_hint': 'Produces smoother color transitions but takes longer',
    'settings.export_settings': 'Export Settings',
    'settings.auto_remove_bg': 'Auto remove background',
    'settings.watermark_text': 'Watermark:',
    'settings.bottom_left_text': 'Blueprint label:',
    'settings.search_color': 'Search color...',
    
    // Buttons
    'btn.reset': 'Reset',
    'btn.generate': 'Generate Pattern',
    'btn.make_pattern': 'Make Pattern',
    'btn.generate_image': 'Generate Image',
    'btn.copy': 'Copy',
    'btn.download': 'Download',
    'btn.send_to_pattern': 'Send to Pattern',
    'btn.edit': 'Edit',
    'btn.exit_edit': 'Exit edit',
    'btn.export_png': 'Export PNG',
    'btn.save_task': 'Save as Task',
    'btn.mirror': 'Mirror',
    'btn.export_mirror': 'Export Mirror',
    'btn.undo': 'Undo',
    'btn.redo': 'Redo',
    'btn.clear': 'Clear',
    'btn.fill': 'Fill',
    'btn.cancel': 'Cancel',
    'btn.confirm': 'Confirm',
    'btn.delete': 'Delete',
    'btn.continue': 'Continue',
    
    // Result
    'result.empty': 'Upload an image and generate a pattern',
    'result.colors_used': 'Colors Used',
    'result.colors_total': '{{colors}} colors, {{beads}} beads total',
    'result.total_beads': 'Total: {{count}} beads',
    'result.pattern_info': 'Pattern: {{width}}×{{height}}',
    
    // Tasks
    'tasks.title': 'My Bead Tasks',
    'tasks.empty': 'No tasks yet.',
    'tasks.search': 'Search tasks...',
    'tasks.preview': 'Preview',
    'tasks.colors': 'Color Summary',
    'tasks.grid_size': 'Size:',
    'tasks.total_beads': 'Total Beads:',
    'tasks.continue': 'Continue',
    'tasks.delete': 'Delete',
    'tasks.delete_confirm': 'Delete this task?',
    'tasks.save_success': 'Task saved successfully',
    'tasks.save_failed': 'Failed to save task',
    'tasks.load_failed': 'Failed to load task',
    
    // Edit Mode
    'edit.enter': 'Enter edit mode',
    'edit.exit': 'Exit edit mode',
    'edit.brush': 'Brush: {{color}}',
    'edit.cells_selected': '{{count}} cells selected',
    'edit.hint': 'Press Space to fill with brush color',
    'edit.exit_hint': 'Press Esc to exit',
    'edit.transparent': 'Transparent (X0)',
    'edit.fill_hint': 'Left click to fill, right click to pick color',
    'edit.select_hint': 'Drag to select multiple cells',
    
    // Toasts
    'toast.gen_success': 'Pattern generated!',
    'toast.gen_failed': 'Generation failed',
    'toast.png_success': 'PNG exported!',
    'toast.png_failed': 'Export failed',
    'toast.mirror_success': 'Mirror PNG exported!',
    'toast.img_uploaded': 'Image uploaded',
    'toast.copied': 'Copied to clipboard',
    'toast.pixel_too_small': 'Pixel size too small',
    'toast.continue_hint': 'Click to continue editing',
    'toast.task_name_required': 'Task name required',
    'toast.please_generate_first': 'Please generate a pattern first',
    'toast.image_gen_success': 'Image generated!',
    'toast.image_gen_failed': 'Image generation failed',
    'toast.ref_uploaded': 'Reference image uploaded',
    'toast.reset_success': 'Settings reset',
    'toast.upload_first': 'Please upload an image first',
    'toast.pattern_result': 'Pattern: {{w}}x{{h}}, {{c}} colors',
    'toast.timeout': 'Request timeout, please try again',
    'toast.cells_filled': '{{count}} cells filled',
    'toast.brush_set': 'Brush set to {{code}}',
    'toast.edit_mode_hint': 'Click cell to edit, Space to fill',
    'toast.update_failed': 'Update failed',
    'toast.no_pattern': 'No pattern to export',
    'toast.processing': 'Processing...',
    
    // Generate Tab (Image Gen)
    'generate.no_prompt': 'Please enter a prompt',
    'generate.success': 'Image generated successfully',
    'generate.failed': 'Image generation failed',
    
    // Tasks
    'tasks.delete_success': 'Task deleted',
    'tasks.no_pattern': 'Task has no pattern data',
    
    // Value labels
    'value.auto': 'Auto',
    'value.off': 'Off',
  },
  zh: {
    // Brand
    'app.brand': '🍓 万物皆可拼',
    // Header Tabs
    'tab.image_generate': '✨ AI出图',
    'tab.pattern_generate': '🎨 制作图纸',
    'tab.bead_board': '🧺 拼豆任务',
    
    // Generate Tab
    'generate.prompt': '提示词',
    'generate.prompt_hint': '详细描述效果更好',
    'generate.model': '模型选择',
    'generate.model_hint': '选择适合的图像生成模型',
    'generate.reference_image': '参考图片（可选）',
    'generate.ref_hint': '上传参考图片',
    'generate.ref_desc': '可选。上传参考图后，AI 会基于参考图和提示词生成新图像',
    'generate.empty': '输入提示词开始生成图像',
    'generate.history': '历史图片',
    'generate.history_empty': '暂无历史图片',
    'generate.clear_confirm': '确认清空所有历史图片？此操作不可恢复。',
    'generate.clear_title': '清空历史',
    'generate.clear_success': '历史图片已清空',
    
    // Upload
    'upload.drop_hint': '拖拽图片到此处或点击上传',
    'upload.format_hint': 'JPG, PNG, GIF, WEBP',
    'upload.size_error': '图片过大（最大20MB）',
    'upload.type_error': '图片格式无效',
    
    // Settings
    'settings.palette_preset': '色卡预设',
    'settings.board_size': '拼豆板尺寸',
    'settings.fixed_grid': '固定网格',
    'settings.pixel_block': '像素块大小',
    'settings.pixel_block_label': '像素块大小：',
    'settings.color_controls': '颜色控制',
    'settings.max_colors': '最大颜色数：',
    'settings.max_colors_hint': '0 = 不限制（自动）。拖动以限制使用的颜色数量。',
    'settings.merge_threshold': '颜色合并阈值：',
    'settings.merge_hint': '合并相似颜色以减少总数。数值越高 = 合并越多。',
    'settings.image_adjustments': '图像调整',
    'settings.contrast': '对比度：',
    'settings.saturation': '饱和度：',
    'settings.sharpness': '锐度：',
    'settings.adjust_hint': '0 = 自动检测。向左拖动减少，向右拖动增强。',
    'settings.dithering': '抖动',
    'settings.enable_dithering': '启用 Floyd-Steinberg 抖动',
    'settings.dithering_hint': '产生更平滑的颜色过渡但需要更长时间',
    'settings.export_settings': '导出设置',
    'settings.auto_remove_bg': '自动去除背景',
    'settings.watermark_text': '水印：',
    'settings.bottom_left_text': '图纸标注文案：',
    'settings.search_color': '搜索颜色...',
    
    // Buttons
    'btn.reset': '重置',
    'btn.generate': '生成图案',
    'btn.make_pattern': '制作图纸',
    'btn.generate_image': '生成图像',
    'btn.copy': '复制',
    'btn.download': '下载',
    'btn.send_to_pattern': '发送到图案',
    'btn.edit': '编辑',
    'btn.exit_edit': '退出编辑',
    'btn.export_png': '导出 PNG',
    'btn.save_task': '保存任务',
    'btn.mirror': '镜像',
    'btn.export_mirror': '导出镜像',
    'btn.undo': '撤销',
    'btn.redo': '重做',
    'btn.clear': '清空',
    'btn.fill': '填充',
    'btn.cancel': '取消',
    'btn.confirm': '确认',
    'btn.delete': '删除',
    'btn.continue': '继续',
    
    // Result
    'result.empty': '上传图片并生成图案',
    'result.colors_used': '使用颜色',
    'result.colors_total': '共 {{colors}} 种颜色，{{beads}} 颗',
    'result.total_beads': '总计：{{count}} 颗',
    'result.pattern_info': '图案：{{width}}×{{height}}',
    
    // Tasks
    'tasks.title': '我的拼豆任务',
    'tasks.empty': '暂无任务',
    'tasks.search': '搜索任务...',
    'tasks.preview': '预览',
    'tasks.colors': '颜色汇总',
    'tasks.grid_size': '尺寸：',
    'tasks.total_beads': '总颗粒数：',
    'tasks.continue': '继续',
    'tasks.delete': '删除',
    'tasks.delete_confirm': '确定删除此任务？',
    'tasks.save_success': '任务保存成功',
    'tasks.save_failed': '任务保存失败',
    'tasks.load_failed': '任务加载失败',
    
    // Edit Mode
    'edit.enter': '进入编辑模式',
    'edit.exit': '退出编辑模式',
    'edit.brush': '画笔：{{color}}',
    'edit.cells_selected': '已选 {{count}} 个格子',
    'edit.hint': '按空格键用画笔颜色填充',
    'edit.exit_hint': '按 Esc 退出',
    'edit.transparent': '透明 (X0)',
    'edit.fill_hint': '左键填充颜色，右键吸取颜色',
    'edit.select_hint': '拖动选择多个格子',
    
    // Toasts
    'toast.gen_success': '图案生成成功！',
    'toast.gen_failed': '生成失败',
    'toast.png_success': 'PNG 导出成功！',
    'toast.png_failed': '导出失败',
    'toast.mirror_success': '镜像 PNG 导出成功！',
    'toast.img_uploaded': '图片已上传',
    'toast.copied': '已复制到剪贴板',
    'toast.pixel_too_small': '像素太小',
    'toast.continue_hint': '点击继续编辑',
    'toast.task_name_required': '请输入任务名称',
    'toast.please_generate_first': '请先生成图案',
    'toast.image_gen_success': '图像生成成功！',
    'toast.image_gen_failed': '图像生成失败',
    'toast.ref_uploaded': '参考图片已上传',
    'toast.reset_success': '设置已重置',
    'toast.upload_first': '请先上传图片',
    'toast.pattern_result': '图案：{{w}}x{{h}}，{{c}} 种颜色',
    'toast.timeout': '请求超时，请重试',
    'toast.cells_filled': '已填充 {{count}} 个格子',
    'toast.brush_set': '画笔已设置为 {{code}}',
    'toast.edit_mode_hint': '点击格子编辑，空格填充',
    'toast.update_failed': '更新失败',
    'toast.no_pattern': '无图案可导出',
    'toast.processing': '处理中...',
    
    // Generate Tab (Image Gen)
    'generate.no_prompt': '请输入提示词',
    'generate.success': '图像生成成功',
    'generate.failed': '图像生成失败',
    
    // Tasks
    'tasks.delete_success': '任务已删除',
    'tasks.no_pattern': '任务无图案数据',
    
    // Value labels
    'value.auto': '自动',
    'value.off': '关闭',
  }
};

// Current language state
let currentLang = localStorage.getItem('nnstudio_lang') || 'zh';

// Translation function
function t(key, params = {}) {
  const lang = translations[currentLang] || translations.en;
  let text = lang[key] || translations.en[key] || key;
  
  // Replace placeholders
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
  });
  
  return text;
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'text') {
      el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  
  // Update language toggle button
  const langLabel = document.getElementById('lang-label');
  if (langLabel) {
    langLabel.textContent = currentLang === 'zh' ? 'EN' : '中';
  }
  
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.classList.toggle('active', currentLang === 'zh');
  }
  
  // Update document title
  document.title = currentLang === 'zh' ? 'Pindou - 拼豆图案生成器' : 'Pindou - Bead Pattern Generator';
}

// Toggle language
function toggleLanguage() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('nnstudio_lang', currentLang);
  applyTranslations();
  
  // Re-render dynamic content if needed
  if (window.appState.pixelMatrix) {
    renderCanvas();
    renderColorPanel(); // Re-render color panel for language change
  }
  loadArtPicHistory(); // Re-render history list (empty hint + buttons)
  
  showToast(currentLang === 'zh' ? '语言已切换为中文' : 'Language changed to English');
}

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
  loadFullPalette();
  initUpload();
  initTabs();
  initControls();
  initImageGeneration();
  applyTranslations();
  initKeyboardShortcuts();
  loadArtPicHistory();

  // Restore the tab the user was on before refresh (default: generate)
  const savedTab = localStorage.getItem('pindou_active_tab');
  if (savedTab && document.getElementById(`tab-${savedTab}`)) {
    switchMainTab(savedTab);
  }
});

// === Keyboard Shortcuts ===
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Space key to fill selected cells in edit mode
    if (e.code === 'Space' && window.appState.editMode) {
      // brushColor can be null (X0 - transparent), so check for undefined
      if (window.appState.selectedCells.size > 0 && window.appState.brushColor !== undefined) {
        e.preventDefault();
        fillSelectedCells();
      }
    }
  });
}

async function loadFullPalette() {
  try {
    const resp = await fetchWithAuth('/api/palette');
    if (resp.ok) {
      const data = await resp.json();
      const colors = data.colors || [];
      window.appState.fullPaletteList = colors;
      colors.forEach(c => {
        window.appState.fullPalette[c.code] = c;
      });
      window.appState.presets = data.presets || {};
    }
  } catch (e) {
    console.error('Failed to load palette', e);
  }
}

// === Get current preset color list for edit popover ===
function getPresetColorList() {
  const { presets, palettePreset, fullPaletteList, fullPalette } = window.appState;
  const preset = presets[palettePreset];
  if (!preset || !preset.codes) {
    return fullPaletteList;
  }
  return preset.codes
    .map(code => fullPalette[code])
    .filter(c => c != null);
}

// === Preset Selection ===
function setPreset(key) {
  window.appState.palettePreset = key;
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });
}

// === Reset Settings to Default ===
function resetSettings() {
  // Reset palette preset
  setPreset('221');

  // Reset grid mode
  document.querySelector('input[name="grid-mode"][value="fixed"]').checked = true;
  setGridMode('fixed');

  // Reset grid size select
  document.getElementById('grid-size-select').value = '52x52';

  // Reset pixel size slider
  const pixelSlider = document.getElementById('pixel-size-slider');
  if (pixelSlider) {
    pixelSlider.value = 8;
    document.getElementById('pixel-size-value').textContent = '8px';
  }

  // Reset max colors slider
  const maxColorsSlider = document.getElementById('max-colors-slider');
  if (maxColorsSlider) {
    maxColorsSlider.value = 0;
    document.getElementById('max-colors-value').textContent = t('value.auto');
  }

  // Reset similarity slider
  const simSlider = document.getElementById('similarity-slider');
  if (simSlider) {
    simSlider.value = 0;
    document.getElementById('similarity-value').textContent = t('value.off');
  }

  // Reset contrast slider
  const contrastSlider = document.getElementById('contrast-slider');
  if (contrastSlider) {
    contrastSlider.value = 0;
    document.getElementById('contrast-value').textContent = t('value.auto');
  }

  // Reset saturation slider
  const saturationSlider = document.getElementById('saturation-slider');
  if (saturationSlider) {
    saturationSlider.value = 0;
    document.getElementById('saturation-value').textContent = t('value.auto');
  }

  // Reset sharpness slider
  const sharpnessSlider = document.getElementById('sharpness-slider');
  if (sharpnessSlider) {
    sharpnessSlider.value = 0;
    document.getElementById('sharpness-value').textContent = t('value.auto');
  }

  // Reset checkboxes
  document.getElementById('remove-bg-checkbox').checked = true;
  document.getElementById('dithering-checkbox').checked = false;

  showToast(t('toast.reset_success'));
}

// === Toast Notifications ===
function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// === File Upload ===
function initUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('file-input');

  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('dragging');
  });

  area.addEventListener('dragleave', () => {
    area.classList.remove('dragging');
  });

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('dragging');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });

  input.addEventListener('change', () => {
    if (input.files.length > 0) handleFile(input.files[0]);
  });
}

function handleFile(file) {
  // Validate type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showToast(t('toast.upload_type_error'), true);
    return;
  }

  // Validate size (20MB)
  if (file.size > 20 * 1024 * 1024) {
    showToast(t('toast.upload_size_error'), true);
    return;
  }

  window.appState.originalImage = file;

  // Show preview and settings (keep upload area visible for easy replacement)
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('preview-image');
    preview.src = e.target.result;
    document.getElementById('preview-section').style.display = 'block';
    document.getElementById('settings-panel').style.display = 'block';
    // Don't hide upload area - keep it visible for easy replacement
  };
  reader.readAsDataURL(file);
}

// === Tab Switching ===
function initTabs() {
  document.querySelectorAll('.tab-group').forEach(group => {
    group.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const parent = btn.closest('.tab-group');

        // Update tab buttons
        parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show/hide content
        const contents = parent.nextElementSibling?.parentElement?.querySelectorAll('.tab-content');
        if (contents) {
          contents.forEach(c => {
            c.style.display = c.id === target ? 'block' : 'none';
          });
        }
      });
    });
  });
}

// === Controls ===
function initControls() {
  // Pixel size slider
  const pixelSlider = document.getElementById('pixel-size-slider');
  const pixelValue = document.getElementById('pixel-size-value');
  if (pixelSlider) {
    pixelSlider.addEventListener('input', () => {
      pixelValue.textContent = pixelSlider.value + 'px';
    });
  }

  // Max colors slider
  const maxColorsSlider = document.getElementById('max-colors-slider');
  const maxColorsValue = document.getElementById('max-colors-value');
  if (maxColorsSlider) {
    maxColorsSlider.addEventListener('input', () => {
      const v = parseInt(maxColorsSlider.value);
      maxColorsValue.textContent = v === 0 ? t('value.auto') : v;
    });
  }

  // Similarity threshold slider
  const simSlider = document.getElementById('similarity-slider');
  const simValue = document.getElementById('similarity-value');
  if (simSlider) {
    simSlider.addEventListener('input', () => {
      const v = parseInt(simSlider.value);
      simValue.textContent = v === 0 ? t('value.off') : v;
    });
  }

  // Contrast slider
  const contrastSlider = document.getElementById('contrast-slider');
  const contrastValue = document.getElementById('contrast-value');
  if (contrastSlider) {
    contrastSlider.addEventListener('input', () => {
      const v = parseInt(contrastSlider.value);
      contrastValue.textContent = v === 0 ? t('value.auto') : (v > 0 ? '+' + v : v);
    });
  }

  // Saturation slider
  const satSlider = document.getElementById('saturation-slider');
  const satValue = document.getElementById('saturation-value');
  if (satSlider) {
    satSlider.addEventListener('input', () => {
      const v = parseInt(satSlider.value);
      satValue.textContent = v === 0 ? t('value.auto') : (v > 0 ? '+' + v : v);
    });
  }

  // Sharpness slider
  const sharpSlider = document.getElementById('sharpness-slider');
  const sharpValue = document.getElementById('sharpness-value');
  if (sharpSlider) {
    sharpSlider.addEventListener('input', () => {
      const v = parseInt(sharpSlider.value);
      sharpValue.textContent = v === 0 ? t('value.auto') : (v > 0 ? '+' + v : v);
    });
  }

  // Generate button
  const genBtn = document.getElementById('generate-btn');
  if (genBtn) {
    genBtn.addEventListener('click', generatePattern);
  }

  // Remove background checkbox - re-render canvas when toggled (in edit mode)
  const removeBgCheckbox = document.getElementById('remove-bg-checkbox');
  if (removeBgCheckbox) {
    removeBgCheckbox.addEventListener('change', () => {
      if (window.appState.pixelMatrix && window.appState.editMode) {
        renderCanvas();
      }
    });
  }
}

// === Grid Mode Toggle ===
function setGridMode(mode) {
  document.getElementById('grid-fixed-options').style.display = mode === 'fixed' ? 'block' : 'none';
  document.getElementById('grid-pixel-options').style.display = mode === 'pixel' ? 'block' : 'none';
}

// === Generate Pattern ===
async function generatePattern() {
  if (!window.appState.originalImage) {
    showToast(t('toast.upload_first'), true);
    return;
  }

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ' + t('toast.processing');

  // Build form data
  const formData = new FormData();
  formData.append('file', window.appState.originalImage);

  // Grid mode
  const gridMode = document.querySelector('input[name="grid-mode"]:checked')?.value || 'fixed';
  if (gridMode === 'fixed') {
    formData.append('mode', 'fixed_grid');
    const gridSelect = document.getElementById('grid-size-select');
    const [w, h] = gridSelect.value.split('x').map(Number);
    formData.append('grid_width', w);
    formData.append('grid_height', h);
  } else {
    formData.append('mode', 'pixel_size');
    formData.append('pixel_size', document.getElementById('pixel-size-slider').value);
  }

  // Dithering
  const dithering = document.getElementById('dithering-checkbox')?.checked || false;
  formData.append('use_dithering', dithering);

  // Palette preset
  formData.append('palette_preset', window.appState.palettePreset);

  // Max colors (0 = unlimited)
  const maxColorsSlider = document.getElementById('max-colors-slider');
  const maxColors = maxColorsSlider ? parseInt(maxColorsSlider.value) : 0;
  formData.append('max_colors', maxColors);

  // Similarity threshold (0 = disabled)
  const simSlider = document.getElementById('similarity-slider');
  const simThreshold = simSlider ? parseInt(simSlider.value) : 0;
  formData.append('similarity_threshold', simThreshold);

  // Background removal
  const removeBg = document.getElementById('remove-bg-checkbox')?.checked || false;
  formData.append('remove_bg', removeBg);

  // Image adjustments
  const contrastVal = document.getElementById('contrast-slider')?.value || 0;
  formData.append('contrast', contrastVal);
  const saturationVal = document.getElementById('saturation-slider')?.value || 0;
  formData.append('saturation', saturationVal);
  const sharpnessVal = document.getElementById('sharpness-slider')?.value || 0;
  formData.append('sharpness', sharpnessVal);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetchWithAuth('/api/generate', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Generation failed');
    }

    const data = await response.json();

    // Update state
    window.appState.sessionId = data.session_id;
    window.appState.pixelMatrix = data.pixel_matrix;
    window.appState.gridSize = data.grid_size;
    window.appState.colorSummary = data.color_summary;
    window.appState.totalBeads = data.total_beads;
    window.appState.activeColors = new Set();
    window.appState.editMode = false;
    window.appState.palettePreset = data.palette_preset || '221';
    window.appState.editingTaskId = null;  // Reset - this is a new pattern
    window.appState.backgroundColor = data.background_color || null;

    // Build colorData lookup (include fullPalette fallback)
    window.appState.colorData = {};
    data.color_summary.forEach(c => {
      window.appState.colorData[c.code] = c;
    });

    // Render result
    document.getElementById('result-area').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    renderCanvas();
    renderColorPanel();

    showToast(t('toast.pattern_result', { w: data.grid_size.width, h: data.grid_size.height, c: data.color_summary.length }));
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast(t('toast.timeout'), true);
    } else {
      showToast(err.message, true);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = t('btn.generate');
  }
}

// === Canvas Rendering ===
function renderCanvas() {
  const canvas = document.getElementById('pattern-canvas');
  if (!canvas || !window.appState.pixelMatrix) return;

  const { pixelMatrix, gridSize, activeColors, colorData } = window.appState;
  const ctx = canvas.getContext('2d');

  // Calculate cell size based on available container width
  const container = canvas.parentElement;
  const containerWidth = container ? container.clientWidth - 4 : 900;
  const coordSize = 20;
  const maxPatternDim = containerWidth - coordSize * 2;
  
  const cellSize = Math.min(
    Math.floor(maxPatternDim / gridSize.width),
    Math.floor(maxPatternDim / gridSize.height)
  );
  const cs = Math.max(cellSize, 4);

  const patternW = gridSize.width * cs;
  const patternH = gridSize.height * cs;

  canvas.width = coordSize + patternW + coordSize;
  canvas.height = coordSize + patternH + coordSize;

  // Store layout info for click handling
  canvas._cellSize = cs;
  canvas._coordSize = coordSize;

  // Clear
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const ox = coordSize;
  const oy = coordSize;

  // --- Draw coordinate axes ---
  ctx.font = `${Math.max(7, cs / 3)}px monospace`;
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let x = 0; x < gridSize.width; x++) {
    // Top (1 -> N)
    ctx.fillText(String(x + 1), ox + x * cs + cs / 2, oy - 10);
    // Bottom (N -> 1, reversed)
    ctx.fillText(String(gridSize.width - x), ox + x * cs + cs / 2, oy + patternH + 10);
  }
  for (let y = 0; y < gridSize.height; y++) {
    // Left
    ctx.fillText(String(y + 1), ox - 10, oy + y * cs + cs / 2);
    // Right
    ctx.fillText(String(y + 1), ox + patternW + 10, oy + y * cs + cs / 2);
  }

  // --- Draw cells ---
  // Only show color codes in edit mode
  const showCodes = window.appState.editMode;

  for (let y = 0; y < gridSize.height; y++) {
    for (let x = 0; x < gridSize.width; x++) {
      const code = pixelMatrix[y][x];
      const cx = ox + x * cs;
      const cy = oy + y * cs;

      if (code === null) {
        // Transparent: checkerboard
        const bk = Math.max(2, Math.floor(cs / 4));
        for (let by = 0; by < cs; by += bk) {
          for (let bx = 0; bx < cs; bx += bk) {
            const ix = Math.floor(bx / bk);
            const iy = Math.floor(by / bk);
            ctx.fillStyle = (ix + iy) % 2 === 0 ? '#DCDCDC' : '#B4B4B4';
            ctx.fillRect(cx + bx, cy + by, Math.min(bk, cs - bx), Math.min(bk, cs - by));
          }
        }
      } else {
        const info = colorData[code] || window.appState.fullPalette[code];
        const hex = info ? info.hex : '#FFFFFF';

        ctx.fillStyle = hex;
        ctx.fillRect(cx, cy, cs, cs);

        // Highlight mask
        if (activeColors.size > 0 && !activeColors.has(code)) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.fillRect(cx, cy, cs, cs);
        }

        // Draw code text inside cell (hide if remove_bg is enabled and this is background color)
        if (showCodes) {
          const removeBgEnabled = document.getElementById('remove-bg-checkbox')?.checked;
          const bgCode = window.appState.backgroundColor;
          // Skip drawing code if remove_bg is enabled and this is the background color
          if (!(removeBgEnabled && bgCode && code === bgCode)) {
            const r = parseInt(hex.slice(1, 3), 16) || 255;
            const g = parseInt(hex.slice(3, 5), 16) || 255;
            const b = parseInt(hex.slice(5, 7), 16) || 255;
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            ctx.fillStyle = brightness > 128 ? '#000000' : '#FFFFFF';
            ctx.font = `bold ${Math.max(6, cs * 0.38)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(code, cx + cs / 2, cy + cs / 2);
          }
        }
      }
    }
  }

  // --- Draw grid lines ---
  if (cs >= 4) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= gridSize.width; x++) {
      ctx.beginPath();
      ctx.moveTo(ox + x * cs, oy);
      ctx.lineTo(ox + x * cs, oy + patternH);
      ctx.stroke();
    }
    for (let y = 0; y <= gridSize.height; y++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + y * cs);
      ctx.lineTo(ox + patternW, oy + y * cs);
      ctx.stroke();
    }
  }

  // --- Draw selection and hover highlights (edit mode) ---
  if (window.appState.editMode) {
    // Draw selected cells
    window.appState.selectedCells.forEach(cellKey => {
      const [sr, sc] = cellKey.split(',').map(Number);
      const sx = ox + sc * cs;
      const sy = oy + sr * cs;
      
      ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
      ctx.fillRect(sx, sy, cs, cs);
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, cs - 2, cs - 2);
    });
    
    // Draw hovered cell
    if (window.appState.hoveredCell) {
      const { row, col } = window.appState.hoveredCell;
      const hx = ox + col * cs;
      const hy = oy + row * cs;
      
      ctx.strokeStyle = '#FF5722';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx, hy, cs, cs);
      
      // Fill with semi-transparent overlay
      ctx.fillStyle = 'rgba(255, 87, 34, 0.15)';
      ctx.fillRect(hx, hy, cs, cs);
    }
  }
  
  // Render mirror canvas after main canvas
  renderMirrorCanvas();
}

// === Mirror Canvas Rendering (Right to Left flip) ===
function renderMirrorCanvas() {
  const mainCanvas = document.getElementById('pattern-canvas');
  const mirrorCanvas = document.getElementById('mirror-canvas');
  if (!mainCanvas || !mirrorCanvas || !window.appState.pixelMatrix) return;

  const { pixelMatrix, gridSize, colorData } = window.appState;
  const ctx = mirrorCanvas.getContext('2d');

  const cs = mainCanvas._cellSize || 10;
  const coordSize = 16;
  
  const patternW = gridSize.width * cs;
  const patternH = gridSize.height * cs;

  mirrorCanvas.width = coordSize + patternW + coordSize;
  mirrorCanvas.height = coordSize + patternH + coordSize;

  // Clear
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);

  const ox = coordSize;
  const oy = coordSize;

  // --- Draw coordinate axes (mirrored) ---
  ctx.font = `${Math.max(7, cs / 3)}px monospace`;
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Column numbers on top (mirrored: right to left)
  for (let x = 0; x < gridSize.width; x++) {
    const mirrorX = gridSize.width - 1 - x;
    ctx.fillText(String(mirrorX + 1), ox + x * cs + cs / 2, oy - 8);
    ctx.fillText(String(gridSize.width - mirrorX), ox + x * cs + cs / 2, oy + patternH + 8);
  }
  // Row numbers
  for (let y = 0; y < gridSize.height; y++) {
    ctx.fillText(String(y + 1), ox - 8, oy + y * cs + cs / 2);
    ctx.fillText(String(y + 1), ox + patternW + 8, oy + y * cs + cs / 2);
  }

  // --- Draw cells (mirrored horizontally) ---
  // Only show color codes in edit mode
  const showCodes = window.appState.editMode;

  for (let y = 0; y < gridSize.height; y++) {
    for (let x = 0; x < gridSize.width; x++) {
      // Mirror: read from right side, draw to left side
      const mirrorX = gridSize.width - 1 - x;
      const code = pixelMatrix[y][mirrorX];
      const cx = ox + x * cs;
      const cy = oy + y * cs;

      if (code === null) {
        // Transparent: checkerboard
        const bk = Math.max(2, Math.floor(cs / 4));
        for (let by = 0; by < cs; by += bk) {
          for (let bx = 0; bx < cs; bx += bk) {
            const ix = Math.floor(bx / bk);
            const iy = Math.floor(by / bk);
            ctx.fillStyle = (ix + iy) % 2 === 0 ? '#DCDCDC' : '#B4B4B4';
            ctx.fillRect(cx + bx, cy + by, Math.min(bk, cs - bx), Math.min(bk, cs - by));
          }
        }
      } else {
        const info = colorData[code] || window.appState.fullPalette[code];
        const hex = info ? info.hex : '#FFFFFF';

        ctx.fillStyle = hex;
        ctx.fillRect(cx, cy, cs, cs);

        // Draw code text inside cell
        if (showCodes) {
          const r = parseInt(hex.slice(1, 3), 16) || 255;
          const g = parseInt(hex.slice(3, 5), 16) || 255;
          const b = parseInt(hex.slice(5, 7), 16) || 255;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          ctx.fillStyle = brightness > 128 ? '#000000' : '#FFFFFF';
          ctx.font = `bold ${Math.max(5, cs * 0.35)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(code, cx + cs / 2, cy + cs / 2);
        }
      }
    }
  }

  // --- Draw grid lines ---
  if (cs >= 4) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= gridSize.width; x++) {
      ctx.beginPath();
      ctx.moveTo(ox + x * cs, oy);
      ctx.lineTo(ox + x * cs, oy + patternH);
      ctx.stroke();
    }
    for (let y = 0; y <= gridSize.height; y++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + y * cs);
      ctx.lineTo(ox + patternW, oy + y * cs);
      ctx.stroke();
    }
  }
}

// === Export Mirror PNG (with same info as original export) ===
async function exportMirrorPNG() {
  const { pixelMatrix, colorData, colorSummary, palettePreset, fullPalette, gridSize } = window.appState;
  if (!pixelMatrix) {
    showToast(t('toast.no_pattern'), true);
    return;
  }

  // Create mirrored pixel matrix (horizontal flip)
  const mirrorMatrix = pixelMatrix.map(row => [...row].reverse());

  // Build color_data map: code -> hex (include fullPalette fallback)
  const colorMap = {};
  Object.keys(colorData).forEach(code => {
    colorMap[code] = colorData[code].hex;
  });
  // Ensure all codes in pixel_matrix are covered
  pixelMatrix.forEach(row => {
    row.forEach(code => {
      if (code && !colorMap[code] && fullPalette[code]) {
        colorMap[code] = fullPalette[code].hex;
      }
    });
  });

  // Get export settings from input (same as exportPNG)
  const removeBg = document.getElementById('remove-bg-checkbox')?.checked ?? true;
  let watermarkText = document.getElementById('watermark-text')?.value || '';
  // Add mirror indicator to watermark
  watermarkText = '【镜像】' + watermarkText;
  const bottomLeftText = document.getElementById('bottom-left-text')?.value || '';

  try {
    const response = await fetchWithAuth('/api/export/png', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: window.appState.sessionId,
        pixel_matrix: mirrorMatrix,
        color_data: colorMap,
        color_summary: colorSummary,
        cell_size: 20,
        show_grid: true,
        show_codes_in_cells: true,
        show_coordinates: true,
        palette_preset: palettePreset,
        remove_bg: removeBg,
        watermark_text: watermarkText,
        bottom_left_text: bottomLeftText,
      }),
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pindou_Mirror_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(t('toast.mirror_success'));
  } catch (err) {
    showToast(t('toast.png_failed'), true);
  }
}

// === Canvas Click Handling ===
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('pattern-canvas');
  if (!canvas) return;

  // Helper to get cell from mouse event
  function getCellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const cellSize = canvas._cellSize || 10;
    const coordSize = canvas._coordSize || 20;
    const col = Math.floor((canvasX - coordSize) / cellSize);
    const row = Math.floor((canvasY - coordSize) / cellSize);
    
    if (row >= 0 && row < window.appState.gridSize.height &&
        col >= 0 && col < window.appState.gridSize.width) {
      return { row, col };
    }
    return null;
  }

  canvas.addEventListener('mousedown', (e) => {
    if (!window.appState.editMode || !window.appState.pixelMatrix) return;
    
    const cell = getCellFromEvent(e);
    if (!cell) return;
    
    // Start drag selection
    window.appState.isDragging = true;
    window.appState.dragStart = cell;
    window.appState.selectedCells.clear();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!window.appState.editMode || !window.appState.pixelMatrix) {
      canvas.style.cursor = 'default';
      window.appState.hoveredCell = null;
      return;
    }
    canvas.style.cursor = 'crosshair';
    
    const cell = getCellFromEvent(e);
    const prevHovered = window.appState.hoveredCell;
    window.appState.hoveredCell = cell;
    
    // Drag selection: add all cells between start and current
    if (window.appState.isDragging && window.appState.dragStart && cell) {
      const startRow = Math.min(window.appState.dragStart.row, cell.row);
      const endRow = Math.max(window.appState.dragStart.row, cell.row);
      const startCol = Math.min(window.appState.dragStart.col, cell.col);
      const endCol = Math.max(window.appState.dragStart.col, cell.col);
      
      window.appState.selectedCells.clear();
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          window.appState.selectedCells.add(`${r},${c}`);
        }
      }
    }
    
    // Re-render if hover changed
    if ((prevHovered?.row !== cell?.row) || (prevHovered?.col !== cell?.col)) {
      renderCanvas();
      updateSelectionInfo();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!window.appState.editMode || !window.appState.pixelMatrix) return;
    
    const wasDragging = window.appState.isDragging;
    window.appState.isDragging = false;
    window.appState.dragStart = null;
    
    // If it was a simple click (not drag), handle it
    if (!wasDragging || window.appState.selectedCells.size <= 1) {
      const cell = getCellFromEvent(e);
      if (cell) {
        const cellKey = `${cell.row},${cell.col}`;
        
        // If cells selected, fill them
        if (window.appState.selectedCells.size > 0 && window.appState.brushColor) {
          fillSelectedCells();
        } else if (e.shiftKey || !window.appState.brushColor) {
          // Show color picker
          showColorPopover(e.clientX, e.clientY, cell.row, cell.col);
        } else if (window.appState.selectedCells.size === 0) {
          // Quick fill single cell
          updateCell(cell.row, cell.col, window.appState.brushColor);
        }
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    window.appState.hoveredCell = null;
    window.appState.isDragging = false;
    window.appState.dragStart = null;
    renderCanvas();
  });
});

// === Fill All Selected Cells ===
function fillSelectedCells() {
  // brushColor can be null (X0 - transparent), so we check for undefined
  if (window.appState.brushColor === undefined || window.appState.selectedCells.size === 0) return;
  
  const cells = Array.from(window.appState.selectedCells);
  cells.forEach(cellKey => {
    const [row, col] = cellKey.split(',').map(Number);
    window.appState.pixelMatrix[row][col] = window.appState.brushColor;
  });
  
  // Recalculate color summary
  recalculateColorSummary();
  
  // Clear selection
  window.appState.selectedCells.clear();
  renderCanvas();
  renderColorPanel();
  updateSelectionInfo();
  showToast(t('toast.cells_filled', { count: cells.length }));
}

// === Recalculate Color Summary ===
function recalculateColorSummary() {
  const counter = {};
  window.appState.pixelMatrix.forEach(row => {
    row.forEach(code => {
      if (code) {
        counter[code] = (counter[code] || 0) + 1;
      }
    });
  });
  
  const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  window.appState.colorSummary = sorted.map(([code, count]) => {
    const info = window.appState.fullPalette[code] || {};
    return {
      code,
      name: info.name || code,
      name_zh: info.name_zh || code,
      hex: info.hex || '#FFFFFF',
      count
    };
  });
  
  window.appState.totalBeads = Object.values(counter).reduce((a, b) => a + b, 0);
}

// === Update Selection Info Display ===
function updateSelectionInfo() {
  let infoEl = document.getElementById('selection-info');
  
  if (window.appState.selectedCells.size > 0) {
    if (!infoEl) {
      infoEl = document.createElement('div');
      infoEl.id = 'selection-info';
      infoEl.className = 'selection-info';
      const resultArea = document.getElementById('result-area');
      if (resultArea) {
        resultArea.insertBefore(infoEl, resultArea.firstChild.nextSibling);
      }
    }
    
    const count = window.appState.selectedCells.size;
    const brushText = window.appState.brushColor 
      ? `${t('toast.brush_set', { code: window.appState.brushColor })} - ${t('btn.fill_selection')}`
      : t('toast.select_color_first');
    
    infoEl.innerHTML = `
      <span class="selection-count">${t('toast.cells_selected', { count })}</span>
      <span class="selection-hint">${brushText}</span>
    `;
    infoEl.style.display = 'flex';
  } else if (infoEl) {
    infoEl.style.display = 'none';
  }
  
  // Update hovered cell info
  let hoverEl = document.getElementById('hover-info');
  if (window.appState.editMode && window.appState.hoveredCell) {
    if (!hoverEl) {
      hoverEl = document.createElement('div');
      hoverEl.id = 'hover-info';
      hoverEl.className = 'hover-info';
      const canvasContainer = document.querySelector('.canvas-container');
      if (canvasContainer) {
        canvasContainer.appendChild(hoverEl);
      }
    }
    const { row, col } = window.appState.hoveredCell;
    const code = window.appState.pixelMatrix[row][col];
    hoverEl.textContent = `(${row + 1}, ${col + 1}) ${code || '∅'}`;
    hoverEl.style.display = 'block';
  } else if (hoverEl) {
    hoverEl.style.display = 'none';
  }
}

// === Color Popover ===
function showColorPopover(clientX, clientY, row, col) {
  // Remove existing popover
  closeColorPopover();

  const popover = document.createElement('div');
  popover.className = 'color-popover';
  popover.id = 'color-popover';

  // Position
  popover.style.left = clientX + 'px';
  popover.style.top = clientY + 'px';

  // Adjust if near edge
  const maxLeft = window.innerWidth - 280;
  const maxTop = window.innerHeight - 360;
  if (clientX > maxLeft) popover.style.left = maxLeft + 'px';
  if (clientY > maxTop) popover.style.top = maxTop + 'px';

  // Current cell info
  const currentCode = window.appState.pixelMatrix[row][col];

  // Add search input
  const searchWrapper = document.createElement('div');
  searchWrapper.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--border);';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = t('settings.search_color');
  searchInput.style.cssText = 'width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; outline: none;';
  searchWrapper.appendChild(searchInput);
  popover.appendChild(searchWrapper);

  // Color list container
  const listContainer = document.createElement('div');
  listContainer.className = 'color-popover-list';
  listContainer.style.cssText = 'max-height: 280px; overflow-y: auto;';
  popover.appendChild(listContainer);

  // Add X0 (transparent) option at the beginning
  const transparentOption = {
    code: null,  // null represents transparent
    hex: 'transparent',
    name: 'X0 (Transparent)'
  };
  
  // Show all colors from the current preset palette
  const allColors = [transparentOption, ...getPresetColorList().map(item => ({
    code: item.code,
    hex: item.hex,
    name: item.name || item.name_zh || item.code
  }))];
  
  function renderColorList(filter = '') {
    listContainer.innerHTML = '';
    const filterLower = filter.toLowerCase().trim();
    
    let foundExactMatch = null;
    
    allColors.forEach(item => {
      const matches = !filterLower || 
        (item.code && item.code.toLowerCase().includes(filterLower)) ||
        item.name.toLowerCase().includes(filterLower) ||
        item.code === null && 'x0 transparent 透明 空'.includes(filterLower);
      
      if (matches) {
        if (item.code && item.code.toLowerCase() === filterLower) {
          foundExactMatch = item;
        }
        
        const opt = document.createElement('div');
        opt.className = 'color-popover-item';
        if (item.code === currentCode && (item.code !== null || currentCode === null)) {
          opt.style.background = 'var(--accent-light)';
        }
        
        // Special rendering for X0 (transparent)
        if (item.code === null) {
          opt.innerHTML = `
            <span class="color-swatch" style="background: repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px; border: 1px solid #999;"></span>
            <span style="font-weight: 600">X0</span>
            <span style="color: var(--text-secondary); font-size: 11px; margin-left: 4px;">(Transparent)</span>
          `;
        } else {
          opt.innerHTML = `
            <span class="color-swatch" style="background: ${item.hex}"></span>
            <span style="font-weight: 600">${item.code}</span>
          `;
        }
        
        opt.addEventListener('click', () => {
          updateCell(row, col, item.code);
          closeColorPopover();
        });
        listContainer.appendChild(opt);
      }
    });
    
    return foundExactMatch;
  }
  
  // Initial render
  renderColorList();

  // Search input events
  searchInput.addEventListener('input', (e) => {
    renderColorList(e.target.value);
  });
  
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const filter = searchInput.value.trim();
      // Try exact match first
      const exactMatch = usedColors.find(c => c.code.toLowerCase() === filter.toLowerCase());
      if (exactMatch) {
        updateCell(row, col, exactMatch.code);
        closeColorPopover();
      } else {
        // Use first visible color
        const firstItem = listContainer.querySelector('.color-popover-item');
        if (firstItem) {
          firstItem.click();
        }
      }
    } else if (e.key === 'Escape') {
      closeColorPopover();
    }
  });

  document.body.appendChild(popover);
  
  // Focus search input
  setTimeout(() => searchInput.focus(), 10);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', outsideClickHandler);
  }, 10);
}

function outsideClickHandler(e) {
  const popover = document.getElementById('color-popover');
  if (popover && !popover.contains(e.target)) {
    closeColorPopover();
  }
}

function closeColorPopover() {
  const existing = document.getElementById('color-popover');
  if (existing) existing.remove();
  document.removeEventListener('click', outsideClickHandler);
}

// === Update Cell ===
async function updateCell(row, col, newCode) {
  const { pixelMatrix, sessionId } = window.appState;
  const oldCode = pixelMatrix[row][col];
  if (oldCode === newCode) return;

  // Update locally first for instant feedback
  pixelMatrix[row][col] = newCode;
  renderCanvas();

  // Sync with server
  try {
    const response = await fetchWithAuth('/api/update_cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        row: row,
        col: col,
        new_code: newCode,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      window.appState.colorSummary = data.color_summary;
      window.appState.totalBeads = data.total_beads;

      // Rebuild colorData
      window.appState.colorData = {};
      data.color_summary.forEach(c => {
        window.appState.colorData[c.code] = c;
      });

      renderColorPanel();
    }
  } catch (err) {
    // Revert on error
    pixelMatrix[row][col] = oldCode;
    renderCanvas();
    showToast(t('toast.update_failed'), true);
  }
}

// === Color Panel ===
function renderColorPanel() {
  const list = document.getElementById('color-list');
  const total = document.getElementById('color-total');
  if (!list) return;

  list.innerHTML = '';

  // Add X0 (transparent) option at the beginning in edit mode
  if (window.appState.editMode) {
    const x0Tag = document.createElement('div');
    x0Tag.className = 'color-tag' + (window.appState.brushColor === null ? ' brush-selected' : '');
    x0Tag.dataset.code = 'X0';
    x0Tag.innerHTML = `
      <span class="color-swatch" style="background: repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px; border: 1px solid #999;"></span>
      <span class="color-code">X0</span>
      <span class="color-count" style="color: var(--text-secondary);">∅</span>
    `;

    x0Tag.addEventListener('click', (e) => {
      setBrushColor(null);
      if (window.appState.selectedCells.size > 0) {
        fillSelectedCells();
      }
      e.stopPropagation();
    });

    list.appendChild(x0Tag);
  }

  // Get background color to filter out if remove_bg is enabled
  const removeBgEnabled = document.getElementById('remove-bg-checkbox')?.checked;
  const bgCode = window.appState.backgroundColor;

  window.appState.colorSummary.forEach(item => {
    // Skip background color in edit mode if remove_bg is enabled
    if (window.appState.editMode && removeBgEnabled && bgCode && item.code === bgCode) {
      return; // Skip this color
    }

    const tag = document.createElement('div');
    tag.className = 'color-tag' + (window.appState.activeColors.has(item.code) ? ' active' : '');
    if (window.appState.brushColor === item.code) {
      tag.className += ' brush-selected';
    }
    tag.dataset.code = item.code;
    tag.innerHTML = `
      <span class="color-swatch" style="background: ${item.hex}"></span>
      <span class="color-code">${item.code}</span>
      <span class="color-count">${item.count}</span>
    `;

    tag.addEventListener('click', (e) => {
      if (window.appState.editMode) {
        // In edit mode: pick color and fill selected cells
        setBrushColor(item.code);
        if (window.appState.selectedCells.size > 0) {
          fillSelectedCells();
        }
        e.stopPropagation();
      } else {
        // Normal mode: toggle highlight
        toggleColorHighlight(item.code);
      }
    });

    list.appendChild(tag);
  });

  if (total) {
    total.textContent = t('result.colors_total', { colors: window.appState.colorSummary.length, beads: window.appState.totalBeads });
  }
}

// === Set Brush Color ===
function setBrushColor(code) {
  window.appState.brushColor = code;
  
  // Update UI: highlight selected color in list
  document.querySelectorAll('.color-tag').forEach(tag => {
    tag.classList.toggle('brush-selected', tag.dataset.code === code);
  });
  
  // Show toast
  const colorInfo = window.appState.fullPalette[code] || window.appState.colorData[code];
  if (colorInfo) {
    showToast(t('toast.brush_set', { code: code }));
  }
}

// === Color Highlight Toggle ===
function toggleColorHighlight(code) {
  const { activeColors } = window.appState;

  if (activeColors.has(code)) {
    activeColors.delete(code);
  } else {
    activeColors.add(code);
  }

  // Update tag UI
  document.querySelectorAll('.color-tag').forEach(tag => {
    if (tag.dataset.code === code) {
      tag.classList.toggle('active');
    }
  });

  renderCanvas();
}

// === Edit Mode Toggle ===
function toggleEditMode() {
  window.appState.editMode = !window.appState.editMode;
  const btn = document.getElementById('edit-toggle');
  if (btn) {
    btn.classList.toggle('active', window.appState.editMode);
    // Find the span inside the button and update its text
    const span = btn.querySelector('span[data-i18n]');
    if (span) {
      span.setAttribute('data-i18n', window.appState.editMode ? 'btn.exit_edit' : 'btn.edit');
      span.textContent = window.appState.editMode ? t('btn.exit_edit') : t('btn.edit');
    }
  }
  
  // Clear selection and brush when exiting edit mode
  if (!window.appState.editMode) {
    window.appState.brushColor = null;
    window.appState.selectedCells.clear();
    window.appState.hoveredCell = null;
    document.querySelectorAll('.color-tag').forEach(tag => {
      tag.classList.remove('brush-selected');
    });
    // Remove selection info
    const infoEl = document.getElementById('selection-info');
    if (infoEl) infoEl.style.display = 'none';
    const hoverEl = document.getElementById('hover-info');
    if (hoverEl) hoverEl.style.display = 'none';
  } else {
    // Show hint when entering edit mode
    showToast(t('toast.edit_mode_hint'));
  }
  
  // Update color panel to show brush selection UI
  renderColorPanel();
  renderCanvas();
}

// === Export PNG ===
async function exportPNG() {
  const { pixelMatrix, colorData, colorSummary, palettePreset, fullPalette } = window.appState;
  if (!pixelMatrix) return;

  // Build color_data map: code -> hex (include fullPalette fallback)
  const colorMap = {};
  Object.keys(colorData).forEach(code => {
    colorMap[code] = colorData[code].hex;
  });
  // Ensure all codes in pixel_matrix are covered
  pixelMatrix.forEach(row => {
    row.forEach(code => {
      if (code && !colorMap[code] && fullPalette[code]) {
        colorMap[code] = fullPalette[code].hex;
      }
    });
  });

  // Get export settings from input
  const removeBg = document.getElementById('remove-bg-checkbox')?.checked ?? true;
  const watermarkText = document.getElementById('watermark-text')?.value || '';
  const bottomLeftText = document.getElementById('bottom-left-text')?.value || '';

  try {
    const response = await fetchWithAuth('/api/export/png', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: window.appState.sessionId,
        pixel_matrix: pixelMatrix,
        color_data: colorMap,
        color_summary: colorSummary,
        cell_size: 20,
        show_grid: true,
        show_codes_in_cells: true,
        show_coordinates: true,
        palette_preset: palettePreset,
        remove_bg: removeBg,
        watermark_text: watermarkText,
        bottom_left_text: bottomLeftText,
      }),
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pindou_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(t('toast.png_success'));
  } catch (err) {
    showToast(t('toast.png_failed'), true);
  }
}

// ============================================================
// === Tab Navigation ===
// ============================================================

function switchMainTab(tabName) {
  // Persist current tab so it survives page refresh
  localStorage.setItem('pindou_active_tab', tabName);

  // Update tab buttons
  document.querySelectorAll('.header-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
  
  // Apply translations for the new tab
  applyTranslations();
  
  // Initialize tasks when switching to bead board
  if (tabName === 'tasks') {
    initTasks();
  }
}

// ============================================================
// === Image Generation (Tab 1) ===
// ============================================================

// State for image generation
window.imageGenState = {
  refImageFile: null,
  refImageUrl: null,
  generatedImageUrl: null,
  isGenerating: false,
};

function initImageGeneration() {
  // Reference image upload
  const refUploadArea = document.getElementById('ref-upload-area');
  const refFileInput = document.getElementById('ref-file-input');
  
  if (refUploadArea && refFileInput) {
    refUploadArea.addEventListener('click', () => refFileInput.click());
    
    refUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      refUploadArea.classList.add('dragover');
    });
    
    refUploadArea.addEventListener('dragleave', () => {
      refUploadArea.classList.remove('dragover');
    });
    
    refUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      refUploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleRefImageFile(file);
      }
    });
    
    refFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleRefImageFile(file);
      }
    });
  }
}

function handleRefImageFile(file) {
  if (file.size > 20 * 1024 * 1024) {
    showToast(t('toast.upload_size_error'), true);
    return;
  }
  
  window.imageGenState.refImageFile = file;
  
  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    window.imageGenState.refImageUrl = e.target.result;
    
    const refPreview = document.getElementById('ref-preview');
    const refPreviewImage = document.getElementById('ref-preview-image');
    const refUploadArea = document.getElementById('ref-upload-area');
    
    if (refPreview && refPreviewImage && refUploadArea) {
      refPreviewImage.src = e.target.result;
      refPreview.style.display = 'block';
      refUploadArea.style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

function clearRefImage() {
  window.imageGenState.refImageFile = null;
  window.imageGenState.refImageUrl = null;
  
  const refPreview = document.getElementById('ref-preview');
  const refUploadArea = document.getElementById('ref-upload-area');
  const refFileInput = document.getElementById('ref-file-input');
  
  if (refPreview) refPreview.style.display = 'none';
  if (refUploadArea) refUploadArea.style.display = 'block';
  if (refFileInput) refFileInput.value = '';
}

async function generateImage() {
  const promptInput = document.getElementById('generate-prompt');
  const prompt = promptInput?.value?.trim();
  
  if (!prompt) {
    showToast(t('generate.no_prompt'), true);
    return;
  }
  
  if (window.imageGenState.isGenerating) return;
  
  window.imageGenState.isGenerating = true;
  
  // Show loading state
  const btn = document.getElementById('generate-image-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="loading-spinner-small"></span> ${t('generate.generating')}`;
  
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    
    // Get selected model
    const modelSelect = document.getElementById('model-select');
    const model = modelSelect?.value || 'ep-m-20260403150322-jjxqm';
    formData.append('model', model);
    
    if (window.imageGenState.refImageFile) {
      formData.append('reference_image', window.imageGenState.refImageFile);
    }
    
    const response = await fetchWithAuth('/api/generate-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Generation failed');
    }
    
    const data = await response.json();
    
    if (data.image_url) {
      // Prefer the locally-saved copy (same-origin) over the remote Ark URL.
      // The remote URL is cross-origin, so fetch() against it is blocked by CORS,
      // which breaks "send to pattern" and "download". The local path avoids that.
      const displayUrl = data.local_filename
        ? `/pindou_pic/${data.local_filename}`
        : data.image_url;
      window.imageGenState.generatedImageUrl = displayUrl;

      // Refresh history after generation
      loadArtPicHistory();

      // Display generated image
      const generatedImage = document.getElementById('generated-image');
      const generateResult = document.getElementById('generate-result');
      const generateEmpty = document.getElementById('generate-empty');

      if (generatedImage) {
        generatedImage.src = displayUrl;
      }
      if (generateResult) generateResult.style.display = 'block';
      if (generateEmpty) generateEmpty.style.display = 'none';
      
      showToast(t('generate.success'));
    } else {
      throw new Error('No image URL in response');
    }
  } catch (err) {
    console.error('Image generation error:', err);
    showToast(t('generate.failed') + ': ' + err.message, true);
  } finally {
    window.imageGenState.isGenerating = false;
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function downloadGeneratedImage() {
  const imageUrl = window.imageGenState.generatedImageUrl;
  if (!imageUrl) return;
  
  // Fetch and download the image
  fetch(imageUrl)
    .then(response => response.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pindou_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    });
}

async function sendToPattern() {
  const imageUrl = window.imageGenState.generatedImageUrl;
  if (!imageUrl) return;
  
  // Switch to pattern tab
  switchMainTab('pattern');
  
  // Fetch the image and set it as the source for pattern generation
  try {
    showToast(t('toast.processing'));

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const file = new File([blob], 'generated_image.png', { type: 'image/png' });
    
    // Store the file object (same as handleFile does)
    window.appState.originalImage = file;
    
    // Set the file to the upload input
    const fileInput = document.getElementById('file-input');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    
    // Show preview and settings (keep upload area visible)
    const previewSection = document.getElementById('preview-section');
    const previewImage = document.getElementById('preview-image');
    const settingsPanel = document.getElementById('settings-panel');
    
    if (previewImage && previewSection) {
      previewImage.src = imageUrl;
      previewSection.style.display = 'block';
    }
    if (settingsPanel) {
      settingsPanel.style.display = 'block';
    }
    // Don't hide upload area - keep it visible for easy replacement
    
  } catch (err) {
    console.error('Failed to send to pattern:', err);
    showToast(t('toast.update_failed'), true);
  }
}


// ============================================================
// Bead Board (拼豆盘) - Task Management
// ============================================================

// Task state
window.taskState = {
  tasks: [],
  currentTask: null,
  searchQuery: '',
};

// Initialize tasks when switching to bead board tab
function initTasks() {
  loadTasks();
}

// Load tasks from server
async function loadTasks() {
  const container = document.getElementById('task-list');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = `<div class="task-loading">${t('common.loading') || 'Loading...'}</div>`;
  
  try {
    const params = new URLSearchParams();
    if (window.taskState.searchQuery) {
      params.append('search', window.taskState.searchQuery);
    }
    const response = await fetchWithAuth(`/api/tasks?${params.toString()}`);
    const data = await response.json();
    
    if (data.success) {
      window.taskState.tasks = data.tasks;
      renderTaskList();
      // Update total count display
      const totalEl = document.getElementById('tasks-total');
      if (totalEl && data.total !== undefined) {
        totalEl.textContent = `Total: ${data.total}`;
      }
    } else {
      showToast(t('tasks.load_failed'), true);
    }
  } catch (err) {
    console.error('Failed to load tasks:', err);
    showToast(t('tasks.load_failed'), true);
  }
}

// Search tasks by name
let searchTimeout = null;
function searchTasks(query) {
  // Debounce search
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    window.taskState.searchQuery = query.trim();
    loadTasks();
  }, 300);
}

// Render task grid
function renderTaskList() {
  const container = document.getElementById('task-list');
  if (!container) return;
  
  if (window.taskState.tasks.length === 0) {
    container.innerHTML = `<div class="task-empty">${t('tasks.empty')}</div>`;
    return;
  }
  
  container.innerHTML = window.taskState.tasks.map(task => {
    // Get preview image or use placeholder
    const previewImg = task.preview_image && task.preview_image.length > 0 ? task.preview_image : null;
    // Format timestamp (Beijing time)
    const timestamp = task.updated_at || '';
    const formattedTime = timestamp ? new Date(timestamp).toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'numeric', 
      day: 'numeric'
    }) : '';
    
    return `
      <div class="task-card" onclick="selectTask(${task.id})">
        <div class="task-card-content">
          ${previewImg ? `<img src="${previewImg}" class="task-card-preview" alt="Preview">` : '<div class="task-card-preview task-card-preview-empty"></div>'}
          <div class="task-card-info">
            <span class="task-card-name">${escapeHtml(task.name)}</span>
            <span class="task-card-time">${formattedTime}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Select a task and open modal
async function selectTask(taskId) {
  try {
    const response = await fetchWithAuth(`/api/tasks/${taskId}`);
    const data = await response.json();
    
    if (data.success) {
      window.taskState.currentTask = data.task;
      openTaskModal(data.task);
    }
  } catch (err) {
    console.error('Failed to load task:', err);
  }
}

// Open task modal
function openTaskModal(task) {
  const modal = document.getElementById('task-modal');
  if (!modal) return;
  
  // Update modal content
  document.getElementById('modal-task-name').value = task.name || '';
  document.getElementById('modal-task-size').textContent = `${task.grid_width || 0} × ${task.grid_height || 0}`;
  document.getElementById('modal-task-beads').textContent = task.total_beads || 0;
  
  // Preview image
  const previewImg = document.getElementById('modal-task-preview');
  if (task.preview_image) {
    previewImg.src = task.preview_image;
    previewImg.style.display = 'block';
  } else {
    previewImg.style.display = 'none';
  }
  
  // Color summary
  renderModalColorList(task.color_summary);
  
  // Show modal
  modal.style.display = 'flex';
}

// Render color list in modal
function renderModalColorList(colorSummary) {
  const container = document.getElementById('modal-task-colors');
  if (!container || !colorSummary) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = colorSummary.map(c => `
    <div class="task-color-item">
      <div class="task-color-swatch" style="background-color: ${c.hex}"></div>
      <span class="task-color-code">${c.code}</span>
      <span class="task-color-count">×${c.count}</span>
    </div>
  `).join('');
}

// ============================================================
// === Confirm Dialog ===
// ============================================================

let confirmCallback = null;

function showConfirmDialog(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  
  if (modal && titleEl && messageEl) {
    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.style.display = 'flex';
    confirmCallback = onConfirm;
  }
}

function closeConfirmDialog() {
  const modal = document.getElementById('confirm-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  confirmCallback = null;
}

function confirmAction() {
  if (confirmCallback) {
    const callback = confirmCallback;
    closeConfirmDialog();
    callback();
  }
}

// Close task modal
function closeTaskModal() {
  const modal = document.getElementById('task-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.taskState.currentTask = null;
  loadTasks(); // Refresh list
}

// Generate preview image for task
async function generateTaskPreview() {
  if (!window.appState.pixelMatrix) return null;
  
  // Use canvas to generate preview
  const matrix = window.appState.pixelMatrix;
  const height = matrix.length;
  const width = matrix[0]?.length || 0;
  
  if (height === 0 || width === 0) return null;
  
  const cellSize = Math.max(2, Math.min(10, Math.floor(400 / Math.max(width, height))));
  
  const canvas = document.createElement('canvas');
  canvas.width = width * cellSize;
  canvas.height = height * cellSize;
  const ctx = canvas.getContext('2d');
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const code = matrix[y][x];
      const colorInfo = window.appState.fullPalette[code];
      
      if (colorInfo) {
        ctx.fillStyle = colorInfo.hex;
      } else {
        ctx.fillStyle = '#FFFFFF';
      }
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
  
  return canvas.toDataURL('image/png');
}

// Update task name in modal
document.getElementById('modal-task-name')?.addEventListener('change', async (e) => {
  if (!window.taskState.currentTask) return;
  
  try {
    await fetchWithAuth(`/api/tasks/${window.taskState.currentTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: e.target.value }),
    });
    
    loadTasks(); // Refresh list
  } catch (err) {
    console.error('Failed to update task:', err);
  }
});

// Delete current task
async function deleteCurrentTask() {
  if (!window.taskState.currentTask) return;
  
  showConfirmDialog(
    t('tasks.delete'),
    t('tasks.delete_confirm'),
    async () => {
      try {
        await fetchWithAuth(`/api/tasks/${window.taskState.currentTask.id}`, {
          method: 'DELETE',
        });
        
        showToast(t('tasks.delete_success'));
        closeTaskModal(); // Close modal and refresh
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  );
}

// Open task in editor (switch to pattern tab with task data)
function openTaskInEditor() {
  const task = window.taskState.currentTask;
  if (!task) return;
  
  // Close modal first
  closeTaskModal();
  
  // Check if task has pixel matrix
  if (!task.pixel_matrix) {
    showToast(t('tasks.no_pattern'), true);
    return;
  }
  
  // Store the task ID being edited
  window.appState.editingTaskId = task.id;
  
  // Load task data into appState
  // Parse pixel_matrix if it's a string (from JSON storage)
  window.appState.pixelMatrix = typeof task.pixel_matrix === 'string' 
    ? JSON.parse(task.pixel_matrix) 
    : task.pixel_matrix;
  
  window.appState.gridSize = { 
    width: task.grid_width, 
    height: task.grid_height 
  };
  window.appState.palettePreset = task.palette_preset || '221';
  
  // Recalculate color summary from pixel matrix to ensure consistency
  recalculateColorSummary();
  
  // Build colorData lookup (same format as generate: code -> color object)
  window.appState.colorData = {};
  window.appState.colorSummary.forEach(c => {
    window.appState.colorData[c.code] = c;
  });
  
  // Reset edit state
  window.appState.activeColors = new Set();
  window.appState.selectedCells = new Set();
  window.appState.editMode = false;
  window.appState.brushColor = undefined;
  
  // Switch to pattern tab
  switchMainTab('pattern');
  
  // Show result area and hide empty state
  document.getElementById('result-area').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
  
  // Reset edit button text
  const editBtn = document.getElementById('edit-toggle');
  if (editBtn) {
    editBtn.innerHTML = '✎ <span data-i18n="btn.edit">Edit</span>';
  }
  
  // Render the pattern
  renderCanvas();
  renderColorPanel();
}

// Continue task (same as open in editor)
function continueTask() {
  openTaskInEditor();
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Save current pattern as task
async function saveCurrentPatternAsTask() {
  if (!window.appState.pixelMatrix) {
    showToast(t('toast.upload_first'), true);
    return;
  }
  
  const taskData = {
    pixel_matrix: window.appState.pixelMatrix,
    color_summary: window.appState.colorSummary,
    grid_width: window.appState.gridSize.width,
    grid_height: window.appState.gridSize.height,
    total_beads: window.appState.totalBeads,
    palette_preset: window.appState.palettePreset,
    preview_image: await generateTaskPreview(),
  };
  
  try {
    let response;
    let taskId = window.appState.editingTaskId;
    
    if (taskId) {
      // Update existing task
      response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
    } else {
      // Create new task
      taskData.name = 'New Task';
      taskData.status = 'pending';
      response = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
    }
    
    const data = await response.json();
    
    if (data.success) {
      showToast(t('tasks.save_success'));
      // Update editingTaskId if it was a new task
      if (!taskId && data.task) {
        window.appState.editingTaskId = data.task.id;
        taskId = data.task.id;
      }
      // Switch to bead board tab and select the task
      switchMainTab('tasks');
      if (taskId) selectTask(taskId);
    } else {
      showToast(t('tasks.save_failed'), true);
    }
  } catch (err) {
    console.error('Failed to save task:', err);
    showToast(t('tasks.save_failed'), true);
  }
}


// ==================== Art Picture History ====================

async function loadArtPicHistory() {
  try {
    const response = await fetchWithAuth('/api/art-pics');
    if (!response.ok) return;
    const data = await response.json();
    const list = document.getElementById('history-list');
    if (!list) return;

    if (!data.pics || data.pics.length === 0) {
      list.innerHTML = '<div class="history-empty">' + (t('generate.history_empty') || '暂无历史图片') + '</div>';
      return;
    }

    list.innerHTML = data.pics.map(pic => {
      const prompt = pic.prompt || '';
      const shortPrompt = prompt.substring(0, 40);
      const escapedPrompt = prompt.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `<div class="history-item" onclick="selectHistoryImage('${pic.url}', '${pic.filename}')">
        <img src="${pic.url}" alt="${shortPrompt}" loading="lazy">
        <div class="history-item-overlay">
          ${prompt ? `<div class="history-item-prompt">${shortPrompt}</div>` : ''}
          <div class="history-item-actions">
            <button class="history-action-btn" onclick="event.stopPropagation(); copyHistoryPrompt('${escapedPrompt}')">${t('btn.copy')}</button>
            <button class="history-action-btn" onclick="event.stopPropagation(); downloadHistoryImage('${pic.url}', '${pic.filename}')">${t('btn.download')}</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('Failed to load art pic history:', err);
  }
}

function selectHistoryImage(url, filename) {
  // Show in the main preview area
  const generatedImage = document.getElementById('generated-image');
  const generateResult = document.getElementById('generate-result');
  const generateEmpty = document.getElementById('generate-empty');

  if (generatedImage) generatedImage.src = url;
  if (generateResult) generateResult.style.display = 'block';
  if (generateEmpty) generateEmpty.style.display = 'none';

  window.imageGenState.generatedImageUrl = url;
}

function copyHistoryPrompt(prompt) {
  if (!prompt) return;
  navigator.clipboard.writeText(prompt).then(() => {
    showToast(t('generate.prompt_copied') || '提示词已复制');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = prompt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(t('generate.prompt_copied') || '提示词已复制');
  });
}

function downloadHistoryImage(url, filename) {
  fetch(url)
    .then(response => response.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || 'art_image.png';
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => {
      window.open(url, '_blank');
    });
}

function clearArtPicHistory() {
  showConfirmDialog(
    t('generate.clear_title'),
    t('generate.clear_confirm'),
    async () => {
      try {
        const response = await fetchWithAuth('/api/art-pics', { method: 'DELETE' });
        if (response.ok) {
          loadArtPicHistory();
          showToast(t('generate.clear_success'));
        }
      } catch (err) {
        console.error('Failed to clear history:', err);
      }
    }
  );
}
