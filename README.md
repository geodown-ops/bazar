# 🌴 小琉球芭扎民宿 (bazar花園) 官方網站與訂房管理系統

這是一個為小琉球特色貨櫃民宿「芭扎民宿 (bazar花園)」量身打造的官方網站系統。本系統採用全響應式前端介面，整合了**即時套裝行程房價估價器**、**TapPay 信用卡金流 (Direct Pay)** 以及**管理員後台控制面板**，並使用輕量化且易於移植的 Node.js 後端與本地 JSON 資料庫。

---

## 🛠️ 技術架構 (Technical Architecture)

本專案秉持高效能、零複雜依賴、免編譯的設計原則建構：

*   **前端技術 (Frontend)**:
    *   **Core**: HTML5 語意化結構。
    *   **Styling**: 原生 CSS3 (Vanilla CSS)，採用 CSS 變數控制主題色調，運用 Grid 與 Flexbox 排版，支援 Glassmorphism 毛玻璃效果、流暢的懸停動畫與自適應行動裝置優先 (Mobile-First) 設計。
    *   **Logic**: 原生 JavaScript (ES6+)，處理無刷新 AJAX 異步請求、即時房價/套裝金額試算、Hero Slider 輪播、及燈箱 Lightbox 圖片放大。
*   **後端技術 (Backend)**:
    *   **Engine**: Node.js 運行環境。
    *   **Framework**: Express.js，實作 RESTful 預約、TapPay Pay by Prime 金流與後台管理 API。
*   **金流 (Payment Gateway)**:
    *   **TapPay Direct Pay**：前端以 TapPay SDK 安全欄位 (iframe) 收卡號並換取 prime，卡號不經過民宿伺服器；後端以 Pay by Prime API 完成實際扣款。
*   **資料庫 (Database)**:
    *   **Storage**: 本地 JSON 檔案型資料庫 (`db.json`)，避免了 SQLite3 等二進位資料庫在 Windows 環境下安裝編譯失敗的問題，具備極佳的移植性與備份便利性。

### ⚙️ 開發與運行環境版本 (Versions of Tools)

本專案在以下技術環境下完成開發與完整測試：

| 工具/套件 (Tool/Package) | 開發與測試版本 (Version) | 備註 (Remarks) |
| :--- | :--- | :--- |
| **Node.js** | `v24.17.0` | 建議使用 `v18.0.0` 或以上之 LTS 版本 |
| **npm** | `v11.13.0` | 伴隨 Node.js 安裝之包管理器 |
| **Express.js** | `v4.19.2` | 後端核心 Web 框架 |
| **GitHub CLI (gh)** | `v2.95.0` | 用於快速建立與部署 Github 遠端儲存庫 |

---

## 🗄️ 資料庫 Schema (Database Schema)

### 1. 訂單欄位 (`bookings`)
儲存在 `db.json` 中的 `bookings` 陣列，欄位結構如下：

| 欄位名稱 (Field) | 資料類型 (Type) | 說明 (Description) | 範例 (Example) |
| :--- | :--- | :--- | :--- |
| `id` | `String` | **主鍵**，唯一訂單編號。由 `BZ` 加上時間戳記與隨機數。 | `"BZ587204231"` |
| `name` | `String` | 聯絡人姓名。 | `"施先生"` |
| `phone` | `String` | 聯絡電話。 | `"0975080788"` |
| `email` | `String` | 電子信箱 (選填)。 | `"guest@example.com"` |
| `roomType` | `String` | 預訂房型代碼 (`double` \| `quad` \| `pool_quad` \| `charter`)。 | `"double"` |
| `checkIn` | `String` | 入住日期 (YYYY-MM-DD)。 | `"2026-07-01"` |
| `checkOut` | `String` | 退房日期 (YYYY-MM-DD)。 | `"2026-07-02"` |
| `nights` | `Number` | 住宿天數。 | `1` |
| `adults` | `Number` | 入住大人人數。 | `2` |
| `kids` | `Number` | 入住孩童人數 (3-12歲)。 | `0` |
| `isSummer` | `Boolean` | 是否包含暑假 (7-8月) 計費。 | `false` |
| `isHolidayPackage` | `Boolean` | 是否為連續假期計費。 | `false` |
| `packages` | `Object` | 旅客勾選的套裝與數量對象。 | *見下方 JSON 範例* |
| `packageDetails` | `Array` | 後端計算並格式化後的套裝項目明細陣列。 | *見下方 JSON 範例* |
| `roomPrice` | `Number` | 客房住宿部分小計。 | `2000` |
| `packagePrice` | `Number` | 套裝加購部分小計。 | `1260` |
| `totalPrice` | `Number` | 訂單總金額 (`roomPrice` + `packagePrice`)。 | `3260` |
| `paymentStatus` | `String` | 訂單狀態 (`Pending` 待付款 \| `Paid` 已付款 \| `Completed` 已完成 \| `Cancelled` 已取消)。 | `"Paid"` |
| `note` | `String` | 旅客備註需求。 | `"無"` |
| `createdAt` | `String` | 訂單建立時間 (ISO 字串)。 | `"2026-06-25T11:38:36.789Z"` |

