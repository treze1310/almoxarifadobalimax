/**
 * site-data.js — Balimax Engenharia
 * Lê os dados do Supabase (com fallback para localStorage) e aplica
 * no DOM de qualquer página pública marcada com data-sd="*".
 */
(async function () {
  const SB_URL = 'https://jvifhfasxvvkqjgckewq.supabase.co';
  const SB_KEY = 'sb_publishable_UF-zyQUCmG6PA3v2vgMVhw_l1HfL0Fx';
  let D;

  /* ---- Carrega dados do Supabase ---- */
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/site_config?key=eq.balimax_site_data&select=value`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const rows = await res.json();
    if (rows && rows[0] && rows[0].value) {
      D = rows[0].value;
      localStorage.setItem('balimax_site_data', JSON.stringify(D));
    }
  } catch (e) {}

  /* ---- Fallback para localStorage ---- */
  if (!D) {
    const raw = localStorage.getItem('balimax_site_data');
    if (raw) try { D = JSON.parse(raw); } catch (e) {}
  }

  if (!D) return;

  /* ---- helpers ---- */
  function $all(sel)            { return document.querySelectorAll('[data-sd="' + sel + '"]'); }
  function txt(sel, val)        { if (val == null) return; $all(sel).forEach(el => el.textContent = val); }
  function htm(sel, val)        { if (val == null) return; $all(sel).forEach(el => el.innerHTML   = val); }
  function atr(sel, a, val)     { if (!val)        return; $all(sel).forEach(el => el.setAttribute(a, val)); }
  function src(sel, val)        { atr(sel, 'src',  val); }
  function href(sel, val)       { atr(sel, 'href', val); }

  /* ---- CABEÇALHO (todas as páginas) ---- */
  const cab = D.cabecalho || {};
  if (cab.logoData) src('logo', cab.logoData);
  txt('nav-cta',  cab.ctaLabel);
  href('nav-cta', cab.ctaUrl);

  /* ---- REDES SOCIAIS ---- */
  const r = D.redes || {};
  if (r.instagram) { href('social-instagram', r.instagram); href('foot-instagram', r.instagram); }
  if (r.facebook)  { href('social-facebook',  r.facebook);  href('foot-facebook',  r.facebook);  }
  if (r.whatsapp)  { href('social-whatsapp',  r.whatsapp);  href('foot-whatsapp',  r.whatsapp);  }
  if (r.linkedin)  href('social-linkedin', r.linkedin);
  if (r.youtube)   href('social-youtube',  r.youtube);

  /* ---- HOME — Hero ---- */
  const h = D.home || {};
  txt('hero-badge',  h.badge);
  htm('hero-title',  h.heroTitle);
  txt('hero-sub',    h.heroSub);
  txt('cta1',        h.cta1Label);  href('cta1', h.cta1Url);
  txt('cta2',        h.cta2Label);  href('cta2', h.cta2Url);
  if (h.videoUrl) {
    $all('hero-video').forEach(el => {
      el.setAttribute('src', h.videoUrl);
      el.closest('video') && el.closest('video').load();
    });
  }

  /* ---- HOME — Stats ---- */
  (h.stats || []).forEach((s, i) => {
    $all('stat-' + i).forEach(el => {
      el.dataset.target = s.val;
      el.dataset.suffix = s.suf || '';
    });
    txt('stat-label-' + i, s.label);
    txt('stat-sub-'   + i, s.sub);
  });

  /* ---- HOME — Seção História ---- */
  txt('hist-title', h.histTitle);
  txt('hist-text',  h.histText);
  if (h.histImgData) src('hist-img', h.histImgData);
  else if (h.histImg) src('hist-img', h.histImg);

  /* ---- PARCEIROS / CLIENTES ---- */
  const parceiros = (D.parceiros || []).filter(p => p.ativo !== false);
  const parGrid = document.querySelector('[data-sd="parceiros-grid"]');
  if (parGrid && parceiros.length) {
    parGrid.innerHTML = parceiros.map(p => {
      const imgSrc = p.logoData || p.logo;
      const inner = imgSrc
        ? `<img src="${imgSrc}" alt="${p.nome}" style="height:80px;width:auto;max-width:160px;object-fit:contain;filter:grayscale(30%);transition:filter .2s;" onmouseover="this.style.filter='grayscale(0%)'" onmouseout="this.style.filter='grayscale(30%)'">`
        : `<span class="font-display font-bold text-base text-gray-600 group-hover:text-brand-blue transition-colors tracking-wide text-center">${p.nome}</span>`;
      const isLink = p.link && p.link !== '#';
      return isLink
        ? `<a href="${p.link}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center group opacity-80 hover:opacity-100 transition-opacity">${inner}</a>`
        : `<div class="flex items-center justify-center group opacity-80 hover:opacity-100 transition-opacity">${inner}</div>`;
    }).join('');
  }

  /* ---- WHATSAPP (botão flutuante + links) ---- */
  const ct = D.contato || {};
  if (ct.whatsappNum) {
    const waUrl = 'https://wa.me/' + ct.whatsappNum +
      (ct.whatsappMsg ? '?text=' + encodeURIComponent(ct.whatsappMsg) : '');
    href('wa-float', waUrl);
    href('wa-link',  waUrl);
  }

  /* ---- RODAPÉ (todas as páginas) ---- */
  const rod = D.rodape || {};
  txt('foot-desc',  rod.descricao);
  txt('foot-cnpj',  rod.cnpj ? 'CNPJ: ' + rod.cnpj : null);
  htm('foot-copy',  rod.copyright);
  if (rod.links && rod.links.length) {
    const dot = '<span class="w-1.5 h-1.5 rounded-full bg-brand-orange inline-block flex-shrink-0"></span>';
    htm('foot-links', rod.links.map(l =>
      '<li><a href="' + l.url + '" class="text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm">' +
      dot + l.label + '</a></li>'
    ).join(''));
  }

  /* ---- RODAPÉ — Contato ---- */
  if (ct.email) {
    htm('foot-email',
      '<a href="mailto:' + ct.email + '" class="hover:text-white transition-colors">' + ct.email + '</a>');
  }
  if (ct.endereco) txt('foot-address', ct.endereco);
  if (ct.telefones && ct.telefones.length) {
    htm('foot-phones', ct.telefones.map(t =>
      '<a href="tel:' + t.num.replace(/\D/g, '') + '" class="block hover:text-white transition-colors">' +
      t.num + (t.tipo ? ' (' + t.tipo + ')' : '') + '</a>'
    ).join(''));
  }

  /* ---- PÁGINA CONTATO ---- */
  txt('ct-hero-title', ct.heroTitle);
  txt('ct-intro',      ct.introText);

  /* ---- PÁGINA QUEM SOMOS ---- */
  const qs = D.quemsomos || {};
  txt('qs-hero-kicker', qs.heroKicker);
  txt('qs-hero-title',  qs.heroTitle);
  txt('qs-hero-sub',    qs.heroSub);
  txt('qs-hist-kicker', qs.histKicker);
  txt('qs-sec-title',   qs.secTitle);
  txt('qs-text1',       qs.texto1);
  txt('qs-text2',       qs.texto2);
  /* stats counters */
  (qs.stats||[]).forEach((s,i) => {
    txt('qs-stat-'+i,       (s.val||'') + (s.suf||''));
    txt('qs-stat-label-'+i, s.label);
  });
  txt('qs-essencia-kicker', qs.nossaEssenciaTitle);
  txt('qs-mvv-title',       qs.mvvTitle);
  txt('qs-missao',          qs.missao);
  txt('qs-visao',           qs.visao);
  if (qs.mainImgData) src('qs-img', qs.mainImgData);
  else if (qs.mainImg) src('qs-img', qs.mainImg);
  /* CTA final */
  txt('qs-cta-title',  qs.ctaFinalTitle);
  txt('qs-cta-text',   qs.ctaFinalText);
  if (qs.ctaBtn1Label) txt('qs-cta-btn1', qs.ctaBtn1Label);
  if (qs.ctaBtn1Url)   href('qs-cta-btn1', qs.ctaBtn1Url);
  if (qs.ctaBtn2Label) txt('qs-cta-btn2', qs.ctaBtn2Label);
  if (qs.ctaBtn2Url)   href('qs-cta-btn2', qs.ctaBtn2Url);
  /* ---- QUEM SOMOS — Corpo Técnico ---- */
  txt('qs-ct-kicker', qs.corpoTecnicoKicker);
  txt('qs-ct-title',  qs.corpoTecnicoTitle);
  txt('qs-ct-sub',    qs.corpoTecnicoSub);
  const ctGrid = document.querySelector('[data-sd="corpo-tecnico-grid"]');
  if (ctGrid && qs.corpoTecnico && qs.corpoTecnico.length) {
    const ctIconPaths = {
      graduate: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5',
      shield:   'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z',
      tool:     'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
      search:   'm21 21-4.34-4.34M11 11m-8 0a8 8 0 1016 0 8 8 0 00-16 0',
      zap:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      users:    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z',
      book:     'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
    };
    ctGrid.innerHTML = qs.corpoTecnico.map(c => {
      const d = ctIconPaths[c.icon] || ctIconPaths.shield;
      return `<div class="bg-white rounded-lg shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
        <div class="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-brand-blue" aria-hidden="true"><path d="${d}"/></svg>
        </div>
        <h4 class="font-display font-bold text-lg text-brand-blue mb-2">${c.titulo}</h4>
        <p class="text-gray-600 text-sm leading-relaxed">${c.desc}</p>
      </div>`;
    }).join('');
  }

  if (qs.valores) {
    const vals = qs.valores.split(',').map(v => v.trim()).filter(Boolean);
    htm('qs-valores', vals.map(v =>
      '<li class="flex items-center gap-2">' +
      '<span class="w-1.5 h-1.5 rounded-full bg-brand-orange flex-shrink-0 inline-block"></span>' + v + '</li>'
    ).join(''));
  }

  /* ---- PÁGINA ATIVIDADES ---- */
  const at = D.atividades || {};
  txt('at-title', at.secTitle);
  txt('at-sub',   at.secSub);
  const atGrid = document.querySelector('[data-sd="at-grid"]');
  if (atGrid && at.servicos && at.servicos.length) {
    const iconPaths = {
      shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z',
      zap:    'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      search: 'm21 21-4.34-4.34M11 11m-8 0a8 8 0 1016 0 8 8 0 00-16 0',
      tool:   'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
      book:   'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
    };
    atGrid.innerHTML = at.servicos.map(s => {
      const d = iconPaths[s.icon] || iconPaths.shield;
      return `<div class="activity-card rounded-lg border border-white/10 bg-white/5 group cursor-pointer">
        <div class="p-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 text-brand-orange mb-6 group-hover:scale-110 transition-transform" aria-hidden="true"><path d="${d}"/></svg>
          <h4 class="font-display font-bold text-xl mb-4 text-white">${s.titulo}</h4>
          <p class="text-blue-200 text-sm leading-relaxed mb-6">${s.desc}</p>
          <a href="atividades.html" class="inline-flex items-center text-sm font-semibold text-brand-orange group-hover:text-white transition-colors">Ver detalhes <svg xmlns="http://www.w3.org/2000/svg" class="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
        </div>
      </div>`;
    }).join('');
  }

  /* ---- PÁGINA PORTFOLIO ---- */
  const pf = D.portfolio || {};
  txt('pf-title', pf.secTitle);
  const pfGrid = document.querySelector('[data-sd="pf-grid"]');
  if (pfGrid && pf.projetos && pf.projetos.length) {
    pfGrid.innerHTML = pf.projetos.map(pr => `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
        <div class="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
          ${pr.imgData
            ? `<img src="${pr.imgData}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${pr.titulo}">`
            : `<div class="flex flex-col items-center gap-2 text-gray-300"><svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`}
        </div>
        <div class="p-6">
          <span class="text-xs font-bold text-brand-orange uppercase tracking-wide">${pr.cat}</span>
          <h3 class="font-display font-bold text-lg text-brand-blue mt-1 mb-2">${pr.titulo}</h3>
          <p class="text-xs text-gray-400 mb-3">${pr.local} &bull; ${pr.norma}</p>
          <p class="text-sm text-gray-600 leading-relaxed">${pr.desc}</p>
        </div>
      </div>`).join('');
  }

})();
