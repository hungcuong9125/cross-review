export type Language = 'vi' | 'en';

export const translations = {
  // Sidebar
  'sidebar.noQa': { vi: 'Chưa có nguồn', en: 'No sources yet' },
  'sidebar.addReport': { vi: 'Thêm nguồn', en: 'Add Source' },
  'sidebar.addOpening': { vi: 'Thêm mở đầu', en: 'Add Opening' },
  'sidebar.addClosing': { vi: 'Thêm kết thúc', en: 'Add Closing' },
  'sidebar.removeEmpty': { vi: 'Xóa rỗng', en: 'Remove Empty' },
  'sidebar.removeAll': { vi: 'Xóa tất cả nguồn', en: 'Remove All Sources' },
  'sidebar.reports': { vi: 'Nguồn', en: 'Sources' },
  'sidebar.components': { vi: 'Thành phần', en: 'Components' },
  'sidebar.unnamed': { vi: 'Chưa đặt tên', en: 'unnamed' },

  // Editor
  'editor.opening': { vi: 'Mở đầu', en: 'Opening' },
  'editor.closing': { vi: 'Kết thúc', en: 'Closing' },
  'editor.selectQa': { vi: 'Chọn một nguồn ở sidebar hoặc thêm mới', en: 'Select a source from the sidebar or add a new one' },
  'editor.clear': { vi: 'Xóa', en: 'Clear' },
  'editor.chars': { vi: 'ký tự', en: 'chars' },
  'editor.words': { vi: 'từ', en: 'words' },
  'editor.componentName': { vi: 'Tên thành phần', en: 'Component name' },
  'editor.componentContent': { vi: 'Nội dung thành phần...', en: 'Component content...' },
  'editor.position': { vi: 'Vị trí', en: 'Position' },
  'editor.atOpening': { vi: 'Mở đầu', en: 'Opening' },
  'editor.atClosing': { vi: 'Kết thúc', en: 'Closing' },
  'editor.deleteComponent': { vi: 'Xóa thành phần', en: 'Delete Component' },
  'editor.noComponents': { vi: 'Chưa có thành phần nào', en: 'No components yet' },
  'editor.addComponentHere': { vi: 'Thêm thành phần', en: 'Add component' },
  'editor.moveUp': { vi: 'Di chuyển lên', en: 'Move up' },
  'editor.moveDown': { vi: 'Di chuyển xuống', en: 'Move down' },

  // Preview
  'preview.target': { vi: 'Xem bản gửi', en: 'Preview' },
  'preview.info': { vi: 'Xem trước này dành cho', en: 'This preview is for' },
  'preview.excluded': { vi: 'Nội dung của', en: 'Content of' },
  'preview.excludedEnd': { vi: 'đã được loại khỏi bản gửi.', en: 'has been excluded from the submission.' },
  'preview.needMore': { vi: 'Cần ít nhất 2 nguồn để xem trước.', en: 'Need at least 2 sources to preview.' },
  'preview.copy': { vi: 'Copy Markdown', en: 'Copy Markdown' },
  'preview.copied': { vi: 'Đã copy!', en: 'Copied!' },
  'preview.reports': { vi: 'Nguồn thông tin', en: 'Information sources' },
  'preview.excludedCount': { vi: 'Nguồn bị loại trừ', en: 'Excluded sources' },
  'preview.characters': { vi: 'Số ký tự', en: 'Character count' },
  'preview.file': { vi: 'Tên file xuất', en: 'Export filename' },

  // Settings
  'settings.title': { vi: 'Cài đặt', en: 'Settings' },
  'settings.language': { vi: 'Cài đặt ngôn ngữ', en: 'Language Settings' },
  'settings.removeWhitespace': { vi: 'Chuẩn hóa khoảng trắng', en: 'Normalize whitespace' },
  'settings.removeWhitespaceDesc': { vi: 'Loại bỏ dòng trống liên tiếp, thu gọn', en: 'Remove blank lines, compact content' },
  'settings.mergeLines': { vi: 'Xuất thành một dòng', en: 'Export as single line' },
  'settings.mergeLinesDesc': { vi: 'Xuất văn bản liên tục trên một dòng', en: 'Continuous text on a single line' },
  'settings.excludeSelf': { vi: 'Review chéo', en: 'Cross-review' },

  // Toolbar
  'toolbar.new': { vi: 'Thêm mới', en: 'New' },
  'toolbar.open': { vi: 'Mở', en: 'Open' },
  'toolbar.save': { vi: 'Lưu', en: 'Save' },
  'toolbar.exportMd': { vi: 'Xuất .md', en: 'Export .md' },
  'toolbar.exportZip': { vi: 'Xuất .zip', en: 'Export .zip' },
  'toolbar.projectTitle': { vi: 'Tên dự án', en: 'Project title' },
  'toolbar.lightMode': { vi: 'Sáng', en: 'Light' },
  'toolbar.darkMode': { vi: 'Tối', en: 'Dark' },

  // Dialogs
  'dialog.confirmNew': { vi: 'Tạo dự án mới? Dữ liệu chưa lưu sẽ bị mất.', en: 'Create new project? Unsaved data will be lost.' },
  'dialog.exportSuccess': { vi: 'Đã export thành công', en: 'Exported successfully' },
  'dialog.exportFail': { vi: 'Export thất bại', en: 'Export failed' },
  'dialog.saveSuccess': { vi: 'Đã lưu thành công', en: 'Saved successfully' },
  'dialog.saveFail': { vi: 'Lưu thất bại', en: 'Save failed' },
  'dialog.openFail': { vi: 'Mở file thất bại', en: 'Open file failed' },
  'dialog.validationFail': { vi: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.', en: 'Data is not valid. Please check again.' },
  'dialog.noReport': { vi: 'Không có báo cáo QA nào để export.', en: 'No QA reports to export.' },
  'dialog.confirmRemoveAll': { vi: 'Xóa tất cả báo cáo QA?', en: 'Remove all QA reports?' },

  // Validation messages
  'validation.ready': { vi: '✓ Sẵn sàng export', en: '✓ Ready to export' },

  // Sidebar tooltips
  'tooltip.disable': { vi: 'Tắt', en: 'Disable' },
  'tooltip.enable': { vi: 'Bật', en: 'Enable' },
  'tooltip.duplicate': { vi: 'Nhân bản', en: 'Duplicate' },
  'tooltip.delete': { vi: 'Xóa', en: 'Delete' },
  'tooltip.exportZip': { vi: 'Xuất ZIP', en: 'Export ZIP' },

  // Duplicate suffix
  'suffix.copy': { vi: '(bản sao)', en: '(copy)' },

  // Preview loading
  'preview.loading': { vi: 'Đang tải...', en: 'Loading...' },

  // Editor placeholders
  'editor.sourceNamePlaceholder': { vi: 'TÊN NGUỒN (VÍ DỤ: TEAM GROWTH) *', en: 'SOURCE NAME (E.G. TEAM GROWTH) *' },
  'editor.sourceContentLabel': { vi: 'Nội dung nguồn...', en: 'Source content...' },
  'editor.sourceContentPlaceholder': { vi: 'Nội dung nguồn...', en: 'Source content...' },
  'editor.clearTooltip': { vi: 'Xóa nội dung', en: 'Clear content' },

  // Migration
  'migration.opening': { vi: 'Mở đầu', en: 'Opening' },
  'migration.closing': { vi: 'Kết thúc', en: 'Closing' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key][lang] ?? translations[key].vi;
}
