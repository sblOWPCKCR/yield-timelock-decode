import { createApp } from 'vue'
import App from './App.vue'

if (document.getElementById("app")) {
    createApp(App, {batch: false}).mount('#app')
}

if (document.getElementById("batch-app")) {
    createApp(App, {batch: true}).mount('#batch-app');
}
