// TWLint 配置檔案
// 專注於核心功能：簡繁轉換 + 大陸用語檢測

export default [
  {
    // 文件檔案：完整檢查
    files: ["**/*.md", "**/*.txt"],
    domains: ["software-development", "user-interface"],
    rules: {
      "simplified-chars": "error",      // 簡體字檢測（自動修復）
      "mainland-terms": "warning"       // 大陸用語檢測（提供建議）
    }
  },
  {
    // 程式碼檔案：檢查註解和字串內容
    files: ["src/**/*.{js,ts,jsx,tsx,vue}"],
    domains: ["software-development", "user-interface"],
    rules: {
      "simplified-chars": "error",      // 註解中的簡體字必須修復
      "mainland-terms": "warning"       // UI 文字中的大陸用語提醒
    }
  },
  {
    // 商業文件：更嚴格的檢查
    files: ["docs/business/**/*.md"],
    domains: ["business-finance"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "error"         // 商業文件更嚴格
    }
  }
]

// 使用方式:
// twlint check **/*.md                // 檢查檔案
// twlint check **/*.md --fix          // 自動修復
// twlint check src/ --domains software-development  // 指定領域

// 推薦 npm script 整合 (加入 package.json):
// {
//   "scripts": {
//     "twlint": "twlint check **/*.md",
//     "twlint:fix": "twlint check **/*.md --fix",
//     "twlint:docs": "twlint check docs/**/*.md --fix"
//   }
// }
// 然後執行: npm run twlint