import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Replace with vue() if using Vue
import path from 'path'

export default defineConfig({
  // 🧩 Plugins
  plugins: [
    react() // Use vue() for Vue projects
  ],

  // 🏠 Base Path (for deployment under subdirectory)
  base: '/',

  // 📁 Source Directory
  root: '.',

  // 🌐 Development Server
  server: {
    port: 3000,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  // 🔨 Build Options
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'] // Adjust for your framework
        }
      }
    }
  },

  // 🔍 Path Aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },

  // ⚡ Optimization
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@custom/package']
  },

  // 🧪 CSS Preprocessor Options
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    },
    modules: {
      localsConvention: 'camelCase'
    }
  },

  // 🧾 Environment Variable Prefix
  envPrefix: 'VITE_'
})
