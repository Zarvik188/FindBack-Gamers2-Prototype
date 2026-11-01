import fs from 'node:fs/promises';
const base=new URL('../',import.meta.url),site=new URL('site/',base);
await fs.mkdir(new URL('public/',site),{recursive:true});
for(const name of ['index.html','style.css','app.js','favicon.svg']) await fs.copyFile(new URL('frontend/'+name,base),new URL('public/'+name,site));
await fs.cp(new URL('frontend/images/',base),new URL('public/images/',site),{recursive:true});
await fs.mkdir(new URL('app/api/[[...path]]/',site),{recursive:true});
await fs.mkdir(new URL('lib/',site),{recursive:true});
await fs.copyFile(new URL('backend/service.mjs',base),new URL('lib/service.mjs',site));
await fs.writeFile(new URL('app/api/[[...path]]/route.ts',site),`import { env } from 'cloudflare:workers';\nimport { handleApi } from '../../../lib/service.mjs';\nexport const dynamic='force-dynamic';\nexport function GET(request: Request) { return handleApi(request, env); }\nexport function POST(request: Request) { return handleApi(request, env); }\n`);
await fs.writeFile(new URL('app/page.tsx',site),`import { redirect } from 'next/navigation';\nexport default function Home(){ redirect('/index.html'); }\n`);
await fs.writeFile(new URL('app/layout.tsx',site),`import type { Metadata } from 'next';\nexport const metadata: Metadata={title:'拾光 FindBack · 校园失物招领',description:'Gamers2 软件工程实践：发布、认领、核验与双向交接。'};\nexport default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}\n`);
// Private hosting metadata is intentionally excluded from the public repository.
const hostingPath=new URL('.openai/hosting.json',site);
try { await fs.access(hostingPath); const manifest=JSON.parse(await fs.readFile(hostingPath,'utf8')); manifest.d1='DB'; await fs.writeFile(hostingPath,JSON.stringify(manifest,null,2)); } catch(error) { if(error.code!=='ENOENT') throw error; }
console.log('Frontend and backend synchronized to Sites source.');
