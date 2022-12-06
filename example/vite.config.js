// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				asyncGenerate: resolve(__dirname, 'asyncGenerate.html'),
				characterMovement: resolve(__dirname, 'characterMovement.html')
			}
		}
	}
})
