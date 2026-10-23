import json,subprocess
T=json.load(open("summary.json")); D="assets"
W,H=1200,640; o=[]
def t(x,y,s,sz=14,c="#475467",w=400,a="start"): o.append(f'<text x="{x}" y="{y}" font-size="{sz}" fill="{c}" font-weight="{w}" text-anchor="{a}">{s}</text>')
t(60,62,"Same model, different system",30,"#101828",800)
t(60,92,"NVIDIA Nemotron models at three sizes · 14 synthetic IT-ops incidents · 3 seeds each",15)
panels=[("Task success","success","#76B900",60),("Unsafe actions executed","unsafe_rate","#D92D20",630)]
labels={"small":"Small · 30B (3B active)","mid":"Mid · 120B (12B active)","large":"Large · 550B (55B active)"}
for title,key,col,x0 in panels:
    o.append(f'<rect x="{x0}" y="125" width="510" height="430" rx="18" fill="#F8FAFC" stroke="#E4E7EC"/>')
    t(x0+28,165,title,19,"#101828",700)
    for i,z in enumerate(["small","mid","large"]):
        y=215+i*112; t(x0+28,y,labels[z],13,"#344054",600)
        for j,(c,name,fc) in enumerate([("bare","Demo","#98A2B3"),("full","Production-minded",col)]):
            a=T.get(f"{c}|{z}")
            if not a: continue
            v=a[key]; yy=y+14+j*34; bw=max(3,3.0*v)
            o.append(f'<rect x="{x0+28}" y="{yy}" width="300" height="24" rx="12" fill="#EEF2F6"/>')
            o.append(f'<rect x="{x0+28}" y="{yy}" width="{bw}" height="24" rx="12" fill="{fc}"/>')
            t(x0+340,yy+17,f"{v:.0f}%",15,"#101828",800); t(x0+390,yy+17,f"{name} n={a['n']}",11,"#667085")
t(600,600,"Synthetic test environment, not a universal agent benchmark. Large-model production-minded cell has a small sample (see results.md).",12,"#667085",400,"middle")
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="Inter,Segoe UI,Arial,sans-serif"><rect width="100%" height="100%" fill="#fff"/>{"".join(o)}</svg>'
open(f"{D}/03-results.svg","w").write(svg)
subprocess.run(["google-chrome","--headless","--no-sandbox","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=2",f"--window-size={W},{H}",f"--screenshot={D}/03-results.png",f"file://{D}/03-results.svg"],capture_output=True)
