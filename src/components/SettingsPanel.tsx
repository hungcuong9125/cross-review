import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";

export function SettingsPanel() {
  const { language, setLanguage, compactMode, toggleCompactMode, removeWhitespace, toggleRemoveWhitespace } = useProjectStore();

  return (
    <div className="p-2.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        {t("settings.title", language)}
      </h3>

      {/* Row 1: Language label + buttons in one line */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-gray-600 dark:text-gray-300">
          {t("settings.language", language)}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setLanguage("vi")}
            className={`px-2.5 py-0.5 text-[10px] rounded-l-md transition-colors ${
              language === "vi"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            VI
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-0.5 text-[10px] rounded-r-md transition-colors ${
              language === "en"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Row 2: Two checkboxes side by side */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={removeWhitespace}
            onChange={toggleRemoveWhitespace}
            className="w-3 h-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-[11px] text-gray-600 dark:text-gray-300">
            {t("settings.removeWhitespace", language)}
          </span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={toggleCompactMode}
            className="w-3 h-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-[11px] text-gray-600 dark:text-gray-300">
            {t("settings.compactMode", language)}
          </span>
        </label>
      </div>
    </div>
  );
}
