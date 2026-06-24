// === Pindou i18n (English only) ===

const I18N = {
  // Common
  'common.loading': 'Loading...',
  
  // Upload
  'upload.drop_hint': 'Drop image here or click to upload',
  'upload.format_hint': 'JPG, PNG, GIF, WEBP (max 20MB)',

  // Settings - Palette
  'settings.palette_preset': 'Palette Preset',

  // Settings - Grid
  'settings.board_size': 'Bead Board Size',
  'settings.fixed_grid': 'Fixed Grid',
  'settings.pixel_block': 'Pixel Block Size',
  'settings.pixel_block_label': 'Pixel block size:',
  'grid.small': 'pegs (small)',
  'grid.1board': 'pegs (1 board)',
  'grid.default': 'pegs',
  'grid.2x2': 'pegs (2x2 boards)',
  'grid.3x3': 'pegs (3x3 boards)',

  // Settings - Color
  'settings.color_controls': 'Color Controls',
  'settings.search_color': 'Search by code...',
  'settings.max_colors': 'Max colors:',
  'settings.max_colors_hint': '0 = unlimited (auto). Drag to limit the number of colors used.',
  'settings.merge_threshold': 'Color merge threshold:',
  'settings.merge_hint': 'Merge similar colors to reduce total count. Higher = more merging.',

  // Settings - Adjustments
  'settings.image_adjustments': 'Image Adjustments',
  'settings.contrast': 'Contrast:',
  'settings.saturation': 'Saturation:',
  'settings.sharpness': 'Sharpness:',
  'settings.adjust_hint': '0 = auto-detect. Drag left to reduce, right to boost.',

  // Settings - Background
  'settings.bg_removal': 'Background Removal',
  'settings.auto_remove_bg': 'Auto remove background',
  'settings.bg_hint': 'Detects the dominant border color and flood-fills it as transparent.',

  // Settings - Dithering
  'settings.dithering': 'Dithering',
  'settings.enable_dithering': 'Enable Floyd-Steinberg dithering',
  'settings.dithering_hint': 'Produces smoother color transitions but takes longer',

  // Settings - Export
  'settings.export_settings': 'Export Settings',
  'settings.watermark_text': 'Watermark:',
  'settings.bottom_left_text': 'Bottom left text:',

  // Buttons
  'btn.generate': 'Generate Pattern',
  'btn.reset': 'Reset',
  'btn.edit': 'Edit',
  'btn.exit_edit': 'Exit Edit',
  'btn.fill_selection': 'Click to fill',
  'btn.export_png': 'Export PNG',
  'btn.save_task': 'Save as Task',
  'btn.generate_image': 'Generate Image',
  'btn.download': 'Download Image',
  'btn.send_to_pattern': 'Send to Pattern',

  // Tabs
  'tab.image_generate': '✨ Image Generation',
  'tab.pattern_generate': '🎨 Pattern Generation',
  'tab.bead_board': '🧺 Bead Board',

  // Tasks
  'tasks.title': 'My Bead Tasks',
  'tasks.empty': 'No tasks yet.',
  'tasks.select_hint': 'Select a task to view details',
  'tasks.filter_all': 'All',
  'tasks.filter_pending': 'Pending',
  'tasks.filter_progress': 'In Progress',
  'tasks.filter_completed': 'Completed',
  'tasks.status': 'Status:',
  'tasks.status_pending': 'Pending',
  'tasks.status_progress': 'In Progress',
  'tasks.status_in_progress': 'In Progress',
  'tasks.status_completed': 'Completed',
  'tasks.grid_size': 'Size:',
  'tasks.total_beads': 'Total Beads:',
  'tasks.progress': 'Progress:',
  'tasks.beads': 'beads',
  'tasks.preview': 'Preview',
  'tasks.colors': 'Color Summary',
  'tasks.description': 'Notes',
  'tasks.delete': 'Delete',
  'tasks.continue': 'Continue',
  'tasks.save_success': 'Task saved successfully',
  'tasks.save_failed': 'Failed to save task',
  'tasks.delete_confirm': 'Are you sure you want to delete this task?',
  'tasks.delete_success': 'Task deleted',
  'tasks.no_task_selected': 'Please select a task first',
  'tasks.load_failed': 'Failed to load tasks',
  'tasks.create_failed': 'Failed to create task',

  // Image Generation
  'generate.prompt': 'Prompt',
  'generate.prompt_hint': 'Detailed description works better',
  'generate.reference_image': 'Reference Image (Optional)',
  'generate.ref_hint': 'Upload reference image',
  'generate.ref_desc': 'Optional. With a reference image, AI will generate a new image based on it and the prompt',
  'generate.empty': 'Enter a prompt to start generating',
  'generate.generating': 'Generating image...',
  'generate.success': 'Image generated successfully',
  'generate.failed': 'Image generation failed',
  'generate.no_prompt': 'Please enter a prompt',

  // Result
  'result.empty': 'Upload an image and generate a pattern',
  'result.colors_used': 'Colors Used',
  'result.colors_total': '{colors} colors, {beads} beads total',

  // Toast messages
  'toast.upload_type_error': 'Please upload an image file (JPG, PNG, GIF, WEBP)',
  'toast.upload_size_error': 'File size exceeds 20MB limit',
  'toast.upload_first': 'Please upload an image first',
  'toast.processing': 'Processing...',
  'toast.pattern_result': 'Pattern: {w}x{h}, {c} colors',
  'toast.timeout': 'Processing timeout. Try reducing resolution.',
  'toast.update_failed': 'Failed to update cell',
  'toast.png_success': 'PNG exported successfully',
  'toast.png_failed': 'PNG export failed',
  'toast.reset_success': 'Settings reset',
  'toast.brush_set': 'Brush: {code}',
  'toast.edit_mode_hint': 'Click color to pick, drag to select cells, click to fill',
  'toast.cells_selected': '{count} cells selected',
  'toast.cells_filled': '{count} cells filled',
  'toast.select_color_first': 'Select a color first',

  // Slider values
  'value.auto': 'Auto',
  'value.off': 'Off',
};

