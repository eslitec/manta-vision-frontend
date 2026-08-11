#!/usr/bin/env bash
# 在「Windows 的 Git Bash」、於專案根目錄執行： bash finish-git.sh
# 目的：接續沙盒已完成的 commit 1（chore(config)），把 commit 2~11、清理舊分支、gc、push 一次做完。
set -e
cd "$(dirname "$0")"

echo "==> 0) 清掉殘留的 git lock（若還在）"
rm -f .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock 2>/dev/null || true

echo "==> 1) 取消暫存，回到已完成的 commit 1，準備做乾淨的分組 commit"
git reset -q

echo "==> 2) 分組 Conventional Commits（commit 2~11）"
git add src/assets/scss/_variables.scss src/components/PrimaryButton.vue src/components/GhostButton.vue src/components/OutlineButton.vue src/components/DialogButton.vue src/components/ChipButton.vue src/components/TopupButton.vue
git commit -m "fix(components): 按鈕元件顏色/圓角/內距/陰影對齊 Figma 元件庫"

git add src/components/BrandToggle.vue src/components/TaskCenterPanel.vue src/components/GenerationToast.vue src/components/FeedBadge.vue src/components/ConfirmGenerateDialog.vue src/components/ImagePickerDialog.vue
git commit -m "feat(components): 新增共用 BrandToggle、任務中心面板與生成通知元件"

git add src/layouts/DefaultLayout.vue src/views/HomeView.vue
git commit -m "feat(mv-00): 首頁工作台與側邊欄外殼對齊設計稿"

git add src/views/LibraryView.vue src/types/asset.ts src/api/mock.ts
git commit -m "feat(mv-01): 圖庫管理中心與刪除對話框加入被引用素材警告"

git add src/views/GenerateImageView.vue
git commit -m "feat(mv-02): 圖生圖生成模型改為分級卡片並加入品牌設定開關"

git add src/views/MarketingPostView.vue
git commit -m "feat(mv-03): 行銷 PO 文結果區重構、探索靈感入口與下一步提示"

git add src/views/GenerateVideoView.vue src/stores/generationTasks.ts
git commit -m "feat(mv-04): 圖生影新增生成中進度區塊與可平滑遞增的任務進度"

git add src/views/TryOnView.vue
git commit -m "feat(mv-05): AI 試穿補上傳模特照上傳與結果動作"

git add src/App.vue src/main.ts src/router/index.ts src/stores/brand.ts src/stores/consent.ts src/stores/feed.ts src/stores/models.ts src/api/http.ts src/api/index.ts src/api/mock.spec.ts src/types/api.ts src/utils/colors.ts src/utils/error.ts src/env.d.ts src/assets/scss/_mixins.scss src/assets/scss/main.scss src/views/UsageView.vue src/views/BrandSettingsView.vue src/composables/useAssets.ts src/composables/useAssets.spec.ts src/stores/stores.spec.ts src/utils/colors.spec.ts
git commit -m "feat(app): 應用骨架（路由、store、API、型別、樣式與數據/品牌畫面）"

git add openspec/changes
git commit -m "docs(openspec): 補齊 sync-mv change 文件並歸檔 centralize-button-components"

echo "==> 3) 刪掉殘留舊分支（含 node_modules 歷史）並壓縮 .git"
git branch -D feature/my-work chore/project-setup reinit-main 2>/dev/null || true
git gc --prune=now

echo "==> 4) 推分支"
git push origin feature/mv-00-05-consolidated

echo
echo "完成！接著到 GitHub 開 PR： feature/mv-00-05-consolidated -> main"
echo "  https://github.com/eslitec/manta-vision-frontend/compare/main...feature/mv-00-05-consolidated"
echo "（跑完可刪除本檔 finish-git.sh）"
