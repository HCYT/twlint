#!/bin/bash

# TWLint - 技術債檢查腳本
# 作者：TWLint Team (Linus Style)
# 用法：./scripts/check-tech-debt.sh
# 檢查所有變更檔案的程式碼品質

set -e

echo "🔍 TWLint 程式碼品質檢查 - 避免技術債累積"

# 定義顏色
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 計數器
VIOLATION_FILES=()
HAS_VIOLATIONS=false

# 文件分類邏輯 - TWLint 特定
is_config_file() {
    local file="$1"
    [[ "$file" =~ .*\.config\.(js|ts)$ ]] || \
    [[ "$file" =~ tsconfig\.json$ ]] || \
    [[ "$file" =~ package\.json$ ]]
}

is_core_file() {
    local file="$1"
    [[ "$file" =~ src/core/.*\.(ts|js)$ ]]
}

is_dict_tool_file() {
    local file="$1"
    [[ "$file" =~ tools/.*\.(ts|js)$ ]] || \
    [[ "$file" =~ scripts/.*\.(ts|js|sh)$ ]]
}

# 檢查 any 型別使用 - TWLint 專案嚴禁
check_any_usage_in_file() {
    local file="$1"
    local violations=$(grep -n -E "(: any|as any|any\[\]|Array<any>|Record<string, any>)" "$file" 2>/dev/null || true)

    if [ ! -z "$violations" ]; then
        local filtered_violations=""
        while IFS= read -r line; do
            if [ ! -z "$line" ]; then
                local line_num=$(echo "$line" | cut -d: -f1)
                local line_content=$(echo "$line" | cut -d: -f2-)

                # 檢查豁免註解
                local has_exemption=false

                if echo "$line_content" | grep -q -E "// @allow-any|// @tw-allow-any|// third-party|// papaparse-type" 2>/dev/null; then
                    has_exemption=true
                fi

                if [ "$has_exemption" = false ]; then
                    local context_start=$((line_num - 2))
                    if [ $context_start -lt 1 ]; then context_start=1; fi

                    local context_lines=$(sed -n "${context_start},${line_num}p" "$file")
                    if echo "$context_lines" | grep -q -E "// @allow-any|// @tw-allow-any|// third-party|// papaparse-type" 2>/dev/null; then
                        has_exemption=true
                    fi
                fi

                if [ "$has_exemption" = false ]; then
                    filtered_violations="$filtered_violations\n$line"
                fi
            fi
        done <<< "$violations"

        if [ ! -z "$filtered_violations" ] && [ "$filtered_violations" != "\n" ]; then
            echo -e "${RED}❌ [ANY型別禁用] $file${NC}"
            echo -e "$filtered_violations" | while read line; do
                if [ ! -z "$line" ]; then
                    echo -e "   ${YELLOW}→ $line${NC}"
                fi
            done
            echo -e "   ${CYAN}💡 修復: 使用具體型別或 unknown, 必要時添加 // @tw-allow-any${NC}"
            VIOLATION_FILES+=("$file")
            return 1
        fi
    fi
    return 0
}

# 檢查 CLI 相關問題
check_cli_patterns() {
    local file="$1"

    # 檢查是否有硬編碼路徑
    local hardcoded_paths=$(grep -n -E "'/Users/|C:\\\\|/home/" "$file" 2>/dev/null || true)
    if [ ! -z "$hardcoded_paths" ]; then
        echo -e "${RED}❌ [硬編碼路徑] $file${NC}"
        echo "$hardcoded_paths" | while read line; do
            echo -e "   ${YELLOW}→ $line${NC}"
        done
        echo -e "   ${CYAN}💡 修復: 使用 process.cwd() 或相對路徑${NC}"
        VIOLATION_FILES+=("$file")
        return 1
    fi

    # 檢查是否有 process.exit() 在非 CLI 文件中
    if [[ ! "$file" =~ cli\.ts$ ]] && grep -q "process\.exit" "$file" 2>/dev/null; then
        echo -e "${RED}❌ [非法退出] $file${NC}"
        echo -e "   ${YELLOW}→ 非 CLI 文件不應使用 process.exit()${NC}"
        echo -e "   ${CYAN}💡 修復: 拋出錯誤並在 CLI 層處理${NC}"
        VIOLATION_FILES+=("$file")
        return 1
    fi

    return 0
}

