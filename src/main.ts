import './style.css'
import './quick.css'
import { compareVersions, devicesFromCsv, isComparableVersion, validateCatalog } from './lib'
import type { Catalog, Firmware } from './types'

const main = document.querySelector<HTMLElement>('#main')!
let catalog: Catalog

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!))
const productCard = (p: Firmware) => `<article class="card">
  <div class="card-head"><span class="pill">${esc(p.category)}</span>${p.critical ? '<span class="critical">중요 업데이트</span>' : ''}</div>
  <h3>${esc(p.model)}</h3><p class="family">${esc(p.family)}</p>
  <dl><div><dt>최신 버전</dt><dd>${esc(p.version)}</dd></div><div><dt>출시일</dt><dd>${esc(p.releasedAt)}</dd></div></dl>
  <div class="actions"><a class="primary" href="${esc(p.downloadUrl)}" rel="noopener noreferrer">펌웨어 받기</a>${p.releaseNotesUrl ? `<a href="${esc(p.releaseNotesUrl)}" rel="noopener noreferrer">릴리스 노트</a>` : ''}</div>
</article>`

function renderCatalog() {
  main.innerHTML = `<section class="hero"><p class="eyebrow">Firmware support</p><h1>장비 펌웨어 확인</h1><p>모델명과 설치 버전을 입력해 업데이트 여부를 바로 확인하세요.</p><form id="quick-check" class="quick-check"><label><span>모델명</span><input name="model" required placeholder="DR-6316PS"></label><label><span>현재 버전</span><input name="version" required placeholder="3.1.0"></label><button class="primary" type="submit">버전 비교</button></form><div id="quick-result" class="quick-result" aria-live="polite"></div></section>
  <section class="content" aria-labelledby="catalog-title"><div class="section-title"><div><h2 id="catalog-title">펌웨어 카탈로그</h2><p>${catalog.products.length}개 모델</p></div><label class="search"><span class="sr-only">카탈로그 검색</span><input id="search" type="search" placeholder="예: DR-6316, NVR, 카메라" autocomplete="off"></label></div><div id="cards" class="cards"></div></section>`
  const cards = document.querySelector('#cards')!
  const draw = (q = '') => { const key = q.toLowerCase(); const found = catalog.products.filter(p => `${p.model} ${p.family} ${p.category}`.toLowerCase().includes(key)); cards.innerHTML = found.map(productCard).join('') || '<p class="empty">일치하는 모델이 없습니다.</p>' }
  draw(); document.querySelector<HTMLInputElement>('#search')!.addEventListener('input', e => draw((e.target as HTMLInputElement).value))
  document.querySelector<HTMLFormElement>('#quick-check')!.addEventListener('submit', e => {
    e.preventDefault(); const values = new FormData(e.currentTarget as HTMLFormElement); const model = String(values.get('model') ?? ''); const version = String(values.get('version') ?? ''); const latest = catalog.products.find(p => p.model.toLowerCase() === model.trim().toLowerCase())
    const status = !latest || !isComparableVersion(version) || !isComparableVersion(latest.version) ? '확인 불가' : compareVersions(version, latest.version) < 0 ? '업데이트 필요' : '최신'
    document.querySelector('#quick-result')!.innerHTML = `<strong>${esc(status)}</strong>${latest ? ` · 최신 권장 버전 ${esc(latest.version)}` : ' · 카탈로그에 없는 모델입니다.'}`
  })
}

