import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // define: {
  //   'process.env': {},
  // },
  // optimizeDeps: {
  //   exclude: ['dragula'] // <- modules that needs shimming have to be excluded from dep optimization
  // }
})
