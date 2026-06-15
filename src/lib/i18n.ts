export type Language = 'vi' | 'en';

export const translations = {
  // Sidebar
  'sidebar.qaTeams': { vi: 'ĐỘI QA', en: 'QA TEAMS' },
  'sidebar.teams': { vi: 'đội', en: 'teams' },
  'sidebar.noQa': { vi: 'Chưa có QA', en: 'No QA yet' },
  'sidebar.noQaDesc': { vi: 'Thêm báo cáo QA đầu tiên để bắt đầu', en: 'Add the first QA report to get started' },
  'sidebar.addReport': { vi: 'Thêm báo cáo', en: 'Add Report' },
  'sidebar.addComponent': { vi: 'Thêm thành phần', en: 'Add Component' },
  'sidebar.removeEmpty': { vi: 'Xóa rỗng', en: 'Remove Empty' },
  'sidebar.removeAll': { vi: 'Xóa tất cả báo cáo', en: 'Remove All Reports' },
  'sidebar.reports': { vi: 'Báo cáo', en: 'Reports' },
  'sidebar.components': { vi: 'Thành phần', en: 'Components' },
  'sidebar.unnamed': { vi: 'chưa đặt tên', en: 'unnamed' },

  // Editor
  'editor.qaReport': { vi: 'Báo cáo QA', en: 'QA Report' },
  'editor.opening': { vi: 'Mở đầu', en: 'Opening' },
  'editor.closing': { vi: 'Kết thúc', en: 'Closing' },
  'editor.selectQa': { vi: 'Chọn một QA ở sidebar hoặc thêm mới', en: 'Select a QA from the sidebar or add a new one' },
  'editor.namePlaceholder': { vi: 'Tên QA (ví dụ: Team Growth)', en: 'QA name (e.g. Team Growth)' },
  'editor.contentPlaceholder': { vi: 'Nội dung báo cáo của QA này...', en: 'Report content for this QA...' },
  'editor.clear': { vi: 'Xóa', en: 'Clear' },
  'editor.chars': { vi: 'ký tự', en: 'chars' },
  'editor.words': { vi: 'từ', en: 'words' },
  'editor.componentName': { vi: 'Tên thành phần', en: 'Component name' },
  'editor.componentContent': { vi: 'Nội dung thành phần...', en: 'Component content...' },
  'editor.position': { vi: 'Vị trí', en: 'Position' },
  'editor.atOpening': { vi: 'Mở đầu', en: 'Opening' },
  'editor.atClosing': { vi: 'Kết thúc', en: 'Closing' },
  'editor.deleteComponent': { vi: 'Xóa thành phần', en: 'Delete Component' },

  // Preview
  'preview.title': { vi: 'Xem trước', en: 'Preview' },
  'preview.target': { vi: 'Xem trước cho:', en: 'Preview for:' },
  'preview.info': { vi: 'Xem trước này dành cho', en: 'This preview is for' },
  'preview.excluded': { vi: 'Nội dung của', en: 'Content of' },
  'preview.excludedEnd': { vi: 'đã được loại khỏi file.', en: 'has been removed from the file.' },
  'preview.needMore': { vi: 'Cần ít nhất 2 QA để xem trước.', en: 'Need at least 2 QA to preview.' },
  'preview.copy': { vi: 'Copy Markdown', en: 'Copy Markdown' },
  'preview.copied': { vi: 'Đã copy!', en: 'Copied!' },
  'preview.reports': { vi: 'Báo cáo', en: 'Reports' },
  'preview.excludedCount': { vi: 'Loại trừ', en: 'Excluded' },
  'preview.characters': { vi: 'Ký tự', en: 'Characters' },
  'preview.file': { vi: 'File', en: 'File' },

  // Settings
  'settings.title': { vi: 'Cài đặt', en: 'Settings' },
  'settings.language': { vi: 'Ngôn ngữ', en: 'Language' },
  'settings.removeWhitespace': { vi: 'Xóa khoảng trắng thừa', en: 'Remove extra whitespace' },
  'settings.removeWhitespaceDesc': { vi: 'Loại bỏ các dòng trống liên tiếp', en: 'Remove consecutive blank lines' },
  'settings.compactMode': { vi: 'Gộp nội dung', en: 'Compact mode' },
  'settings.compactModeDesc': { vi: 'Gộp nhỏ nội dung cho LLM dễ đọc', en: 'Compact content for LLM readability' },

  // Toolbar
  'toolbar.new': { vi: 'Mới', en: 'New' },
  'toolbar.open': { vi: 'Mở', en: 'Open' },
  'toolbar.save': { vi: 'Lưu', en: 'Save' },
  'toolbar.exportMd': { vi: 'Export .md', en: 'Export .md' },
  'toolbar.exportZip': { vi: 'Export .zip', en: 'Export .zip' },
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
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key][lang] || translations[key].vi;
}
