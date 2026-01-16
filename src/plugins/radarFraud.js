import Radar from "radar-sdk-js";
import {
  useRadarFraudStore,
  VERIFICATION_STATUS,
  ERROR_TYPES,
} from "@/stores/radarFraud";

export const RadarFraudPlugin = {
  install(app, options = {}) {
    const { publishableKey = "", autoInit = false, debug = false } = options;

    app.config.globalProperties.$radarFraud = {
      Radar,
      VERIFICATION_STATUS,
      ERROR_TYPES,
    };

    app.provide("radarFraud", {
      Radar,
      VERIFICATION_STATUS,
      ERROR_TYPES,
    });

    if (publishableKey && autoInit) {
      Promise.resolve().then(() => {
        try {
          const store = useRadarFraudStore();

          if (!store.isInitialized) {
            Radar.initialize(publishableKey, { debug });
            store.setInitialized(publishableKey);

            if (debug) {
              console.log("[RadarFraudPlugin] SDK 自動初始化成功");
            }
          }
        } catch (error) {
          console.error("[RadarFraudPlugin] SDK 自動初始化失敗:", error);
        }
      });
    }

    if (debug) {
      console.log("[RadarFraudPlugin] Plugin 已安裝", {
        publishableKey: publishableKey ? "已設定" : "未設定",
        autoInit,
      });
    }
  },
};

export function createRadarFraud(options = {}) {
  const { debug = false } = options;
  let initialized = false;
  let currentKey = null;

  return {
    initialize(key) {
      if (initialized) {
        console.warn("[createRadarFraud] SDK 已經初始化");
        return currentKey === key;
      }

      try {
        Radar.initialize(key, { debug });
        initialized = true;
        currentKey = key;
        return true;
      } catch (error) {
        console.error("[createRadarFraud] 初始化失敗:", error);
        return false;
      }
    },

    async verify(options = { skipVerifyApp: true }) {
      if (!initialized) {
        throw new Error("請先呼叫 initialize() 初始化 SDK");
      }

      return Radar.trackVerified(options);
    },

    get sdk() {
      return Radar;
    },

    get isInitialized() {
      return initialized;
    },

    VERIFICATION_STATUS,
    ERROR_TYPES,
  };
}

export { default as RadarFraudChecker } from "@/components/RadarFraudChecker.vue";
export { useRadarFraud } from "@/composables/useRadarFraud";
export { useRadarFraudStore } from "@/stores/radarFraud";
export { VERIFICATION_STATUS, ERROR_TYPES };
