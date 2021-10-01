import { defineConfig } from 'vite'
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        batch: resolve(__dirname, 'batch.html')
      }
    }
  }  
  // define: {
  //   'process.env': {},
  // },
  // optimizeDeps: {
  //   exclude: ['dragula'] // <- modules that needs shimming have to be excluded from dep optimization
  // }
})
