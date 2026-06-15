import { useProjectStore } from "../state/projectStore";

export function Sidebar() {
  const { project, selectedQaId, selectQa, addQa, removeQa, duplicateQa, removeEmptyQa } =
    useProjectStore();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Đội QA
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {project.qa_reports.length} đội
        </p>
      </div>

      {/* QA List */}
      <div className="flex-1 overflow-y-auto">
        {project.qa_reports.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
              Chưa có QA nào
            </p>
            <button
              onClick={addQa}
              className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Thêm QA đầu tiên
            </button>
          </div>
        ) : (
          <ul className="py-1">
            {project.qa_reports.map((qa, index) => {
              const isSelected = qa.id === selectedQaId;
              const hasContent = qa.content.trim().length > 0;
              const hasName = qa.name.trim().length > 0;

              return (
                <li
                  key={qa.id}
                  className={`
                    group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors
                    ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                    }
                  `}
                  onClick={() => selectQa(qa.id)}
                >
                  {/* Status indicator */}
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      hasContent && hasName
                        ? "bg-green-400"
                        : hasName
                        ? "bg-yellow-400"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    title={
                      hasContent && hasName
                        ? "Đã có nội dung"
                        : hasName
                        ? "Chưa có nội dung"
                        : "Chưa hoàn thiện"
                    }
                  />

                  {/* QA label */}
                  <span className="flex-1 text-sm truncate">
                    {hasName ? qa.name : `QA ${index + 1} (chưa đặt tên)`}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQa(qa.id);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Nhân bản"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQa(qa.id);
                      }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                      title="Xoá"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bottom actions */}
      {project.qa_reports.length > 0 && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex gap-1">
          <button
            onClick={addQa}
            className="flex-1 px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
          >
            + Thêm QA
          </button>
          <button
            onClick={removeEmptyQa}
            className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs transition-colors"
            title="Xoá QA rỗng"
          >
            Xoá rỗng
          </button>
        </div>
      )}
    </div>
  );
}
