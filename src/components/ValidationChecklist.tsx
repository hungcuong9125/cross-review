import { useProjectStore } from "../state/projectStore";

export function ValidationChecklist() {
  const { project, validation } = useProjectStore();

  const checks = [
    {
      label: "Có ít nhất 2 QA",
      pass: project.qa_reports.length >= 2,
    },
    {
      label: "Tất cả QA có tên",
      pass:
        project.qa_reports.length > 0 &&
        project.qa_reports.every((q) => q.name.trim().length > 0),
    },
    {
      label: "Tất cả QA có nội dung",
      pass:
        project.qa_reports.length > 0 &&
        project.qa_reports.every((q) => q.content.trim().length > 0),
    },
    {
      label: "Phần mở đầu không rỗng",
      pass: project.opening_text.trim().length > 0,
    },
    {
      label: "Phần kết thúc không rỗng",
      pass: project.closing_text.trim().length > 0,
    },
  ];

  const allPass = checks.every((c) => c.pass);

  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Kiểm tra
      </h3>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-xs">
            <span
              className={`w-4 h-4 flex items-center justify-center rounded-full text-white text-[10px] ${
                check.pass
                  ? "bg-green-500"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              {check.pass ? "✓" : "·"}
            </span>
            <span
              className={
                check.pass
                  ? "text-green-700 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {check.label}
            </span>
          </li>
        ))}
      </ul>

      {/* Error messages from validation */}
      {validation && validation.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {validation.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-500 dark:text-red-400">
              ⚠ {err}
            </p>
          ))}
        </div>
      )}

      {/* Warning messages */}
      {validation && validation.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {validation.warnings.map((warn, i) => (
            <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚡ {warn}
            </p>
          ))}
        </div>
      )}

      {allPass && (
        <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
          ✓ Sẵn sàng export
        </p>
      )}
    </div>
  );
}
