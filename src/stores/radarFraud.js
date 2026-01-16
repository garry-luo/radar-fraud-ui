import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const VERIFICATION_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  PASSED: "passed",
  DENIED: "denied",
  ERROR: "error",
};

export const ERROR_TYPES = {
  LOCATION_PERMISSION_DENIED: "LOCATION_PERMISSION_DENIED",
  SDK_INIT_FAILED: "SDK_INIT_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  VERIFY_APP_NOT_RUNNING: "VERIFY_APP_NOT_RUNNING",
  FRAUD_NOT_ENABLED: "FRAUD_NOT_ENABLED",
  UNKNOWN: "UNKNOWN",
};

export const useRadarFraudStore = defineStore("radarFraud", () => {
  const status = ref(VERIFICATION_STATUS.IDLE);
  const isInitialized = ref(false);
  const currentPublishableKey = ref(null);
  const verificationToken = ref(null);
  const userData = ref(null);
  const failureReasons = ref([]);
  const errorMessage = ref(null);
  const errorType = ref(null);
  const fraudDetails = ref(null);
  const countryDetails = ref(null);
  const stateDetails = ref(null);

  const isLoading = computed(
    () => status.value === VERIFICATION_STATUS.LOADING
  );
  const isPassed = computed(() => status.value === VERIFICATION_STATUS.PASSED);
  const isDenied = computed(() => status.value === VERIFICATION_STATUS.DENIED);
  const hasError = computed(() => status.value === VERIFICATION_STATUS.ERROR);
  const isIdle = computed(() => status.value === VERIFICATION_STATUS.IDLE);
  const fraudPassed = computed(() => fraudDetails.value?.passed ?? null);
  const countryPassed = computed(() => countryDetails.value?.passed ?? null);
  const statePassed = computed(() => stateDetails.value?.passed ?? null);

  const statusText = computed(() => {
    switch (status.value) {
      case VERIFICATION_STATUS.IDLE:
        return "尚未開始檢測";
      case VERIFICATION_STATUS.LOADING:
        return "檢測進行中...";
      case VERIFICATION_STATUS.PASSED:
        return "檢測通過";
      case VERIFICATION_STATUS.DENIED:
        return "檢測未通過";
      case VERIFICATION_STATUS.ERROR:
        return "發生錯誤";
      default:
        return "未知狀態";
    }
  });

  function setInitialized(publishableKey) {
    isInitialized.value = true;
    currentPublishableKey.value = publishableKey;
  }

  function startVerification() {
    status.value = VERIFICATION_STATUS.LOADING;
    verificationToken.value = null;
    userData.value = null;
    failureReasons.value = [];
    errorMessage.value = null;
    errorType.value = null;
    fraudDetails.value = null;
    countryDetails.value = null;
    stateDetails.value = null;
  }

  function setVerificationPassed(token, user) {
    status.value = VERIFICATION_STATUS.PASSED;
    verificationToken.value = token;
    userData.value = user;
    failureReasons.value = [];
    errorMessage.value = null;
    errorType.value = null;
    if (user) {
      fraudDetails.value = user.fraud || null;
      countryDetails.value = user.country || null;
      stateDetails.value = user.state || null;
    }
  }

  function setVerificationDenied(token, user, reasons = []) {
    status.value = VERIFICATION_STATUS.DENIED;
    verificationToken.value = token;
    userData.value = user;
    failureReasons.value = reasons;
    errorMessage.value = null;
    errorType.value = null;
    if (user) {
      fraudDetails.value = user.fraud || null;
      countryDetails.value = user.country || null;
      stateDetails.value = user.state || null;
    }
  }

  function setError(message, type = ERROR_TYPES.UNKNOWN) {
    status.value = VERIFICATION_STATUS.ERROR;
    errorMessage.value = message;
    errorType.value = type;
    verificationToken.value = null;
    userData.value = null;
    failureReasons.value = [];
  }

  function reset() {
    status.value = VERIFICATION_STATUS.IDLE;
    verificationToken.value = null;
    userData.value = null;
    failureReasons.value = [];
    errorMessage.value = null;
    errorType.value = null;
    fraudDetails.value = null;
    countryDetails.value = null;
    stateDetails.value = null;
  }

  function fullReset() {
    reset();
    isInitialized.value = false;
    currentPublishableKey.value = null;
  }

  return {
    status,
    isInitialized,
    currentPublishableKey,
    verificationToken,
    userData,
    failureReasons,
    errorMessage,
    errorType,
    fraudDetails,
    countryDetails,
    stateDetails,
    isLoading,
    isPassed,
    isDenied,
    hasError,
    isIdle,
    fraudPassed,
    countryPassed,
    statePassed,
    statusText,
    setInitialized,
    startVerification,
    setVerificationPassed,
    setVerificationDenied,
    setError,
    reset,
    fullReset,
  };
});
