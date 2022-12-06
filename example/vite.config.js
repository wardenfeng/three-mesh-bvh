// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import fs from 'fs';

export default defineConfig({
	build: {
		rollupOptions: {
			input: getHtmlNamesObject(),
		}
	}
})

function getHtmlNamesObject()
{
	const obj = fs.readdirSync('./').reduce((pv, cv) =>
	{
		const ps = cv.split('.');

		if (ps[1] === 'html')
		{
			pv[ps[0]] = resolve(__dirname, cv);
		}

		return pv;
	}, {})

	return obj;
}


