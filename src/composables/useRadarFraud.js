import { computed, readonly } from "vue";
import Radar from "radar-sdk-js";
import {
  useRadarFraudStore,
  ERROR_TYPES,
  VERIFICATION_STATUS,
} from "@/stores/radarFraud";

export function useRadarFraud() {
  const store = useRadarFraudStore();

  function parseRadarError(status) {
    const errorMap = {
      ERROR_PERMISSIONS: {
        message: "定位權限被拒絕。請允許瀏覽器存取您的位置。",
        type: ERROR_TYPES.LOCATION_PERMISSION_DENIED,
      },
      ERROR_LOCATION: {
        message: "無法取得定位資訊。請確認定位服務已開啟。",
        type: ERROR_TYPES.LOCATION_PERMISSION_DENIED,
      },
      ERROR_NETWORK: {
        message: "網路連線錯誤。請檢查您的網路連線。",
        type: ERROR_TYPES.NETWORK_ERROR,
      },
      ERROR_UNAUTHORIZED: {
        message: "publishableKey 無效或未授權。請檢查您的 API Key。",
        type: ERROR_TYPES.SDK_INIT_FAILED,
      },
      ERROR_VERIFY_APP: {
        message:
          "Radar Verify App 未運行。使用 skipVerifyApp 選項或安裝 Radar Verify App。",
        type: ERROR_TYPES.VERIFY_APP_NOT_RUNNING,
      },
      ERROR_SERVER: {
        message: "Radar 伺服器錯誤。請稍後再試。",
        type: ERROR_TYPES.NETWORK_ERROR,
      },
      ERROR_BAD_REQUEST: {
        message: "請求參數錯誤。",
        type: ERROR_TYPES.UNKNOWN,
      },
      ERROR_RATE_LIMIT: {
        message: "API 請求次數超過限制。請稍後再試。",
        type: ERROR_TYPES.NETWORK_ERROR,
      },
      ERROR_NOT_FOUND: {
        message: "找不到指定資源。",
        type: ERROR_TYPES.UNKNOWN,
      },
    };

    return (
      errorMap[status] || {
        message: `未知錯誤: ${status}`,
        type: ERROR_TYPES.UNKNOWN,
      }
    );
  }

  // 檢查 fraud.passed && country.passed && state.passed
  function checkVerificationPassed(user) {
    if (!user) return false;

    const fraudPassed = user.fraud?.passed === true;
    const countryPassed = user.country?.passed === true;
    const statePassed = user.state?.passed === true;
    return fraudPassed && countryPassed && statePassed;
  }

  // 失敗原因代碼對照表
  const FAILURE_REASON_MAP = {
    fraud_mocked: "位置可能被模擬",
    fraud_mocked_inconsistent_ip_country:
      "位置與 IP 所在國家不一致（可能使用 VPN 或位置模擬）",
    fraud_jumped: "位置跳躍異常",
    fraud_compromised: "裝置可能已被破解（root/jailbreak）",
    fraud_inaccurate: "位置精確度不足",
    fraud_sharing: "偵測到螢幕分享或遠端桌面",
    fraud_proxy: "偵測到 VPN 或代理伺服器",
    fraud_proxy_known_proxy_ip: "IP 位址為已知的代理伺服器（VPN/Proxy）",
    fraud_blocked: "使用者已被封鎖",
    country_not_allowed: "所在國家不在允許清單中",
    state_not_allowed: "所在州/省不在允許清單中",
    country_in_exclusion_zone: "所在國家位於排除區域",
    state_in_exclusion_zone: "所在州/省位於排除區域",
    geofence_not_allowed: "不在允許的地理圍欄內",
    geofence_in_exclusion_zone: "位於排除的地理圍欄內",
  };

  function translateFailureReason(reason) {
    return FAILURE_REASON_MAP[reason] || reason;
  }

  function collectFailureReasons(result, user) {
    const reasons = [];

    if (result?.failureReasons && Array.isArray(result.failureReasons)) {
      result.failureReasons.forEach((reason) => {
        reasons.push(translateFailureReason(reason));
      });
    }

    if (reasons.length === 0 && user) {
      if (user.failureReasons && Array.isArray(user.failureReasons)) {
        user.failureReasons.forEach((reason) => {
          reasons.push(translateFailureReason(reason));
        });
      }

      if (user.fraud) {
        const fraud = user.fraud;
        if (fraud.mocked && !reasons.some((r) => r.includes("模擬"))) {
          reasons.push("位置可能被模擬 (mocked)");
        }
        if (fraud.jumped && !reasons.some((r) => r.includes("跳躍"))) {
          reasons.push("位置跳躍異常 (jumped)");
        }
        if (fraud.compromised && !reasons.some((r) => r.includes("破解"))) {
          reasons.push("裝置可能已被破解 (compromised)");
        }
        if (fraud.inaccurate && !reasons.some((r) => r.includes("精確度"))) {
          reasons.push("位置精確度不足 (inaccurate)");
        }
        if (fraud.sharing && !reasons.some((r) => r.includes("螢幕分享"))) {
          reasons.push("偵測到螢幕分享或遠端桌面 (sharing)");
        }
        if (
          fraud.proxy &&
          !reasons.some((r) => r.includes("代理") || r.includes("VPN"))
        ) {
          reasons.push("偵測到 VPN 或代理伺服器 (proxy)");
        }
      }

      if (
        user.country?.passed === false &&
        !reasons.some((r) => r.includes("國家"))
      ) {
        reasons.push(
          `國家不在允許範圍內: ${user.country.name || user.country.code}`
        );
      }
      if (
        user.state?.passed === false &&
        !reasons.some((r) => r.includes("州") || r.includes("省"))
      ) {
        reasons.push(
          `州/省不在允許範圍內: ${user.state.name || user.state.code}`
        );
      }
    }

    return [...new Set(reasons)];
  }

  function initializeRadar(publishableKey, options = {}) {
    if (!publishableKey || typeof publishableKey !== "string") {
      store.setError("publishableKey 不可為空", ERROR_TYPES.SDK_INIT_FAILED);
      return false;
    }

    if (store.isInitialized) {
      console.warn("[useRadarFraud] Radar SDK 已經初始化，跳過重複初始化");
      if (store.currentPublishableKey === publishableKey) {
        return true;
      }
      store.setError(
        "無法使用新的 publishableKey 重新初始化 SDK。請重新整理頁面後再試。",
        ERROR_TYPES.SDK_INIT_FAILED
      );
      return false;
    }

    try {
      Radar.initialize(publishableKey, {
        debug: options.debug ?? false,
      });

      store.setInitialized(publishableKey);
      console.log("[useRadarFraud] Radar SDK 初始化成功");
      return true;
    } catch (error) {
      console.error("[useRadarFraud] Radar SDK 初始化失敗:", error);
      store.setError(
        `SDK 初始化失敗: ${error.message || "未知錯誤"}`,
        ERROR_TYPES.SDK_INIT_FAILED
      );
      return false;
    }
  }

  async function verifyLocation(options = {}) {
    if (!store.isInitialized) {
      const error = "請先呼叫 initializeRadar() 初始化 SDK";
      store.setError(error, ERROR_TYPES.SDK_INIT_FAILED);
      return {
        success: false,
        passed: false,
        token: null,
        user: null,
        failureReasons: [],
        error,
      };
    }

    store.startVerification();

    try {
      const result = await Radar.trackVerified({
        skipVerifyApp: options.skipVerifyApp ?? true,
        ...options,
      });

      console.log("[useRadarFraud] trackVerified 回傳結果:", result);

      if (!result || typeof result !== "object") {
        store.setError("Radar SDK 回傳結果無效", ERROR_TYPES.UNKNOWN);
        return {
          success: false,
          passed: false,
          token: null,
          user: null,
          failureReasons: [],
          error: "Radar SDK 回傳結果無效",
        };
      }

      const { user, token, passed: resultPassed } = result;

      if (!user) {
        const errorCode = result.meta?.code;
        if (errorCode && errorCode !== 200) {
          const errorInfo = parseRadarError(`ERROR_${errorCode}`);
          store.setError(errorInfo.message, errorInfo.type);
          return {
            success: false,
            passed: false,
            token: null,
            user: null,
            failureReasons: [],
            error: errorInfo.message,
          };
        }
      }

      const passed = resultPassed ?? checkVerificationPassed(user);
      const failureReasons = collectFailureReasons(result, user);

      if (passed) {
        store.setVerificationPassed(token, user);
        return {
          success: true,
          passed: true,
          token,
          user,
          failureReasons: [],
          error: null,
        };
      } else {
        store.setVerificationDenied(token, user, failureReasons);
        return {
          success: true,
          passed: false,
          token,
          user,
          failureReasons,
          error: null,
        };
      }
    } catch (error) {
      console.error("[useRadarFraud] 檢測過程發生錯誤:", error);

      let errorType = ERROR_TYPES.UNKNOWN;
      let errorMessage = error.message || "檢測過程發生未知錯誤";

      // HMAC key 錯誤表示 Fraud 功能未啟用（需要 Enterprise 方案）
      if (
        errorMessage.includes("HMAC key data must not be empty") ||
        errorMessage.includes("HMAC") ||
        error.name === "DataError"
      ) {
        errorType = ERROR_TYPES.FRAUD_NOT_ENABLED;
        errorMessage =
          "Radar Fraud 功能未啟用。請在 Radar Dashboard 的 Settings 頁面啟用 Fraud 功能（需要 Enterprise 方案）。";
      } else if (
        error.name === "GeolocationPositionError" ||
        error.code === 1 || // PERMISSION_DENIED
        errorMessage.toLowerCase().includes("permission")
      ) {
        errorType = ERROR_TYPES.LOCATION_PERMISSION_DENIED;
        errorMessage = "定位權限被拒絕。請允許瀏覽器存取您的位置。";
      } else if (
        (error.name === "TypeError" && errorMessage.includes("fetch")) ||
        errorMessage.toLowerCase().includes("network")
      ) {
        errorType = ERROR_TYPES.NETWORK_ERROR;
        errorMessage = "網路連線錯誤。請檢查您的網路連線。";
      }

      store.setError(errorMessage, errorType);
      return {
        success: false,
        passed: false,
        token: null,
        user: null,
        failureReasons: [],
        error: errorMessage,
      };
    }
  }

  function resetVerification() {
    store.reset();
  }

  function fullReset() {
    store.fullReset();
  }

  return {
    initializeRadar,
    verifyLocation,
    resetVerification,
    fullReset,
    status: computed(() => store.status),
    isInitialized: computed(() => store.isInitialized),
    currentPublishableKey: computed(() => store.currentPublishableKey),
    verificationToken: computed(() => store.verificationToken),
    userData: computed(() => store.userData),
    failureReasons: computed(() => store.failureReasons),
    errorMessage: computed(() => store.errorMessage),
    errorType: computed(() => store.errorType),
    fraudDetails: computed(() => store.fraudDetails),
    countryDetails: computed(() => store.countryDetails),
    stateDetails: computed(() => store.stateDetails),
    isLoading: computed(() => store.isLoading),
    isPassed: computed(() => store.isPassed),
    isDenied: computed(() => store.isDenied),
    hasError: computed(() => store.hasError),
    isIdle: computed(() => store.isIdle),
    fraudPassed: computed(() => store.fraudPassed),
    countryPassed: computed(() => store.countryPassed),
    statePassed: computed(() => store.statePassed),
    statusText: computed(() => store.statusText),
    VERIFICATION_STATUS,
    ERROR_TYPES,
  };
}

export { VERIFICATION_STATUS, ERROR_TYPES };
