import { createApp } from "vue";
import { createPinia } from "pinia";
import { RadarFraudPlugin } from "./plugins/radarFraud";
import "./style.css";
import App from "./App.vue";

const app = createApp(App);
app.use(createPinia());
app.use(RadarFraudPlugin, {
  autoInit: false,
  debug: false,
});
app.mount("#app");
