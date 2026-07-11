# Provider Migration Plan — 從 OpenAI 遷移到國內 API

> **狀態：已執行。** 本文檔是遷移前的審計/規劃產出，選定的目標供應商是 DeepSeek。實際切換記錄在 `docs/05_DECISIONS.md` 的 Decision 017，當前狀態見 `docs/00_PROJECT_STATE.md` 和 `docs/99_HANDOFF.json`。下文保留作為當時的分析過程與（部分仍具參考價值的）供應商調研記錄，內文中「OpenAI 是當前默認」等描述反映的是**遷移前**的狀態，不代表現狀。

本文檔基於對倉庫的實際掃描產出（排除 node_modules / .git / .next），目的是在不重設計 Provider 抽象的前提下，把模型後端從 OpenAI Responses API 平滑切換到國內 API。約束遵循 Decision 008／014：AI Provider 必須保持可替換，切換只應改動 composition root 那一行加上具體 adapter 實現，不觸碰 planning-engine / route / UI 結構。

當前狀態核對（供對照）：
- `ai-adapter/index.ts` 是唯一的 composition root，`activeProvider` 目前指向 `openaiAdapter`。
- `ai-adapter/provider.interface.ts` 定義的 `AIProvider` 接口極簡（`callModel(input) -> { rawText }`），穩定，不需要改。
- `ai-adapter/openai-adapter.ts` 是當前生效的實現：調用 `https://api.openai.com/v1/responses`（Responses API，非 Chat Completions），模型寫死 `gpt-5-mini`，讀 `OPENAI_API_KEY`，用 `undici` 自己的 `fetch` + 條件性 `ProxyAgent`（讀 `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY`），並向 `core/shared/logger` 打日誌。
- `ai-adapter/claude-adapter.ts` 是 Decision 014 明確保留的 legacy 實現（未被 index.ts 引用），調用 Anthropic Messages API，讀 `ANTHROPIC_API_KEY`（.env.local 目前未配置這個變量）。
- `.env.local` 目前只有 `OPENAI_API_KEY` 一個變量。

---

## A. 遷移清單

### A1. 核心切換點（必須改）

- **`ai-adapter/index.ts`** — composition root。最終只改一行：把 `activeProvider` 指向新的具體 adapter。這是整個遷移「生效」的唯一開關。
- **新增 `ai-adapter/<provider>-adapter.ts`**（新文件）— 新供應商的具體實現。應複用 `openai-adapter.ts` 的骨架（apiKey 讀取防呆、`logInfo`/`logError` 分層日誌、網路失敗／非 200／解析失敗三段式錯誤分類），但必須重寫：base URL、模型名常量、請求體結構、**響應解析邏輯**（見風險 B2，這是最容易踩坑的一塊）。
- **`core/shared/logger.ts`** — `Layer` 型別目前是字面量聯合 `"route" | "planning-engine" | "openai-adapter"`。新增 adapter 若沿用同一套 `logInfo("<新tag>", ...)` 模式，必須同步把新 tag 加進這個聯合型別，否則編譯期直接報類型錯誤（見風險 B1，屬於會擋住 build 的一項）。

### A2. 環境變量 / 密鑰

- **`.env.local`** — 新增 `<新供應商>_API_KEY`。是否保留 `OPENAI_API_KEY` / 是否補上 `ANTHROPIC_API_KEY` 由你決定，建議遷移過程中先不刪任何現有變量（降低單步風險，見 C4）。
- **（建議新增）`.env.example`** — 倉庫目前沒有這個文件，只有 `.gitignore` 裡對 `.env.example` 開了白名單。補一份能提醒未來（包括你自己）需要配置哪些變量，避免重複 Decision 015 記錄過的「missing key 排查」過程。

### A3. UI 文案殘留

- **`app/page.tsx`（第 45、54 行）** — Dashboard 頁面硬編碼寫著「route → planning engine → Claude adapter → Claude API」和按鈕文字「Calling Claude...」。這是 M1 做 demo 時留下的文字，**現在實際跑的已經是 OpenAI**，`docs/99_HANDOFF.json` 的 `known_limitations` 裡也自己承認了這處不一致。遷移到國內 API 時必須一併处理，否則會變成第三層不一致（文案寫 Claude、代碼跑國內模型）。建議改成不寫死供應商品牌的中性文案（如「AI provider」），避免下次換供應商又要改一輪。

### A4. 文檔 / decision log

