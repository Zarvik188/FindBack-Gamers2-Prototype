import type { Metadata } from 'next';
export const metadata: Metadata={title:'拾光 FindBack · 校园失物招领',description:'Gamers2 软件工程实践：发布、认领、核验与双向交接。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