#### `packages` (加購套裝) 欄位範例：
```json
{
  "ferry": true,
  "ferryAdultCount": "2",
  "ferryKidCount": "0",
  "scooter": true,
  "scooterCount": "1",
  "scooterDays": "1"
}
```

#### `packageDetails` (格式化明細) 欄位範例：
```json
[
  {
    "name": "來回船票",
    "cost": 860,
    "desc": "大人 2 人, 小孩 0 人"
  },
  {
    "name": "機車出租",
    "cost": 400,
    "desc": "1 台, 共 1 天"
  }
]
```

### 2. 後台設定 (`settings`)
儲存在 `db.json` 中的 `settings` 對象：

| 欄位名稱 (Field) | 資料類型 (Type) | 說明 (Description) | 預設值 (Default) |
| :--- | :--- | :--- | :--- |
| `adminPassword` | `String` | 後台管理員登入密碼。 | `"bazar888"` |
| `paymentMethods` | `String` | 付款頁開放的付款方式 (`card` 僅信用卡 \| `transfer` 僅匯款 \| `both` 同時開放)。 | `"card"` |

---

## 🖥️ 頁面架構與功能說明 (Page Architecture)

專案前台所有靜態資源存放在 `public/` 目錄中，路由由 `/bzzar` 前綴進行託管：

### 1. 前台官網首頁 (`/bzzar/index.html`) - [訪問連結](http://localhost:3000/bzzar/)
*   **Hero 首頁視覺**：採用三張精美實景圖自動漸層淡入淡出輪播，搭配高質感標題文字與快速訂房導向按鈕。
*   **關於芭扎 (About)**：介紹民宿特色（環保貨櫃屋設計、通風隔熱、泰式度假風格庭園與便利生活機能）。
*   **特色房型 (Rooms)**：
    *   **翠竹雙人房**（平日 2000 | 假日/暑假 2800 | 連續假期 3200）。
    *   **鄉村/自然/樸石四人房**（平日 3000 | 假日/暑假 3800 | 連續假期 4800，L型隱私格局設計）。
    *   **弦木/澄花四人房**（平日 4000 | 假日/暑假 4800 | 連續假期 5600，配備私人專屬露天戲水池）。
    *   **10人小包棟**（平日 8000 | 假日 10,000 | 連續假期 12,000）。
*   **房價與套裝行程試算表單 (Booking Calculator)**：
    *   提供大人/小孩人數、入住日期、房型選擇與連續假期/暑假切換。
    *   **行程加購清單**：來回船票（大人 $430/小孩 $200）、機車出租（$400/台/24hr）、潮間帶（$100）、夜遊（$100）、浮潛（$450）、體驗潛水（$2550）、SUP（$1250）、獨木舟（一般 $650/透明 $850）、雙燒烤 BBQ（大人 $450/小孩 $250）、梅花鹿門票（大人 $220/小孩 $50）、海洋館門票（大人 $200/小孩 $160）、玻璃船（大人 $230/小孩 $150）。
    *   **即時明細卡**：在前端無刷新即時顯示房價小計、各項套裝明細、套裝小計與總價。
*   **生態寫真畫廊 (Gallery)**：展示精緻房型、私人游泳池、質感衛浴與小琉球當地生態，支援點擊燈箱放大功能。
*   **聯絡我們 (Contact)**：顯示民宿主人施勇銘聯絡電話 (0975-080-788)、地址與 Google 地圖嵌入。

### 2. 支付頁 (`/bzzar/payment.html`) — TapPay 信用卡 / 銀行匯款
*   旅客送出預約表單後自動導向此頁面，並攜帶訂單 ID 參數（例如 `?id=BZxxxxxx`）。
*   載入並呈現本筆訂單的所有住房、套裝、總金額與付款狀態。
*   **付款方式依後台設定顯示**（後台「系統設定 → 付款方式設定」）：僅信用卡、僅銀行匯款（顯示 CMS「住宿守則與匯款」中的匯款帳號資訊，由管理員入帳後手動改為已付款），或同時開放（旅客可自行切換兩種方式）。僅匯款模式下後端會直接拒絕信用卡扣款請求。
*   **安全收卡**：頁面載入 TapPay SDK 後，卡號/有效期/CVV 由 TapPay 安全欄位 (iframe) 直接處理，**卡號不經過民宿伺服器**。
*   **扣款流程**：前端 `TPDirect.card.getPrime()` 取得一次性交易憑證 prime → 送至後端 `POST /api/payment/pay` → 後端呼叫 TapPay Pay by Prime API 實際扣款，成功後將訂單狀態更新為「已付款」並寫入交易紀錄（`rec_trade_id`、銀行交易編號、卡號末四碼）。
*   後端 `GET /api/payment/config` 提供前端初始化 SDK 所需的 App ID / App Key（此為公開的 client key）與環境別。
*   **取消並返回修改**：「取消此訂單，返回修改訂房資料」按鈕會將此筆待付款訂單標記為已取消（`PUT /api/bookings/:id/cancel`），並以 `?edit=訂單編號` 導回首頁訂房表單，**自動預填全部原訂單資料**（含加購套裝與數量）供旅客修改後重新送出。
*   **付款成功通知信**：扣款成功後，若旅客有填寫 Email，系統會自動寄出含訂單明細、金額與交易編號的確認信（SMTP 設定見部署說明；未設定時自動略過）。

