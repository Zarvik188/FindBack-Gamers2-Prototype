from pathlib import Path
from reportlab.pdfgen import canvas
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
output=root/'交付/拾光FindBack-原型设计与基础版汇报-配图版-链接修正版.pdf'
proto='https://modao.cc/proto/mZBdN92Gtntbi9MCoK4oiE/sharing?view_mode=device&screen=rbpVZhjdku4xrr7am&canvasId=rcVZhmZ6fw9Zfa16'
site='https://findback-gamers2.x1013956.chatgpt.site'
c=canvas.Canvas(str(output),pagesize=(960,540))
c.setTitle('拾光 FindBack - 原型设计与基础版汇报初版')
c.setAuthor('Gamers2')
def link(url,x,y,w,h):
    c.linkURL(url,(x*.75,(720-y-h)*.75,(x+w)*.75,(720-y)*.75),relative=0,thickness=0)
for i in range(1,13):
    c.drawImage(str(root/f'.ppt-build/slide-{i:02d}.png'),0,0,width=960,height=540)
    if i==1:
        link(proto,76,572,600,62)
        link(proto,76,639,1136,36)
    if i==11:
        link(proto,76,540,648,68)
        link(proto,76,620,1136,44)
        link(site,780,554,420,50)
    c.showPage()
c.save()
r=PdfReader(output)
assert len(r.pages)==12
links=[a.get_object().get('/A',{}).get('/URI')for p in r.pages for a in p.get('/Annots',[])]
assert links.count(proto)==4 and site in links
print({'pages':len(r.pages),'links':len(links),'output':str(output)})