- **`README.md`（第 19 行）** — Stack 列表寫著「Claude API」，已經跟實際情況（OpenAI）不符，遷移後要更新為新供應商名稱。
- **`docs/05_DECISIONS.md`** — Decision 014（默認供應商 = OpenAI）、Decision 016（proxy dispatcher，專門為繞開連 OpenAI 的網路問題而加）都需要一條新的 Decision（建議編號 017）記錄：遷移到了哪個供應商、為什麼、以及 Decision 016 的 proxy 邏輯是否還適用（大概率不適用，見風險 B3）。
- **`docs/00_PROJECT_STATE.md`、`docs/99_HANDOFF.json`** — 這兩份是「當前狀態快照」文檔，裡面的 `current_provider` / `model` / `AI Provider Status` / `known_limitations` 等字段目前寫的都是 OpenAI/gpt-5-mini。遷移完成後要同步更新，否則下一次交接（不管是你自己回來看，還是丟給另一個 AI 助手）會看到過期信息，重新走一遍「Anthropic 403 → 切 OpenAI」的舊排查路徑。

### A5. 代理相關

- `ai-adapter/openai-adapter.ts` 裡的 `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY` 自動偵測 + `undici.ProxyAgent` 邏輯**不建議直接複製到新 adapter**（原因見風險 B3）。這段邏輯保持原樣留在 `openai-adapter.ts` 裡即可（它會隨着 openai-adapter.ts 一起變成 legacy，不影響現有代碼）。

---

## B. 風險清單

1. **【會直接讓 build 失敗】** `core/shared/logger.ts` 的 `Layer` 聯合型別沒有新 adapter 的 tag。加新 adapter 檔案卻忘記同步這個型別，`tsc`/`next build` 會報 `Argument of type '"xxx-adapter"' is not assignable to parameter of type 'Layer'`。

2. **【響應格式不兼容，最隱蔽的坑】** `openai-adapter.ts` 目前解析的是 OpenAI **Responses API** 的形狀（`data.output[].content[].output_text`）。絕大多數國內供應商（DeepSeek、Moonshot/Kimi、智譜 GLM、通義千問、文心一言等）暴露的是 **Chat Completions 相容格式**（`data.choices[0].message.content`），結構完全不同。如果圖省事直接複製 `openai-adapter.ts` 只改 URL 和 key，`response.ok` 仍然會是 `true`（HTTP 200），但解析邏輯抓不到任何內容，`rawText` 會靜默變成空字串——不報錯，UI 上只會看到一個空框，跟 `openai-adapter.ts` 代碼裡自己注釋提醒的「空 output_text 值得警惕」是同一類问题。必須對照實際選定供應商的官方 API 文檔重寫這段解析。

3. **【代理配置可能誤傷】** Decision 016 的 proxy 邏輯是專門為了繞開「在部分網路環境下連不上 OpenAI」這個問題加的。換成國內 API 後，如果開發機上系統代理（如 Clash）仍然開著且 `HTTPS_PROXY` 環境變量還在，新 adapter 若複製了這段邏輯，會把國內 API 的請求也一起塞進代理，可能導致連不上、變慢，或者流量繞道境外代理再回來。**建議新 adapter 直接不寫這段邏輯**（如果後續發現直連不通再按需加）。

4. **【切換順序容易搞混，產生誤導性報錯】** 如果先在 `.env.local` 填好新 key、但還沒把 `ai-adapter/index.ts` 的 `activeProvider` 切過去，這時候點擊 Dashboard 測試按鈕，看到的仍然會是「OPENAI_API_KEY 缺失」或 OpenAI 相關報錯（如果順手把舊 key 刪了的話），容易誤判成新 adapter 本身有問題。務必按 C 部分的順序來，並在每步之間用終端日誌確認當前生效的是哪個 adapter。

5. **【legacy 文件會從 2 個變成 3 個】** `claude-adapter.ts` 現在就是沒人 import 的死代碼（Decision 014 明確允許保留）。遷移完成後 `openai-adapter.ts` 也會變成同樣性質的 legacy。三個具體 adapter 並存時，composition root 模式（只能通過 `ai-adapter/index.ts` 選擇 provider，其他模塊不能直接 import 具體 adapter）目前**沒有 lint 規則強制**，純靠人工紀律遵守 Decision 014，遷移時注意別在 `core/planning-engine` 或別處手滑直接 import 了某個具體 adapter。

6. **【文檔/文案已經處於不同步狀態，遷移前就存在】** `app/page.tsx`、`README.md`、`docs/00_PROJECT_STATE.md`、`docs/99_HANDOFF.json` 這四處目前已經寫著 Claude，但實際運行的是 OpenAI——這個不一致在這次遷移之前就已經存在（`99_HANDOFF.json` 的 `known_limitations` 自己也承認了）。如果這次只改代碼不改文檔，遷移完會變成三重不一致，建議這次一起清掉，不要繼續累積。

7. **【`.env.local` 裡的密鑰是明文，且已經進入本次掃描的上下文】** 為了完成這次審計，`.env.local` 的內容被讀取過，目前記錄的 `OPENAI_API_KEY` 因此出現在這次對話記錄裡。該文件本身沒有被 git 追蹤（`.gitignore` 已排除 `.env*`，只白名單了 `.env.example`），所以不存在洩漏進倉庫的風險；但如果不打算繼續使用這把 key，建議找時間去 OpenAI 後台撤銷/輪替一下，這跟本次遷移無關，但既然發現了就一併提醒。