### 2-1. 查詢訂房 (`/bzzar/#lookup`)
*   前台導覽列新增「查詢訂房」，旅客輸入訂房時填寫的**聯絡電話**（可加填訂單編號縮小範圍）即可查詢自己的訂單（`POST /api/bookings/lookup`）。
*   查詢結果以卡片呈現房型、日期、人數、總金額與付款狀態；**待付款**的訂單提供「前往付款」按鈕直達信用卡付款頁。

### 3. 管理員後台控制面板 (`/bzzar/admin.html`) - [訪問連結](http://localhost:3000/bzzar/admin.html)
*   **安全登入彈窗**：開啟時自動彈出密碼輸入框（預設密碼為 `bazar888`），驗證成功後將 token 保存於瀏覽器 `localStorage` 中。
*   **營運統計卡**：即時統計目前資料庫中已付總營收、預估總金額、已付款訂單數、總訂單數以及待付款訂單。
*   **訂單明細管理**：
    *   支援關鍵字搜尋（聯絡人/電話/訂單編號）與狀態篩選。
    *   可以下拉選單直接變更訂單狀態（待付款、已付款、已完成、已取消），系統以 AJAX 即時寫入資料庫。
    *   支援「查看明細」彈窗以及「刪除訂單」功能。
*   **數據分析統計圖表**：以原生 CSS/SVG 繪製動態長條圖，呈現「房型預訂熱門次數」與「加購套裝行程熱銷榜」。
*   **系統設定**：
    *   **付款方式設定**：切換付款頁開放「僅信用卡」「僅銀行匯款」或「同時開放」，儲存後付款頁立即生效。
    *   **密碼設定管理**：供民宿主人在此處修改後台的管理密碼。
*   後台功能選單以橫向頁籤列呈現於統計卡下方、內容區上方。

---

## 🚀 專案部署與運行說明

### 1. 安裝環境
請確保本機已安裝 Node.js (建議版本 v18+)。

### 2. 安裝相依套件
在專案根目錄下，開啟終端機執行以下指令下載 Express 服務：
```powershell
npm.cmd install
```

### 3. 設定 TapPay 金流金鑰
後端讀取金鑰的優先順序為：**`tappay.local.json`（已加入 `.gitignore`，不會進版控）→ 環境變數 → TapPay 公用 sandbox 測試金鑰**。

在專案根目錄建立 `tappay.local.json`：
```json
{
  "env": "sandbox",
  "appId": 12345,
  "appKey": "app_xxxxxxxx",
  "partnerKey": "partner_xxxxxxxx",
  "merchantId": "xxxxx_CTBC"
}
```
對應的環境變數為 `TAPPAY_ENV`、`TAPPAY_APP_ID`、`TAPPAY_APP_KEY`、`TAPPAY_PARTNER_KEY`、`TAPPAY_MERCHANT_ID`。

*   **sandbox 測試**：使用 TapPay Portal 測試區的金鑰，僅接受測試卡（如 `4242 4242 4242 4242`），不會實際請款。
*   **正式上線 (production)**：需待 TapPay 帳號審核、與收單銀行簽約及商店審核通過後，於 TapPay Portal **正式區**另行取得 Partner Key、App ID / App Key 與 Merchant ID（與 sandbox 的金鑰不通用），將上述四個值換成正式版並把 `env` 改為 `"production"`，後端即自動改連 `prod.tappaysdk.com`，無需改動程式碼。

### 3-1. 設定付款確認信 SMTP（選用）
付款成功後要自動寄確認信給旅客，需在專案根目錄建立 `email.local.json`（已加入 `.gitignore`）：
```json
{
  "host": "smtp.gmail.com",
  "port": 465,
  "secure": true,
  "user": "your@gmail.com",
  "pass": "應用程式密碼",
  "from": "\"bazar花園\" <your@gmail.com>"
}
```
對應環境變數：`SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE`、`SMTP_USER`、`SMTP_PASS`、`MAIL_FROM`。未設定時系統會略過寄信並在伺服器 log 記錄，不影響付款流程。

### 4. 啟動 Web 服務
執行以下指令啟動伺服器：
```powershell
node server.js
```
伺服器成功啟動後，將會在終端機輸出：
`Bazar Garden B&B server is running on http://localhost:3000`

### 5. 本地訪問入口
*   **前台官網與估價預約**：[http://localhost:3000/bzzar/](http://localhost:3000/bzzar/)
*   **管理員後台**：[http://localhost:3000/bzzar/admin.html](http://localhost:3000/bzzar/admin.html) *(預設密碼為 `bazar888`)*

---

## 📄 授權條款 (License)
本專案採用 [MIT License](LICENSE) 進行授權。
