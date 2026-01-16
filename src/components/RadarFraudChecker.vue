<script setup>
import { ref, watch, computed } from "vue";
import {
  useRadarFraud,
  VERIFICATION_STATUS,
  ERROR_TYPES,
} from "@/composables/useRadarFraud";

const props = defineProps({
  defaultKey: {
    type: String,
    default: "",
  },
  skipVerifyApp: {
    type: Boolean,
    default: true,
  },
  debug: {
    type: Boolean,
    default: false,
  },
  hideKeyInput: {
    type: Boolean,
    default: false,
  },
  showDetails: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["verification-complete", "status-change", "error"]);

const {
  initializeRadar,
  verifyLocation,
  resetVerification,
  status,
  isInitialized,
  isLoading,
  isPassed,
  isDenied,
  hasError,
  isIdle,
  errorMessage,
  errorType,
  failureReasons,
  fraudDetails,
  countryDetails,
  stateDetails,
  statusText,
} = useRadarFraud();

const publishableKey = ref(props.defaultKey);
const localError = ref("");

const canStartVerification = computed(() => {
  return publishableKey.value.trim().length > 0 && !isLoading.value;
});

const statusClass = computed(() => {
  return {
    "status--idle": isIdle.value,
    "status--loading": isLoading.value,
    "status--passed": isPassed.value,
    "status--denied": isDenied.value,
    "status--error": hasError.value,
  };
});

watch(status, (newStatus) => {
  emit("status-change", newStatus);
});

watch(
  () => props.defaultKey,
  (newKey) => {
    if (newKey && !isInitialized.value) {
      publishableKey.value = newKey;
    }
  }
);

function validateKey() {
  localError.value = "";
  const key = publishableKey.value.trim();

  if (!key) {
    localError.value = "請輸入 publishableKey";
    return false;
  }

  if (!key.startsWith("prj_")) {
    localError.value = "publishableKey 格式不正確（應以 prj_ 開頭）";
    return false;
  }

  return true;
}

async function startVerification() {
  if (!validateKey()) {
    return;
  }

  localError.value = "";

  if (!isInitialized.value) {
    const initSuccess = initializeRadar(publishableKey.value.trim(), {
      debug: props.debug,
    });

    if (!initSuccess) {
      emit("error", {
        message: errorMessage.value,
        type: errorType.value,
      });
      return;
    }
  }

  const result = await verifyLocation({
    skipVerifyApp: props.skipVerifyApp,
  });

  emit("verification-complete", result);

  if (!result.success) {
    emit("error", {
      message: result.error,
      type: errorType.value,
    });
  }
}

function retry() {
  resetVerification();
  startVerification();
}

function reset() {
  localError.value = "";
  resetVerification();
}

defineExpose({
  startVerification,
  retry,
  reset,
  status,
  isPassed,
  isDenied,
  hasError,
  isLoading,
});
</script>

<template>
  <div class="radar-fraud-checker">
    <!-- 標題區 -->
    <div class="checker-header">
      <h2 class="checker-title">Radar Fraud 檢測</h2>
      <p class="checker-subtitle">使用 Radar SDK 驗證使用者位置與 Fraud 檢測</p>
    </div>

    <!-- PublishableKey 輸入區 -->
    <div v-if="!hideKeyInput" class="input-section">
      <label for="publishableKey" class="input-label">
        Radar Publishable Key
      </label>
      <input
        id="publishableKey"
        v-model="publishableKey"
        type="text"
        class="input-field"
        placeholder="prj_test_pk_xxxxxxxx"
        :disabled="isLoading || isInitialized"
      />
      <p v-if="isInitialized" class="input-hint">
        SDK 已初始化，如需更換 Key 請重新整理頁面
      </p>
    </div>

    <!-- 本地錯誤訊息 -->
    <div v-if="localError" class="error-message local-error">
      {{ localError }}
    </div>

    <!-- 操作按鈕 -->
    <div class="action-section">
      <button
        class="btn btn-primary"
        :disabled="!canStartVerification"
        @click="startVerification"
      >
        <span v-if="isLoading" class="btn-loading"></span>
        <span v-else>{{ isInitialized ? "重新檢測" : "開始檢測" }}</span>
      </button>

      <button
        v-if="!isIdle && !isLoading"
        class="btn btn-secondary"
        @click="reset"
      >
        重置
      </button>
    </div>

    <!-- 狀態顯示區 -->
    <div class="status-section" :class="statusClass">
      <div class="status-indicator">
        <span class="status-icon"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- 錯誤訊息 -->
      <div v-if="hasError && errorMessage" class="error-message">
        <strong>錯誤：</strong>{{ errorMessage }}
        <!-- Fraud 未啟用的額外提示 -->
        <div v-if="errorType === 'FRAUD_NOT_ENABLED'" class="error-help">
          <p>若要使用 Fraud 檢測功能，請：</p>
          <ol>
            <li>
              登入
              <a
                href="https://radar.com/dashboard"
                target="_blank"
                rel="noopener"
                >Radar Dashboard</a
              >
            </li>
            <li>前往 Settings 頁面</li>
            <li>啟用 Fraud 功能（需要 Enterprise 方案）</li>
          </ol>
          <p>
            <a
              href="https://docs.radar.com/geofencing/fraud"
              target="_blank"
              rel="noopener"
            >
              查看 Fraud 功能文件
            </a>
          </p>
        </div>
      </div>

      <!-- 失敗原因列表 -->
      <div v-if="isDenied && failureReasons.length > 0" class="failure-reasons">
        <strong>未通過原因：</strong>
        <ul>
          <li v-for="(reason, index) in failureReasons" :key="index">
            {{ reason }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 詳細結果區 -->
    <div v-if="showDetails && (isPassed || isDenied)" class="details-section">
      <h3 class="details-title">檢測詳細結果</h3>

      <!-- Fraud 檢測結果 -->
      <div v-if="fraudDetails" class="detail-card">
        <h4 class="detail-card-title">
          Fraud 檢測
          <span
            class="detail-badge"
            :class="{
              'badge-passed': fraudDetails.passed,
              'badge-failed': !fraudDetails.passed,
            }"
          >
            {{ fraudDetails.passed ? "通過" : "未通過" }}
          </span>
        </h4>
        <table class="detail-table">
          <tbody>
            <tr>
              <td>位置模擬 (mocked)</td>
              <td :class="{ 'text-danger': fraudDetails.mocked }">
                {{ fraudDetails.mocked ? "是" : "否" }}
              </td>
            </tr>
            <tr>
              <td>位置跳躍 (jumped)</td>
              <td :class="{ 'text-danger': fraudDetails.jumped }">
                {{ fraudDetails.jumped ? "是" : "否" }}
              </td>
            </tr>
            <tr>
              <td>裝置破解 (compromised)</td>
              <td :class="{ 'text-danger': fraudDetails.compromised }">
                {{ fraudDetails.compromised ? "是" : "否" }}
              </td>
            </tr>
            <tr>
              <td>位置不精確 (inaccurate)</td>
              <td :class="{ 'text-danger': fraudDetails.inaccurate }">
                {{ fraudDetails.inaccurate ? "是" : "否" }}
              </td>
            </tr>
            <tr>
              <td>螢幕分享 (sharing)</td>
              <td :class="{ 'text-danger': fraudDetails.sharing }">
                {{ fraudDetails.sharing ? "是" : "否" }}
              </td>
            </tr>
            <tr>
              <td>VPN/Proxy (proxy)</td>
              <td :class="{ 'text-danger': fraudDetails.proxy }">
                {{ fraudDetails.proxy ? "是" : "否" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 國家檢測結果 -->
      <div v-if="countryDetails" class="detail-card">
        <h4 class="detail-card-title">
          國家檢測
          <span
            class="detail-badge"
            :class="{
              'badge-passed': countryDetails.passed,
              'badge-failed': !countryDetails.passed,
            }"
          >
            {{ countryDetails.passed ? "通過" : "未通過" }}
          </span>
        </h4>
        <table class="detail-table">
          <tbody>
            <tr>
              <td>國家代碼</td>
              <td>{{ countryDetails.code || "-" }}</td>
            </tr>
            <tr>
              <td>國家名稱</td>
              <td>{{ countryDetails.name || "-" }}</td>
            </tr>
            <tr>
              <td>是否允許</td>
              <td :class="{ 'text-danger': !countryDetails.allowed }">
                {{ countryDetails.allowed ? "是" : "否" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 州/省檢測結果 -->
      <div v-if="stateDetails" class="detail-card">
        <h4 class="detail-card-title">
          州/省檢測
          <span
            class="detail-badge"
            :class="{
              'badge-passed': stateDetails.passed,
              'badge-failed': !stateDetails.passed,
            }"
          >
            {{ stateDetails.passed ? "通過" : "未通過" }}
          </span>
        </h4>
        <table class="detail-table">
          <tbody>
            <tr>
              <td>州/省代碼</td>
              <td>{{ stateDetails.code || "-" }}</td>
            </tr>
            <tr>
              <td>州/省名稱</td>
              <td>{{ stateDetails.name || "-" }}</td>
            </tr>
            <tr>
              <td>是否允許</td>
              <td :class="{ 'text-danger': !stateDetails.allowed }">
                {{ stateDetails.allowed ? "是" : "否" }}
              </td>
            </tr>
            <tr v-if="stateDetails.distanceToBorder !== undefined">
              <td>距離邊界 (公尺)</td>
              <td>{{ stateDetails.distanceToBorder }}</td>
            </tr>
            <tr>
              <td>在緩衝區內</td>
              <td>{{ stateDetails.inBufferZone ? "是" : "否" }}</td>
            </tr>
            <tr>
              <td>在排除區內</td>
              <td :class="{ 'text-danger': stateDetails.inExclusionZone }">
                {{ stateDetails.inExclusionZone ? "是" : "否" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 說明連結 -->
    <div class="footer-links">
      <a
        href="https://docs.radar.com/geofencing/fraud"
        target="_blank"
        rel="noopener noreferrer"
      >
        Radar Fraud 官方文件
      </a>
    </div>
  </div>
</template>

<style scoped>
.radar-fraud-checker {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #333;
}

.checker-header {
  margin-bottom: 24px;
  text-align: center;
}

.checker-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.checker-subtitle {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.input-section {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.input-field:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.input-field:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.input-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #888;
}

.error-message {
  padding: 12px 16px;
  margin-bottom: 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  text-align: left;
}

.error-help {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #fecaca;
  font-size: 13px;
  color: #7f1d1d;
  text-align: left;
}

.error-help p {
  margin: 0 0 8px 0;
}

.error-help ol {
  margin: 0 0 12px 0;
  padding-left: 20px;
  text-align: left;
}

.error-help li {
  margin-bottom: 4px;
}

.error-help a {
  color: #4f46e5;
  text-decoration: underline;
}

.error-help a:hover {
  color: #4338ca;
}

.local-error {
  margin-top: -12px;
}

.action-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
  flex: 1;
}

.btn-primary:hover:not(:disabled) {
  background-color: #4338ca;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn-loading {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-section {
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  transition: background-color 0.3s;
}

.status--idle {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
}

.status--loading {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
}

.status--passed {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.status--denied {
  background-color: #fef3c7;
  border: 1px solid #fde68a;
}

.status--error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status--idle .status-icon {
  background-color: #9ca3af;
}

.status--loading .status-icon {
  background-color: #3b82f6;
  animation: pulse 1.5s ease-in-out infinite;
}

.status--passed .status-icon {
  background-color: #22c55e;
}

.status--denied .status-icon {
  background-color: #f59e0b;
}

.status--error .status-icon {
  background-color: #ef4444;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 16px;
  font-weight: 500;
}

.status--idle .status-text {
  color: #6b7280;
}

.status--loading .status-text {
  color: #2563eb;
}

.status--passed .status-text {
  color: #16a34a;
}

.status--denied .status-text {
  color: #d97706;
}

.status--error .status-text {
  color: #dc2626;
}

.failure-reasons {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 14px;
  text-align: left;
}

.failure-reasons strong {
  display: block;
  margin-bottom: 8px;
}

.failure-reasons ul {
  margin: 0;
  padding-left: 24px;
  text-align: left;
}

.failure-reasons li {
  margin-bottom: 4px;
  color: #92400e;
}

.details-section {
  margin-bottom: 24px;
}

.details-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.detail-card {
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.detail-card-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-passed {
  background-color: #dcfce7;
  color: #166534;
}

.badge-failed {
  background-color: #fee2e2;
  color: #991b1b;
}

.detail-table {
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;
}

.detail-table td {
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-table tr:last-child td {
  border-bottom: none;
}

.detail-table td:first-child {
  color: #6b7280;
  width: 50%;
}

.detail-table td:last-child {
  color: #1f2937;
  text-align: right;
}

.text-danger {
  color: #dc2626 !important;
  font-weight: 500;
}

.footer-links {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.footer-links a {
  color: #4f46e5;
  text-decoration: none;
  font-size: 14px;
}

.footer-links a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .radar-fraud-checker {
    padding: 16px;
  }

  .checker-title {
    font-size: 20px;
  }

  .action-section {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
