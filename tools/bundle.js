#!/usr/bin/env node
/* 把多檔專案打包成單一 HTML（dist/game-spec-checker.html），方便直接分享或丟到 Netlify Drop。
 * 用法：node tools/bundle.js
 */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
html=html.replace(/<link rel="stylesheet" href="css\/style\.css[^"]*">/,'<style>\n'+css+'\n</style>');
html=html.replace(/<script src="(js\/[^"?]+)(?:\?[^"]*)?"><\/script>\n?/g,(m,p)=>'<script>\n'+fs.readFileSync(path.join(root,p),'utf8')+'\n</script>\n');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
const out=path.join(root,'dist/game-spec-checker.html');
fs.writeFileSync(out,html);
console.log('→ '+path.relative(root,out)+' ('+(html.length/1024).toFixed(0)+' KB)');
