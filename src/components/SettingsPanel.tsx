import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";

export function SettingsPanel() {
  const { language, setLanguage, compactMode, toggleCompactMode, removeWhitespace, toggleRemoveWhitespace } = useProjectStore();

  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {t("settings.title", language)}
      </h3>

      {/* Language selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
          {t("settings.language", language)}
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => setLanguage("vi")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              language === "vi"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            Tiếng Việt
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              language === "en"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Remove extra whitespace */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={removeWhitespace}
            onChange={toggleRemoveWhitespace}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <div>
            <span className="text-xs text-gray-700 dark:text-gray-200">
              {t("settings.removeWhitespace", language)}
            </span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {t("settings.removeWhitespaceDesc", language)}
            </p>
          </div>
        </label>
      </div>

      {/* Compact mode */}
      <div className="mb-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={toggleCompactMode}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <div>
            <span className="text-xs text-gray-700 dark:text-gray-200">
              {t("settings.compactMode", language)}
            </span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {t("settings.compactModeDesc", language)}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