# 檢查詞庫相關問題
check_dict_patterns() {
    local file="$1"

    # 檢查是否有同步文件操作
    local sync_fs=$(grep -n -E "(readFileSync|writeFileSync|existsSync)" "$file" 2>/dev/null || true)
    if [ ! -z "$sync_fs" ] && ! is_dict_tool_file "$file"; then
        echo -e "${RED}❌ [同步檔案操作] $file${NC}"
        echo "$sync_fs" | while read line; do
            echo -e "   ${YELLOW}→ $line${NC}"
        done
        echo -e "   ${CYAN}💡 修復: 使用 async/await 版本${NC}"
        VIOLATION_FILES+=("$file")
        return 1
    fi

    return 0
}

# 檢查未使用的導入
check_unused_imports() {
    local file="$1"

    local unused_imports=$(grep -n -E "^import.*\{[^}]*\}.*from" "$file" 2>/dev/null | \
        while IFS= read -r line; do
            local line_num=$(echo "$line" | cut -d: -f1)
            local import_names=$(echo "$line" | sed -E "s/.*\{([^}]*)\}.*/\1/" | tr ',' '\n')

            while IFS= read -r import_name; do
                import_name=$(echo "$import_name" | xargs)
                if [[ "$import_name" == *" as "* ]]; then
                    import_name=$(echo "$import_name" | sed 's/.* as \([^ ]*\)/\1/')
                fi
                if [ ! -z "$import_name" ] && [ "$import_name" != "type" ]; then
                    if ! grep -v "^import.*\b$import_name\b" "$file" | grep -q "\b$import_name\b" 2>/dev/null; then
                        echo "$line_num: 未使用的 import: $import_name"
                    fi
                fi
            done <<< "$import_names"
        done || true)

    if [ ! -z "$unused_imports" ]; then
        echo -e "${PURPLE}⚠️  [未使用導入] $file${NC}"
        echo "$unused_imports" | while read line; do
            echo -e "   ${YELLOW}→ $line${NC}"
        done
        VIOLATION_FILES+=("$file")
        return 1
    fi
    return 0
}

# 檢查縮進地獄 (Linus 3層縮進原則)
check_indentation_hell() {
    local file="$1"

    if is_config_file "$file"; then
        return 0
    fi

    local deep_nesting=$(grep -n -E "^(\s{12,}|\t{4,})" "$file" 2>/dev/null || true)

    if [ ! -z "$deep_nesting" ]; then
        echo -e "${CYAN}💡 [Linus縮進原則] $file${NC}"
        echo "$deep_nesting" | head -3 | while read line; do
            echo -e "   ${YELLOW}→ $line${NC}"
        done
        if [ $(echo "$deep_nesting" | wc -l) -gt 3 ]; then
            echo -e "   ${YELLOW}→ ... 還有 $(($(echo "$deep_nesting" | wc -l) - 3)) 行超過3層縮進${NC}"
        fi
        echo -e "   ${CYAN}💡 Linus: \"超過3層縮進就是垃圾，重新設計\"${NC}"
    fi
    return 0
}

# 檢查 console.log 洩漏
check_console_logs() {
    local file="$1"

    if is_config_file "$file" || is_dict_tool_file "$file"; then
        return 0
    fi

    local console_logs=$(grep -n -E "console\.(log|debug|info)" "$file" 2>/dev/null || true)

    if [ ! -z "$console_logs" ]; then
        local filtered_logs=""

        while IFS= read -r line; do
            if [ ! -z "$line" ]; then
                local line_content=$(echo "$line" | cut -d: -f2-)
                if ! echo "$line_content" | grep -q -E "// @dev-console|// development|// debug" 2>/dev/null; then
                    filtered_logs="$filtered_logs\n$line"
                fi
            fi
        done <<< "$console_logs"

        if [ ! -z "$filtered_logs" ] && [ "$filtered_logs" != "\n" ]; then
            if is_core_file "$file"; then
                echo -e "${CYAN}💡 [建議清理] $file - Console 輸出${NC}"
                echo -e "$filtered_logs" | head -3 | while read line; do
                    if [ ! -z "$line" ]; then
                        echo -e "   ${YELLOW}→ $line${NC}"
                    fi
                done
                echo -e "   ${CYAN}💡 建議: 移除或添加 // @dev-console 豁免${NC}"
            fi
        fi
    fi
    return 0
}