// Get translated string, with optional template variables
function t(key, vars) {
  const str = I18N[key] || key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    // For input elements, set placeholder; for others, set textContent
    if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio') {
      el.placeholder = translated;
    } else {
      el.textContent = translated;
    }
  });

  // Update grid size options
  updateGridOptions();

  // Update dynamic slider labels
  updateSliderLabels();
}

// Update grid select options with translated text
function updateGridOptions() {
  const select = document.getElementById('grid-size-select');
  if (!select) return;
  const options = select.options;
  const gridTexts = {
    '15x15': `15 x 15 ${t('grid.small')}`,
    '29x29': `29 x 29 ${t('grid.1board')}`,
    '32x32': `32 x 32 ${t('grid.default')}`,
    '48x48': `48 x 48 ${t('grid.default')}`,
    '52x52': `52 x 52 ${t('grid.2x2')}`,
    '64x64': `64 x 64 ${t('grid.default')}`,
    '87x87': `87 x 87 ${t('grid.3x3')}`,
    '96x96': `96 x 96 ${t('grid.default')}`,
  };
  for (let i = 0; i < options.length; i++) {
    const val = options[i].value;
    if (gridTexts[val]) {
      options[i].textContent = gridTexts[val];
    }
  }
}

// Re-apply slider value labels
function updateSliderLabels() {
  const maxSlider = document.getElementById('max-colors-slider');
  if (maxSlider) {
    const v = parseInt(maxSlider.value);
    document.getElementById('max-colors-value').textContent = v === 0 ? t('value.auto') : v;
  }

  const simSlider = document.getElementById('similarity-slider');
  if (simSlider) {
    const v = parseInt(simSlider.value);
    document.getElementById('similarity-value').textContent = v === 0 ? t('value.off') : v;
  }

  ['contrast', 'saturation', 'sharpness'].forEach(name => {
    const slider = document.getElementById(`${name}-slider`);
    const display = document.getElementById(`${name}-value`);
    if (slider && display) {
      const v = parseInt(slider.value);
      display.textContent = v === 0 ? t('value.auto') : (v > 0 ? '+' + v : v);
    }
  });
}