function renderBulk() {
  main.innerHTML = `<section class="page"><p class="eyebrow">Fleet check</p><h1>Dashboard CSV 비교</h1><p class="lede">장비 목록을 브라우저 안에서만 처리합니다. 파일은 서버로 전송되지 않습니다.</p><div class="panel"><label class="drop" for="csv"><strong>CSV 파일 선택</strong><span>model, currentVersion 열이 필요합니다.</span><input id="csv" type="file" accept=".csv,text/csv"></label><div id="bulk-result" aria-live="polite"></div></div></section>`
  document.querySelector<HTMLInputElement>('#csv')!.addEventListener('change', async e => {
    const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
    const out = document.querySelector('#bulk-result')!
    try {
      const devices = devicesFromCsv(await file.text())
      out.innerHTML = `<div class="table-wrap"><table><caption>${devices.length}대 비교 결과</caption><thead><tr><th>모델</th><th>설치 버전</th><th>최신 버전</th><th>상태</th></tr></thead><tbody>${devices.map(d => { const latest = catalog.products.find(p => p.model.toLowerCase() === d.model.toLowerCase()); const status = !latest || !isComparableVersion(d.currentVersion) || !isComparableVersion(latest.version) ? '확인 불가' : compareVersions(d.currentVersion, latest.version) < 0 ? '업데이트 필요' : '최신'; return `<tr><th>${esc(d.model)}</th><td>${esc(d.currentVersion)}</td><td>${esc(latest?.version ?? '-')}</td><td><span class="status ${status === '업데이트 필요' ? 'warn' : ''}">${status}</span></td></tr>` }).join('')}</tbody></table></div>`
    } catch (err) { out.innerHTML = `<p class="error" role="alert">${esc((err as Error).message)}</p>` }
  })
}

function renderAdmin() {
  main.innerHTML = `<section class="page"><p class="eyebrow">Catalog management</p><h1>카탈로그 변경안 만들기</h1><p class="lede">입력값은 검토용 JSON으로 내려받습니다. GitHub에서 branch와 pull request를 만들어 승인 후 반영하세요.</p><form id="admin" class="panel form-grid"><label>모델명<input name="model" required></label><label>제품군<input name="family" required></label><label>카테고리<input name="category" required></label><label>버전<input name="version" required pattern="v?[0-9][0-9A-Za-z._+-]*" placeholder="1.2.3"></label><label>출시일<input name="releasedAt" type="date" required></label><label>다운로드 URL<input name="downloadUrl" type="url" required placeholder="https://"></label><label class="wide">릴리스 노트<textarea name="releaseNotes" required rows="3"></textarea></label><label class="wide">릴리스 노트 URL<input name="releaseNotesUrl" type="url" placeholder="https://"></label><label class="check wide"><input name="critical" type="checkbox"> 중요 보안 업데이트</label><button class="primary wide" type="submit">검토용 JSON 내려받기</button></form></section>`
  document.querySelector<HTMLFormElement>('#admin')!.addEventListener('submit', e => {
    e.preventDefault(); const data = new FormData(e.currentTarget as HTMLFormElement); const item = Object.fromEntries(data.entries()) as Record<string, string>
    const now = new Date().toISOString(); const existing = catalog.products.find(p => p.model.toLowerCase() === item.model.toLowerCase())
    const payload: { operation: string; baseSchemaVersion: string; product: Record<string, string | boolean> } = { operation: 'upsert', baseSchemaVersion: catalog.schemaVersion, product: { ...item, critical: data.has('critical'), createdAt: existing?.createdAt ?? now, updatedAt: now } }
    if (!item.releaseNotesUrl) delete payload.product.releaseNotesUrl
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'})); a.download = `firmware-${item.model}-proposal.json`; a.click(); URL.revokeObjectURL(a.href)
  })
}

const views: Record<string, () => void> = { catalog: renderCatalog, bulk: renderBulk, admin: renderAdmin }
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.nav-button').forEach(x => x.classList.remove('active')); b.classList.add('active'); views[b.dataset.view!]() }))

async function start() {
  try { const response = await fetch('./catalog/v1/firmware.json'); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data: unknown = await response.json(); if (!validateCatalog(data)) throw new Error('지원하지 않는 카탈로그 형식입니다.'); catalog = data; document.querySelector('#updated')!.textContent = `데이터 기준 ${catalog.generatedAt.slice(0, 10)}`; renderCatalog() }
  catch (err) { main.innerHTML = `<section class="page"><h1>카탈로그를 불러오지 못했습니다.</h1><p class="error">${esc((err as Error).message)}</p></section>` }
}
start()
