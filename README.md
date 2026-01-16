# Radar Fraud UI

Vue 3 整合 Radar Web SDK 的 Fraud 檢測元件庫。

## 安裝

```bash
npm install pinia radar-sdk-js
```

將 `src/` 目錄下的檔案複製到你的專案。

## 使用方式

### 1. 設定 main.js

```javascript
import { createApp } from "vue";
import { createPinia } from "pinia";
import { RadarFraudPlugin } from "@/plugins/radarFraud";
import App from "./App.vue";

const app = createApp(App);
app.use(createPinia());
app.use(RadarFraudPlugin);
app.mount("#app");
```

### 2. 使用元件

```vue
<template>
  <RadarFraudChecker
    :skip-verify-app="true"
    @verification-complete="handleResult"
  />
</template>

<script setup>
import RadarFraudChecker from "@/components/RadarFraudChecker.vue";

function handleResult(result) {
  if (result.passed) {
    // 檢測通過，將 token 傳送到後端驗證
  }
}
</script>
```

### 3. 使用 Composable

```vue
<script setup>
import { useRadarFraud } from "@/composables/useRadarFraud";

const { initializeRadar, verifyLocation, isPassed } = useRadarFraud();

async function startCheck() {
  initializeRadar("prj_test_pk_xxx");
  const result = await verifyLocation({ skipVerifyApp: true });
}
</script>
```

## Props

| Prop            | 類型    | 預設值  | 說明                      |
| --------------- | ------- | ------- | ------------------------- |
| `defaultKey`    | String  | `''`    | 預設的 publishableKey     |
| `skipVerifyApp` | Boolean | `true`  | 是否跳過 Radar Verify App |
| `debug`         | Boolean | `false` | 是否開啟 debug 模式       |
| `hideKeyInput`  | Boolean | `false` | 是否隱藏 Key 輸入框       |
| `showDetails`   | Boolean | `true`  | 是否顯示詳細結果          |

## Events

| Event                   | Payload                                                   |
| ----------------------- | --------------------------------------------------------- |
| `verification-complete` | `{ success, passed, token, user, failureReasons, error }` |
| `status-change`         | `status: string`                                          |
| `error`                 | `{ message, type }`                                       |

## 檢測通過條件

```javascript
user.fraud.passed === true &&
user.country.passed === true &&
user.state.passed === true
```

## 注意事項

- Fraud 功能需要 Radar Enterprise 方案
- 測試 Key 格式：`prj_test_pk_xxx`
- 正式 Key 格式：`prj_live_pk_xxx`

## 相關連結

- [Radar Fraud 文件](https://docs.radar.com/geofencing/fraud)
- [Radar SDK JS](https://github.com/radarlabs/radar-sdk-js)