# 取得所有變更檔案
echo -e "${BLUE}🎯 檢查 TWLint 變更檔案...${NC}"
CHANGED_FILES=$((git diff --cached --name-only; git diff --name-only; git ls-files --others --exclude-standard) | \
    grep -E '\.(ts|tsx|js|jsx)$' | grep -v '\.d\.ts$' | \
    grep -v -E '\.(test|spec)\.(ts|tsx|js|jsx)$' | \
    grep -v -E '/__tests__/|/tests?/' | \
    sort -u || true)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${GREEN}✨ 沒有變更的檔案需要檢查${NC}"
    exit 0
fi

echo -e "${BLUE}📋 檢查範圍：${NC}"
echo "$CHANGED_FILES" | while read file; do
    echo -e "   ${BLUE}→ $file${NC}"
done
echo ""

# 檢查每個檔案
while read -r file; do
    if [ -f "$file" ] && [ ! -z "$file" ]; then
        echo "🔍 檢查: $file"

        # 強制檢查
        check_any_usage_in_file "$file" || HAS_VIOLATIONS=true
        check_cli_patterns "$file" || HAS_VIOLATIONS=true
        check_dict_patterns "$file" || HAS_VIOLATIONS=true
        check_unused_imports "$file" || HAS_VIOLATIONS=true

        # 建議檢查
        check_console_logs "$file"
        check_indentation_hell "$file"

        echo ""
    fi
done <<< "$CHANGED_FILES"

# TypeScript 檢查
echo "🔍 [TypeScript] 型別檢查..."
if command -v tsc &> /dev/null; then
    TS_ERRORS=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "error TS" || true)
    if [ ! -z "$TS_ERRORS" ]; then
        echo -e "${RED}❌ [TypeScript] 型別錯誤${NC}"
        echo "$TS_ERRORS" | head -10 | while read line; do
            echo -e "   ${YELLOW}→ $line${NC}"
        done
        HAS_VIOLATIONS=true
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  TypeScript 未安裝，跳過型別檢查${NC}"
fi

# 結果報告
echo "TWLint 程式碼檢查報告："
echo "─────────────────────────────"

if [ "$HAS_VIOLATIONS" = false ]; then
    echo -e "${GREEN}🎉 程式碼品質符合 Linus 標準${NC}"
    echo -e "${GREEN}   ✅ 無 any 型別洩漏${NC}"
    echo -e "${GREEN}   ✅ CLI 模式正確${NC}"
    echo -e "${GREEN}   ✅ 詞庫處理規範${NC}"
    echo -e "${GREEN}   ✅ 型別檢查通過${NC}"
    echo -e "${GREEN}✨ 可以安全提交${NC}"
    exit 0
else
    echo -e "${RED}⚠️  發現技術債問題${NC}"
    echo ""
    echo -e "${YELLOW}🔧 修復建議：${NC}"
    echo "1. any 型別 → 使用具體型別或 unknown"
    echo "2. 硬編碼路徑 → 使用相對路徑或 process.cwd()"
    echo "3. 同步檔案操作 → 改用 async/await"
    echo "4. TypeScript 錯誤 → 修復型別問題"
    echo "5. 未使用導入 → 清理多餘 import"
    echo ""
    echo -e "${CYAN}💡 Linus 建議：${NC}"
    echo "   \"技術債就像信用卡債務 - 越早還清越好\""
    echo ""
    echo -e "${RED}❌ 請修復問題後再次檢查${NC}"
    exit 1
fi