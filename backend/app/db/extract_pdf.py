import fitz
import re
import json

def parse_amaldina_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    raw_rows = []
    for page in doc:
        tabs = page.find_tables()
        for t in tabs.tables:
            df = t.extract()
            for r in df:
                if r[0] == 'Product' and r[1] == 'Description':
                    continue
                raw_rows.append(r)

    products = []
    i = 0
    while i < len(raw_rows):
        r = raw_rows[i]
        name = r[0].replace('\n', ' ').strip()
        if not name:
            if products:
                prev = products[-1]
                prev['desc'] += ' ' + r[1].replace('\n', ' ').strip()
                if r[3]:
                    prev['pack'] += ' ' + r[3].replace('\n', ' ').strip()
                if r[4]:
                    prev['carton'] += ' ' + r[4].replace('\n', ' ').strip()
            i += 1
            continue

        products.append({
            'raw_name': name,
            'desc': r[1].replace('\n', ' ').strip(),
            'unit_price_raw': r[2].replace('\n', ' ').strip(),
            'pack': r[3].replace('\n', ' ').strip(),
            'carton': r[4].replace('\n', ' ').strip(),
            'promo': r[5].replace('\n', ' ').strip()
        })
        i += 1

    cleaned_products = []
    for idx, p in enumerate(products):
        # 1. Clean Name
        name = p['raw_name'].strip()
        
        # 2. Parse Unit Price
        # e.g. '1 250,00 K z' -> 1250.00
        u_str = re.sub(r'[^\d,]', '', p['unit_price_raw']).replace(',', '.')
        try:
            unit_price = float(u_str)
        except:
            unit_price = 0.0

        # 3. Parse Units Per Carton
        # e.g. '(50 un)' or '(1250 un)'
        m = re.search(r'\((\d+)\s*un\)', p['carton'])
        if m:
            units_per_carton = int(m.group(1))
        else:
            units_per_carton = 50 # fallback if not specified

        # 4. Parse Pack size / Unit of Measure
        # e.g. from desc: 'Frasco : 200 ml', 'Caxinha: 10 x 10', 'Tubo: 30 g', 'Sabonete: 75 g'
        uom = "Box"
        desc_lower = p['desc'].lower()
        if 'frasco' in desc_lower or 'ml' in desc_lower or 'xarope' in name.lower() or 'gotas' in name.lower() or 'solu' in desc_lower:
            m_frasco = re.search(r'(frasco\s*:\s*[\d\w\s]+|[\d]+\s*ml)', desc_lower)
            uom = m_frasco.group(0).capitalize() if m_frasco else "Bottle"
        elif 'tubo' in desc_lower or 'creme' in name.lower() or 'gel' in name.lower() or 'pomada' in desc_lower:
            m_tubo = re.search(r'(tubo\s*:\s*[\d\w\s]+|[\d]+\s*g)', desc_lower)
            uom = m_tubo.group(0).capitalize() if m_tubo else "Tube"
        elif 'sabonete' in desc_lower:
            uom = "Bar Soap (75g)"
        elif 'seringa' in name.lower():
            uom = "Box (100 units)"
        elif 'caxinha' in desc_lower:
            m_cax = re.search(r'caxinha\s*:\s*([\d\s*x]+)', desc_lower)
            uom = f"Box {m_cax.group(1).strip()}" if m_cax else "Box"
        elif 'comprimido' in name.lower() or 'cápsula' in name.lower():
            uom = "Box"

        # 5. Determine Therapeutic Category based on clinical / formulation keywords
        cat = "General Medicine"
        full_text = (name + " " + p['desc']).lower()
        if any(w in full_text for w in ['ciprofloxacina', 'cefotaxima', 'ceftriaxona', 'trimetoprima', 'sulfametoxazol', 'antibiótico']):
            cat = "Antibiotics"
        elif any(w in full_text for w in ['paracetamol', 'ibuprofeno', 'diclofenac', 'dolaren', 'analgésico', 'rapidol']):
            cat = "Analgesics & Anti-inflammatory"
        elif any(w in full_text for w in ['artemeter', 'lumefantrina', 'sulfadoxina', 'pirimetamina', 'falcidox', 'co-rimétar', 'malária']):
            cat = "Antimalarials"
        elif any(w in full_text for w in ['albendazol', 'mebendazol', 'pirantel', 'albentel', 'mebox', 'combavers']):
            cat = "Anthelmintics (Desparasitantes)"
        elif any(w in full_text for w in ['clotrimazol', 'candisten', 'mycozema', 'anti-fúngico']):
            cat = "Antifungals (Dermatologia)"
        elif any(w in full_text for w in ['vitamina', 'bioforce', 'becomin', 'oracee', 'dynavit', 'nutrisang', 'ferro', 'complexo']):
            cat = "Vitamins & Nutritional Supplements"
        elif any(w in full_text for w in ['hidróxido de alumíno', 'alaize', 'antiácido', 'gastrointestinal', 'metronidazol', 'metryl']):
            cat = "Gastrointestinal & Antiulcer"
        elif any(w in full_text for w in ['salbutamol', 'bromexina', 'mucoril', 'simba kof', 'expectorante', 'xarope']):
            cat = "Respiratory & Cough"
        elif any(w in full_text for w in ['seringa', 'agulha']):
            cat = "Medical Devices & Consumables"
        elif any(w in full_text for w in ['dioral', 'soro oral', 'reidratação']):
            cat = "Electrolytes & Rehydration"
        elif any(w in full_text for w in ['ciproheptadina', 'apetite', 'apetiplus']):
            cat = "Appetite Stimulants & Tonics"
        elif any(w in full_text for w in ['xilometazolina', 'deconaz', 'gotas nasais']):
            cat = "ENT / Nasal Decongestants"

        # 6. Generate clean standardized SKU
        # Clean alphanumeric code
        words = re.findall(r'[A-Za-z0-9]+', name)
        code_part = "-".join(words[:3]).upper()
        sku = f"ALIS-{code_part}"
        if len(sku) > 25:
            sku = sku[:25]

        cleaned_products.append({
            'sku': sku,
            'name': name,
            'description': p['desc'],
            'category': cat,
            'units_per_carton': units_per_carton,
            'unit_of_measure': uom,
            'unit_price': unit_price,
            'pack_info': p['pack'],
            'carton_info': p['carton']
        })

    # Ensure all SKUs are unique
    seen_skus = {}
    for p in cleaned_products:
        base_sku = p['sku']
        if base_sku in seen_skus:
            seen_skus[base_sku] += 1
            p['sku'] = f"{base_sku}-{seen_skus[base_sku]}"
        else:
            seen_skus[base_sku] = 1

    return cleaned_products

if __name__ == "__main__":
    pdf_path = r"D:\Downloads\Amaldina_PriceList_2026-11-21.pdf"
    prods = parse_amaldina_pdf(pdf_path)
    print(f"Successfully extracted {len(prods)} products from {pdf_path}:")
    for idx, p in enumerate(prods):
        print(f"{idx+1:2d}. [{p['sku']:18s}] {p['name']:32s} | {p['category']:30s} | Ctn: {p['units_per_carton']:4d} | Price: {p['unit_price']:8.2f} AOA")
    
    with open("backend/app/db/amaldina_products.json", "w", encoding="utf-8") as f:
        json.dump(prods, f, ensure_ascii=False, indent=2)
    print("\nSaved extracted catalog to backend/app/db/amaldina_products.json!")
