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
  'preview.needMore': { vi: 'Cần ít nhất 2 nguồn để xem trước.', en: 'Need at least 2 sources to preview.' },
  'preview.copy': { vi: 'Copy Markdown', en: 'Copy Markdown' },
  'preview.copied': { vi: 'Đã copy!', en: 'Copied!' },
  'preview.reports': { vi: 'Nguồn thông tin', en: 'Information sources' },
  'preview.excludedCount': { vi: 'Nguồn bị loại trừ', en: 'Excluded sources' },
  'preview.characters': { vi: 'Số ký tự', en: 'Character count' },
  'preview.file': { vi: 'Tên file xuất', en: 'Export filename' },

  // Settings
  'settings.language': { vi: 'Ngôn ngữ', en: 'Language' },
  'settings.removeWhitespace': { vi: 'Chuẩn hóa khoảng trắng', en: 'Normalize whitespace' },
  'settings.mergeLines': { vi: 'Xuất thành một dòng', en: 'Export as single line' },
  'settings.excludeSelf': { vi: 'Review chéo', en: 'Cross-review' },

  // Toolbar
  'toolbar.new': { vi: 'Thêm mới', en: 'New' },
  'toolbar.open': { vi: 'Mở', en: 'Open' },
  'toolbar.save': { vi: 'Lưu', en: 'Save' },
  'toolbar.projectTitle': { vi: 'Tên dự án', en: 'Project title' },
  'toolbar.lightMode': { vi: 'Sáng', en: 'Light' },
  'toolbar.darkMode': { vi: 'Tối', en: 'Dark' },

  // Footer actions
  'footer.exportMd': { vi: 'Xuất .md', en: 'Export .md' },
  'footer.exportZip': { vi: 'Xuất .zip', en: 'Export .zip' },
  'footer.import': { vi: 'Nhập tệp', en: 'Import' },

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

  // Home tab
  'tab.home': { vi: 'Trang chủ', en: 'Home' },

  // Settings — Preview
  'settings.previewFormat': { vi: 'Định dạng xem trước', en: 'Preview format' },
  'settings.previewFormat.html': { vi: 'HTML', en: 'HTML' },
  'settings.previewFormat.markdown': { vi: 'Markdown', en: 'Markdown' },
  'settings.compactMode': { vi: 'Chế độ gọn', en: 'Compact mode' },

  // Settings — AI provider
  'settings.aiProvider': { vi: 'AI Provider', en: 'AI provider' },
  'settings.aiProvider.kind': { vi: 'Loại', en: 'Kind' },
  'settings.aiProvider.baseUrl': { vi: 'Base URL', en: 'Base URL' },
  'settings.aiProvider.apiKey': { vi: 'API key', en: 'API key' },
  'settings.aiProvider.model': { vi: 'Model', en: 'Model' },
  'settings.aiProvider.maxChars': { vi: 'Giới hạn ký tự đầu vào', en: 'Max input characters' },
  'settings.aiProvider.test': { vi: 'Kiểm tra kết nối', en: 'Test connection' },
  'settings.aiProvider.save': { vi: 'Lưu cấu hình', en: 'Save' },
  'settings.aiProvider.saved': { vi: 'Đã lưu cấu hình AI', en: 'AI provider saved' },
  'settings.aiProvider.testOk': { vi: 'Kết nối thành công', en: 'Connection OK' },
  'settings.aiProvider.detectModels': { vi: 'Phát hiện model', en: 'Detect models' },
  'settings.aiProvider.dirty': { vi: 'Có thay đổi chưa lưu', en: 'Unsaved changes' },

  // Settings — Prompt
  'settings.aiPrompt': { vi: 'Prompt cho AI', en: 'Rewrite prompt' },
  'settings.aiPrompt.reset': { vi: 'Khôi phục mặc định', en: 'Reset to default' },

  // Generate / cancel
  'action.generateReport': { vi: 'Tạo báo cáo tổng hợp', en: 'Generate consolidated report' },
  'action.generating': { vi: 'Đang tạo...', en: 'Generating...' },
  'action.cancel': { vi: 'Huỷ', en: 'Cancel' },

  // Content tabs
  'tab.closeAi': { vi: 'Đóng tab AI', en: 'Close AI tab' },
  'tab.closeAllAi': { vi: 'Đóng tất cả tab AI', en: 'Close all AI tabs' },
  'tab.preview': { vi: 'Xem trước', en: 'Preview' },

  // Toasts
  'toast.aiNotConfigured': { vi: 'Hãy cấu hình AI trong Settings trước.', en: 'Configure an AI provider in Settings first.' },
  'toast.needTwoSources': { vi: 'Cần ít nhất 2 nguồn hoạt động.', en: 'Add at least 2 active sources.' },
  'toast.copied': { vi: 'Đã copy!', en: 'Copied!' },
  'toast.aiTimeout': { vi: 'AI phản hồi quá lâu.', en: 'AI request timed out.' },
  'toast.aiCancelled': { vi: 'Đã huỷ yêu cầu AI.', en: 'AI request cancelled.' },
  'toast.aiInputTooLarge': { vi: 'Nội dung quá lớn, tăng giới hạn trong Settings.', en: 'Input too large — raise the limit in Settings.' },
  'toast.aiSaved': { vi: 'Đã lưu cấu hình AI.', en: 'AI provider saved.' },

  // AI tabs
  'tabs.rewrite': { vi: 'Tạo lại', en: 'Rewrite' },

  // Toasts — AI errors
  'toast.ai.networkError': { vi: 'Không thể kết nối AI.', en: 'AI provider unreachable.' },
  'toast.ai.authError': { vi: 'Xác thực thất bại.', en: 'Authentication failed.' },

  // AI provider — API key scrub notice
  'settings.aiProvider.keyMissing': { vi: 'API key không được lưu trong bản nháp tự động. Nhập lại, hoặc mở file dự án để khôi phục.', en: 'API key is not stored in auto-saved drafts for security. Re-enter it, or open the project file from disk to restore it.' },
  'settings.aiProvider.keyMissingDismiss': { vi: 'Ẩn cho phiên này', en: 'Dismiss for session' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key][lang] ?? translations[key].vi;
}
