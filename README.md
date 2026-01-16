# Radar Fraud UI

Vue 3 整合 Radar Web SDK 的 Fraud 檢測元件庫

## 專案簡介

### What

這是一個基於 Vue 3 Composition API 開發的 Radar Fraud 檢測解決方案，提供：

- **可重用的 Vue 元件** (`RadarFraudChecker`)：即插即用的 Fraud 檢測 UI
- **Composable** (`useRadarFraud`)：封裝 Radar SDK 邏輯的 Vue 3 composable
- **Pinia Store**：全域狀態管理
- **Vue Plugin**：快速整合到任何 Vue 3 專案

### Why

Radar 提供強大的 Fraud 檢測和地理位置驗證功能，但直接整合 SDK 需要處理：

- SDK 初始化邏輯
- 錯誤處理（定位權限、網路錯誤等）
- 狀態管理
- UI 呈現

本專案將這些複雜性封裝成易於使用的 Vue 元件，讓你可以快速整合 Radar Fraud 檢測功能。

## 安裝方式

### 方式一：複製檔案

將以下檔案複製到你的專案：

```
src/
├── stores/
│   └── radarFraud.js        # Pinia store
├── composables/
│   └── useRadarFraud.js     # Composable
├── components/
│   └── RadarFraudChecker.vue # UI 元件
├── plugins/
│   └── radarFraud.js        # Vue Plugin
└── index.js                 # 統一匯出
```

### 方式二：安裝依賴

確保你的專案已安裝以下依賴：

```bash
npm install pinia radar-sdk-js
```

## 使用方式

### Quick Start

#### 1. 設定 main.js

```javascript
import { createApp } from "vue";
import { createPinia } from "pinia";
import { RadarFraudPlugin } from "@/plugins/radarFraud";
import App from "./App.vue";

const app = createApp(App);

// 安裝 Pinia（必須先於 RadarFraudPlugin）
app.use(createPinia());

// 安裝 Radar Fraud Plugin
app.use(RadarFraudPlugin);

app.mount("#app");
```

#### 2. 使用 RadarFraudChecker 元件

```vue
<template>
  <RadarFraudChecker
    :skip-verify-app="true"
    :show-details="true"
    @verification-complete="handleResult"
    @error="handleError"
  />
</template>

<script setup>
import RadarFraudChecker from "@/components/RadarFraudChecker.vue";

function handleResult(result) {
  if (result.passed) {
    console.log("檢測通過！", result.token);
    // 將 token 傳送到後端驗證
  } else {
    console.log("檢測未通過", result.failureReasons);
  }
}

function handleError(error) {
  console.error("發生錯誤", error.message);
}
</script>
```

#### 3. 使用 Composable（進階用法）

如果你需要更細緻的控制，可以直接使用 composable：

```vue
<script setup>
import { useRadarFraud } from "@/composables/useRadarFraud";

const {
  initializeRadar,
  verifyLocation,
  status,
  isPassed,
  isDenied,
  hasError,
  errorMessage,
  failureReasons,
} = useRadarFraud();

async function startCheck() {
  // 初始化 SDK
  const initialized = initializeRadar("prj_test_pk_xxxxxxxx");
  if (!initialized) return;

  // 執行檢測
  const result = await verifyLocation({ skipVerifyApp: true });

  if (result.passed) {
    // 檢測通過
  } else if (result.success && !result.passed) {
    // 檢測未通過（有失敗原因）
  } else {
    // 發生錯誤
  }
}
</script>
```

## PublishableKey 測試說明

### 取得測試 Key

