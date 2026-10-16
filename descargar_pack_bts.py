#!/usr/bin/env python3
"""Descarga fotos con licencias CC o dominio público desde Wikimedia Commons.
Ejecutar: python descargar_pack_bts.py (requiere conexión a Internet)
"""
import json, re, time, urllib.parse, urllib.request, csv, io, sys
from pathlib import Path

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'BTS-Album-Personal/1.0 (descargador personal; contacto: example@example.com)'
OUT = Path(__file__).resolve().parent / 'img'
OUT.mkdir(exist_ok=True)

# Categorías organizadas por cantante / año.
BTS_CATS = [f'Category:BTS in {y}' for y in (2019,2018,2017,2016,2014,2013)]
V_CATS = ['Category:V (vocalist) in 2019','Category:V (vocalist) in 2018', 'Category:V (vocalist) in 2017', 'Category:V (vocalist)']

def request_json(params):
    query = urllib.parse.urlencode(dict(params, format='json', formatversion='2'))
    req = urllib.request.Request(f'{API}?{query}', headers={'User-Agent':UA})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.load(resp)

def gather(category, limit=100):
    params = dict(action='query', generator='categorymembers', gcmtitle=category,
                  gcmtype='file', gcmlimit='max', prop='imageinfo',
                  iiprop='url|extmetadata|mime', iiurlwidth=900)
    found=[]
    for _ in range(5):
        data=request_json(params)
        found.extend(data.get('query',{}).get('pages',[]))
        if not data.get('continue') or len(found) >=limit: break
        params.update(data['continue'])
    return found

def allowed(page):
    info=(page.get('imageinfo') or [{}])[0]
    if info.get('mime') not in ('image/jpeg','image/png','image/webp'): return False
    meta=info.get('extmetadata',{})
    short=re.sub('<[^>]*>','',meta.get('LicenseShortName',{}).get('value','')).strip()
    uri=meta.get('LicenseUrl',{}).get('value','').lower()
    valid=(short.lower().startswith(('cc by','cc0','public domain')) or
           'creativecommons.org/licenses/by/' in uri or
           'creativecommons.org/licenses/by-sa/' in uri or
           'creativecommons.org/publicdomain/' in uri)
    return valid and bool(info.get('thumburl') or info.get('url'))

def candidates(categories):
    result=[]; seen=set()
    for cat in categories:
        print('Buscando:',cat,flush=True)
        try:
            pages=gather(cat)
        except Exception as e:
            print('  Aviso:', e); continue
        for page in pages:
            title=page.get('title','')
            if title in seen or not allowed(page): continue
            seen.add(title)
            result.append(page)
    return result

def download(page, target):
    info=page['imageinfo'][0]
    url=info.get('thumburl') or info['url']
    req=urllib.request.Request(url,headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=45) as r:
        data=r.read(8_000_001)
        mime=r.headers.get('Content-Type','')
    if len(data)>8_000_000 or not mime.startswith('image/'):
        raise ValueError('imagen inválida o demasiado grande')
    from PIL import Image
    im=Image.open(io.BytesIO(data)).convert('RGB')
    im.thumbnail((1100,1400))
    im.save(target,'JPEG',quality=85,optimize=True)
    meta=info.get('extmetadata',{})
    def m(key):return re.sub('<[^>]*>',' ',meta.get(key,{}).get('value','')).strip()
    return [target.name,page['title'],m('Artist'),m('LicenseShortName'),
            'https://commons.wikimedia.org/wiki/'+urllib.parse.quote(page['title'].replace(' ','_'))]

def main():
    try: from PIL import Image
    except ImportError:
        sys.exit('Necesitas Pillow: python -m pip install pillow (en un entorno virtual).')
    bts=candidates(BTS_CATS)
    v=candidates(V_CATS)
    if len(bts)<20 or len(v)<8:
        print(f'Advertencia: se encontraron {len(bts)} fotos de BTS y {len(v)} de V con licencia verificada.')
    rows=[]; used=set()
    def fill(pages,n,prefix):
        index=1
        for page in pages:
            if index>n: break
            if page['title'] in used:continue
            target=OUT/f'{prefix}{index}.jpg'
            try:
                row=download(page,target)
                rows.append(row); used.add(page['title'])
                print('Descargada:', target.name)
                index+=1
                time.sleep(.2)
            except Exception as e:
                print('No se pudo descargar',page['title'],e)
        return index-1
    nb=fill(bts,20,'bts')
    nv=fill(v,8,'v')
    if nb:
        import shutil
        shutil.copyfile(OUT/'bts1.jpg',OUT/'portada.jpg')
        rows.append(['portada.jpg','Copia de bts1.jpg','','','Misma fuente que bts1.jpg'])
    with (OUT/'CREDITOS.csv').open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.writer(f);writer.writerow(['Archivo','Título original','Autor','Licencia','Fuente']);writer.writerows(rows)
    print(f'LISTO: {nb} fotos BTS, {nv} fotos V y portada. Carpeta: {OUT}')
    print('Revisa CREDITOS.csv y conserva la atribución al publicar el álbum.')

if __name__=='__main__':main()
