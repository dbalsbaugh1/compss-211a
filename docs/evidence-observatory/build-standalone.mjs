import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const [html,css,simulation,atmosphere,sound,world,story,app]=await Promise.all(['shell.html','dist/style.css','dist/simulation.mjs','dist/atmosphere.mjs','dist/sound.mjs','dist/world.mjs','dist/story.mjs','dist/app.mjs'].map(read));
const code=[simulation,atmosphere,sound,world,story,app].map(s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n');
const output=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>\n${css}\n</style>`).replace('<script type="module" src="app.mjs"></script>','').replace('</body>',()=>`<script type="module">\n${code}\n</script>\n</body>`).replace(/[ \t]+$/gm,'');
await Promise.all(['play.html','dist/index.html','../interactives/echo-chamber.html'].map(name=>writeFile(new URL(name,root),output)));
console.log('Refreshed both local files and the unlisted GitHub Pages interactive.');