8. **【沒有自動化測試/CI 兜底】** 倉庫裡沒有任何測試文件（無 `__tests__`，無 jest/vitest 配置），"驗證"目前只能靠手動跑 `npm run dev` 並點擊 Dashboard 上的按鈕，配合終端的分層日誌人工判讀。這意味著每一步修改後都需要手動驗證，沒有自動回歸保護；建議至少手動走一次「成功調用」+「故意去掉 API Key 觸發失敗分支」兩條路徑，確認錯誤處理沒有跟著壞掉。

---

## C. 建議修改順序（每一步都能獨立驗證）

1. **確定目標供應商細節**：具體服務商、base URL、模型名、鑑權方式（Bearer token 還是自定義 header）、是 Chat Completions 相容還是自有格式。這一步是外部依賴，決定了 B2 要怎麼寫，先確認清楚能避免返工。

2. **改 `core/shared/logger.ts`**：把 `Layer` 型別加入新 adapter 的 tag（或放寬成 `string`）。跑一次 `npx tsc --noEmit`（或 `npm run build`）確認型別沒破——這一步不涉及業務邏輯，可獨立提交、獨立驗證。

3. **新增 `ai-adapter/<provider>-adapter.ts`**：照 `openai-adapter.ts` 的骨架寫（apiKey 防呆、`logInfo`/`logError`、三段式錯誤分類），换成新供應商的 URL / 模型名 / 請求體 / 響應解析（重點解決 B2）。**先不要動 `index.ts`**，此時新文件是死代碼、不影響現有運行，可以先寫個一次性腳本直接 `import` 這個 adapter 單獨調用一次做驗證。

4. **`.env.local` 加新 key**：新增新供應商的 API Key 變量，`OPENAI_API_KEY`/`ANTHROPIC_API_KEY` 先保留不刪（降低這一步的風險，收尾階段再清理）。

5. **切換 `ai-adapter/index.ts`**：把 `activeProvider` 指向新 adapter（一行改動，唯一的生效開關）。改完立刻用 Dashboard 的「Test planning call」按鈕跑一次端到端請求，同時盯著終端的 `[route]`/`[planning-engine]`/`[新adapter]` 分層日誌，重點確認 `rawText` 不是空字串（對應 B2）。

6. **按需處理代理（B3）**：先假設新 adapter 不帶 proxy 邏輯，驗證直連能否打通；如果環境確實需要代理才能連上，再參考 `openai-adapter.ts` 裡 undici `ProxyAgent` 的寫法補一份（記得用 `undici` 自己的 `fetch`，不要混用 Node 全局 `fetch`，否則重踩 Decision 016 記錄過的 `UND_ERR_INVALID_ARG` 坑）。

7. **清理 UI 文案**：`app/page.tsx` 第 45、54 行改成不寫死供應商品牌的中性文案。

8. **同步文檔**：`README.md` 的 Stack 列表、`docs/05_DECISIONS.md` 新增 Decision 017（記錄遷移原因和 proxy 邏輯的取捨）、`docs/00_PROJECT_STATE.md` 和 `docs/99_HANDOFF.json` 的供應商/模型/`known_limitations` 字段同步更新。

9. **最終殘留檢查**：在倉庫根目錄（排除 `node_modules`/`.git`/`.next`）分別搜索 `openai|OpenAI|OPENAI|responses api|gpt-5` 和 `claude|Claude|CLAUDE|anthropic|Anthropic`，確認除了「刻意保留的 legacy adapter 文件本身」和「decision log 裡的歷史記錄」之外，沒有其他地方還在暗示「當前默認供應商是 OpenAI/Claude」。可用命令：
   ```
   grep -rniE "openai|responses api|gpt-5" --include="*.ts" --include="*.tsx" --include="*.md" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next .
   ```

10. **（可選，收尾階段再做）** 新供應商穩定運行一段時間後，再回頭決定要不要刪掉 `.env.local` 裡沒在用的舊 key、要不要把 `claude-adapter.ts`/`openai-adapter.ts` 從「保留」降級為「刪除」。這屬於架構清理範疇，按 Decision 014 的精神，這類決定應該顯式討論後再做，不要在這次遷移裡順手做掉。

---

## 待你確認後才會動代碼的事項

以上只是審計 + 方案（A/B/C），本次會話**未修改任何業務代碼**，只新增了本文檔。按 CLAUDE.md 的工作方式，下一步需要你確認：

- 具體切到哪個國內供應商，以及它的 base URL / 模型名 / 鑑權方式 / 是否 Chat Completions 相容。
- `.env.local` 裡舊的 `OPENAI_API_KEY` 是否需要現在就處理（建議遷移穩定後再清理）。
