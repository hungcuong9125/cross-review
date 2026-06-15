import { useProjectStore, type ActiveTab } from "../state/projectStore";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function TabButton({
  tab,
  label,
  active,
  onClick,
}: {
  tab: ActiveTab;
  label: string;
  active: boolean;
  onClick: (tab: ActiveTab) => void;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

export function EditorPanel() {
  const {
    project,
    selectedQaId,
    activeTab,
    setActiveTab,
    setOpeningText,
    setClosingText,
    updateQaName,
    updateQaContent,
  } = useProjectStore();

  const selectedQa = project.qa_reports.find((q) => q.id === selectedQaId);
  const selectedIndex = selectedQa
    ? project.qa_reports.findIndex((q) => q.id === selectedQaId)
    : -1;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <TabButton
          tab="opening"
          label="Mở đầu"
          active={activeTab === "opening"}
          onClick={setActiveTab}
        />
        <TabButton
          tab="reports"
          label={`Báo cáo QA${selectedQa ? ` (${selectedQa.name || selectedIndex + 1})` : ""}`}
          active={activeTab === "reports"}
          onClick={setActiveTab}
        />
        <TabButton
          tab="closing"
          label="Kết thúc"
          active={activeTab === "closing"}
          onClick={setActiveTab}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "opening" && (
          <div className="h-full flex flex-col p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phần mở đầu
            </label>
            <textarea
              value={project.opening_text}
              onChange={(e) => setOpeningText(e.target.value)}
              className="flex-1 w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Nhập phần mở đầu cho tất cả file export..."
            />
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {project.opening_text.length.toLocaleString()} ký tự ·{" "}
              {countWords(project.opening_text).toLocaleString()} từ
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="h-full flex flex-col p-4">
            {!selectedQa ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 dark:text-gray-500 mb-3">
                    Chọn một QA ở sidebar hoặc thêm QA mới
                  </p>
                  <button
                    onClick={() => useProjectStore.getState().addQa()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    + Thêm QA
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* QA name input */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tên đội QA
                  </label>
                  <input
                    type="text"
                    value={selectedQa.name}
                    onChange={(e) => updateQaName(selectedQa.id, e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={`QA ${selectedIndex + 1}`}
                  />
                </div>

                {/* Content textarea */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nội dung báo cáo
                    </label>
                    <button
                      onClick={() => updateQaContent(selectedQa.id, "")}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      title="Xoá nội dung"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    value={selectedQa.content}
                    onChange={(e) =>
                      updateQaContent(selectedQa.id, e.target.value)
                    }
                    className="flex-1 w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Dán báo cáo QA vào đây..."
                  />
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {selectedQa.content.length.toLocaleString()} ký tự ·{" "}
                    {countWords(selectedQa.content).toLocaleString()} từ
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "closing" && (
          <div className="h-full flex flex-col p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phần kết thúc
            </label>
            <textarea
              value={project.closing_text}
              onChange={(e) => setClosingText(e.target.value)}
              className="flex-1 w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Nhập phần kết thúc cho tất cả file export..."
            />
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {project.closing_text.length.toLocaleString()} ký tự ·{" "}
              {countWords(project.closing_text).toLocaleString()} từ
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
