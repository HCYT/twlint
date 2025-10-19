// TWLint 設定檔案
// 專注於核心功能：簡繁轉換 + 大陸用語檢測

export default [
  // Global ignores - 全域忽略模式（只有 ignores 屬性時視為全域）
  // 
  // 注意：以下檔案已被系統鐵律保護，無需額外設定：
  // - 設定檔案：.gitignore, .dockerignore, .env*, 等
  // - 版本控制：.git/, .svn/, node_modules/
  // - 建構輸出：dist/, build/, .next/
  // - 日誌檔案：*.log, *.tmp
  {
    ignores: [
      // 專案特定的忽略模式
      "**/test-*.md",
      "**/draft-*.md"
    ]
  },

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
    // 測試檔案：放寬規則
    files: ["tests/**/*.{js,ts,md}"],
    rules: {
      "simplified-chars": "error",
      "mainland-terms": "off"           // 測試檔案允許大陸用語
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