<script setup>
import { ref } from "vue";
import RadarFraudChecker from "./components/RadarFraudChecker.vue";

const lastResult = ref(null);
const copySuccess = ref(false);

function handleVerificationComplete(result) {
  console.log("[App] 檢測完成:", result);
  lastResult.value = result;
}

function handleStatusChange(status) {
  console.log("[App] 狀態變更:", status);
}

function handleError(error) {
  console.error("[App] 發生錯誤:", error);
}

async function copyJsonToClipboard() {
  try {
    const jsonString = JSON.stringify(lastResult.value, null, 2);
    await navigator.clipboard.writeText(jsonString);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {
    console.error("複製失敗:", err);
  }
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Radar Fraud 檢測示範</h1>
      <p>使用 Radar Web SDK 進行 Fraud 與地理位置驗證</p>
    </header>

    <main class="app-main">
      <!-- Radar Fraud Checker 元件 -->
      <RadarFraudChecker
        :skip-verify-app="true"
        :show-details="true"
        :debug="false"
        @verification-complete="handleVerificationComplete"
        @status-change="handleStatusChange"
        @error="handleError"
      />

      <!-- 開發者資訊區（顯示原始回傳結果） -->
      <section v-if="lastResult" class="dev-section">
        <div class="dev-header">
          <div>
            <h2>開發者資訊</h2>
            <p class="dev-hint">以下為最後一次檢測的原始回傳結果（開發除錯用）</p>
          </div>
          <button class="copy-btn" @click="copyJsonToClipboard">
            {{ copySuccess ? '已複製' : '複製 JSON' }}
          </button>
        </div>
        <pre class="dev-output">{{ JSON.stringify(lastResult, null, 2) }}</pre>
      </section>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
}

.app-header {
  text-align: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.app-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.app-header p {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  padding: 32px 16px;
  background-color: #f9fafb;
}

.dev-section {
  max-width: calc(100vw - 32px);
  width: 600px;
  margin: 32px auto 0;
  padding: 24px;
  background-color: #1e1e1e;
  border-radius: 12px;
  box-sizing: border-box;
}

.dev-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.dev-section h2 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #e5e5e5;
}

.dev-hint {
  margin: 0;
  font-size: 13px;
  color: #888;
}

.copy-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.copy-btn:hover {
  background-color: #2563eb;
}

.copy-btn:active {
  background-color: #1d4ed8;
}

.dev-output {
  margin: 0;
  padding: 16px;
  background-color: #2d2d2d;
  border-radius: 8px;
  color: #9cdcfe;
  font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre;
  text-align: left;
  box-sizing: border-box;
  max-width: 100%;
}

@media (max-width: 480px) {
  .app-header h1 {
    font-size: 22px;
  }

  .app-header p {
    font-size: 14px;
  }
}
</style>
