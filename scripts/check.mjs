import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const config=JSON.parse(fs.readFileSync('wrangler.json','utf8'));
assert.equal(config.name,'nortesnyfc');
assert.equal(config.assets.html_handling,'none');
assert(config.kv_namespaces.some(n=>n.binding==='DATA'&&n.id));
assert(config.durable_objects.bindings.some(b=>b.name==='LOGIN_GUARD'&&b.class_name==='LoginGuard'));
JSON.parse(fs.readFileSync('initial.json','utf8'));
for(const file of ['public/admin.html','public/template.html']){
 const html=fs.readFileSync(file,'utf8');
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1],{filename:file});
}
new vm.Script(fs.readFileSync('public/admin-sw.js','utf8'));
for(const file of ['public/manifest.json','public/site-manifest.json']){
 const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const icon of manifest.icons)assert(fs.existsSync('public'+icon.src));
}
assert(fs.existsSync('public/comunicado-cover.png'));
console.log('Configuración, scripts y recursos verificados.');
