import { useProjectStore } from "../state/projectStore";
import { t } from "../lib/i18n";

export function SettingsPanel() {
  const { language, setLanguage } = useProjectStore();

  return (
    <div className="p-2.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t("settings.language", language)}
      </span>
      <div className="flex gap-0.5">
        <button
          onClick={() => setLanguage("vi")}
          className={`px-2.5 py-0.5 text-[9px] font-semibold rounded-l transition-colors ${
            language === "vi"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          VI
        </button>
        <button
          onClick={() => setLanguage("en")}
          className={`px-2.5 py-0.5 text-[9px] font-semibold rounded-r transition-colors ${
            language === "en"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