1. 前往 [Radar Dashboard](https://radar.com/dashboard)
2. 註冊或登入帳號
3. 在 Settings > API Keys 取得 Publishable Key
4. 測試環境 Key 格式：`prj_test_pk_xxxxxxxxxxxxxxxx`
5. 正式環境 Key 格式：`prj_live_pk_xxxxxxxxxxxxxxxx`

### 注意事項

- 測試 Key 只能在 localhost 或已授權的網域使用
- 正式環境請務必使用正式環境的 Key
- **永遠不要在前端程式碼中硬編碼正式環境的 Key**
- **Fraud 功能需要 Enterprise 方案**：如果你的帳戶沒有啟用 Fraud 功能，會收到 `HMAC key data must not be empty` 錯誤

### 啟用 Fraud 功能

1. 登入 [Radar Dashboard](https://radar.com/dashboard)
2. 前往 Settings 頁面
3. 啟用 Fraud 功能（需要 Enterprise 方案）
4. 如果是免費或基本方案，請聯繫 Radar 銷售團隊升級

## Radar Fraud 判斷邏輯說明

### 檢測通過條件

根據 [Radar 官方文件](https://docs.radar.com/geofencing/fraud)，檢測通過需要同時滿足：

```javascript
user.fraud.passed === true && // Fraud 檢測通過
  user.country.passed === true && // 國家檢測通過
  user.state.passed === true; // 州/省檢測通過
```

### Fraud 檢測項目

| 項目          | 說明                                         |
| ------------- | -------------------------------------------- |
| `mocked`      | 位置是否被模擬（如使用模擬器或位置偽造 App） |
| `jumped`      | 使用者是否移動過快（位置跳躍異常）           |
| `compromised` | 裝置是否已被破解（root/jailbreak）           |
| `inaccurate`  | 位置精確度是否過低                           |
| `sharing`     | 是否使用螢幕分享或遠端桌面                   |
| `proxy`       | IP 是否為已知的 VPN 或代理伺服器             |

### 地理位置檢測

- **country.passed**：使用者所在國家是否在允許清單中
- **state.passed**：使用者所在州/省是否在允許清單中
- **inBufferZone**：是否在邊界緩衝區內
- **inExclusionZone**：是否在排除區域內

## RadarFraudChecker Props

| Prop            | 類型    | 預設值  | 說明                      |
| --------------- | ------- | ------- | ------------------------- |
| `defaultKey`    | String  | `''`    | 預設的 publishableKey     |
| `skipVerifyApp` | Boolean | `true`  | 是否跳過 Radar Verify App |
| `debug`         | Boolean | `false` | 是否開啟 debug 模式       |
| `hideKeyInput`  | Boolean | `false` | 是否隱藏 Key 輸入框       |
| `showDetails`   | Boolean | `true`  | 是否顯示詳細結果          |

## RadarFraudChecker Events

| Event                   | Payload                                                   | 說明     |
| ----------------------- | --------------------------------------------------------- | -------- |
| `verification-complete` | `{ success, passed, token, user, failureReasons, error }` | 檢測完成 |
| `status-change`         | `status: string`                                          | 狀態變更 |
| `error`                 | `{ message, type }`                                       | 發生錯誤 |

## 狀態說明

| 狀態      | 說明                   |
| --------- | ---------------------- |
| `idle`    | 初始狀態，尚未開始檢測 |
| `loading` | 檢測進行中             |
| `passed`  | 所有檢測通過           |
| `denied`  | 檢測未通過             |
| `error`   | 發生錯誤               |

## 常見錯誤與除錯說明

### HMAC key data must not be empty

**原因**：Radar Fraud 功能未在帳戶中啟用

**解決方式**：

1. Fraud 功能需要 Enterprise 方案
2. 登入 [Radar Dashboard](https://radar.com/dashboard)
3. 前往 Settings 頁面啟用 Fraud 功能
4. 如果是免費或基本方案，請聯繫 Radar 銷售團隊升級

### ERROR_PERMISSIONS

**原因**：使用者拒絕了定位權限

**解決方式**：

1. 提示使用者允許定位權限
2. 在瀏覽器設定中重新啟用定位權限
3. 確保網站使用 HTTPS（Chrome 要求安全連線才能使用定位）

### ERROR_LOCATION

**原因**：無法取得定位資訊

**解決方式**：

1. 確認裝置的定位服務已開啟
2. 檢查是否在室內（GPS 訊號可能較弱）
3. 嘗試重新整理頁面

### ERROR_VERIFY_APP

**原因**：Radar Verify App 未運行

**解決方式**：

1. 設定 `skipVerifyApp: true` 使用純 JavaScript 方案
2. 或安裝 Radar Verify App

### ERROR_UNAUTHORIZED

**原因**：publishableKey 無效

**解決方式**：

1. 確認 Key 格式正確（以 `prj_` 開頭）
2. 確認使用正確環境的 Key（test vs live）
3. 確認網域已在 Radar Dashboard 中授權

### ERROR_NETWORK

**原因**：網路連線問題

**解決方式**：

1. 檢查網路連線
2. 確認防火牆未阻擋 Radar API
3. 稍後重試

## 官方文件連結

- [Radar Fraud 文件](https://docs.radar.com/geofencing/fraud)
- [Radar SDK JS GitHub](https://github.com/radarlabs/radar-sdk-js)
- [Radar Dashboard](https://radar.com/dashboard)
- [Radar API Reference](https://radar.com/documentation/api)

## 檔案結構

```
src/
├── stores/
│   └── radarFraud.js        # Pinia store - 管理檢測狀態
├── composables/
│   └── useRadarFraud.js     # Composable - 封裝 Radar SDK 邏輯
├── components/
│   └── RadarFraudChecker.vue # UI 元件 - 可重用的檢測介面
├── plugins/
│   └── radarFraud.js        # Vue Plugin - 快速整合
├── index.js                 # 統一匯出入口
├── main.js                  # 應用程式進入點
└── App.vue                  # 示範應用
```
