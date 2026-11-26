(() => {
  const links = Array.from(document.querySelectorAll('.masonry-gallery a'));
  const grid = document.querySelector('.masonry-gallery');
  if (grid && links.length && 'ResizeObserver' in window) {
    grid.classList.add('balanced-masonry');
    let previousWidth = -1;
    const layout = () => {
      const width = grid.clientWidth;
      if (!width || width === previousWidth) return;
      previousWidth = width;
      const columns = window.matchMedia('(max-width: 830px)').matches ? 2 : 3;
      const gap = window.matchMedia('(max-width: 640px)').matches ? 8 : 12;
      const columnWidth = (width - gap * (columns - 1)) / columns;
      grid.style.gridTemplateColumns = 'repeat(' + columns + ', minmax(0, 1fr))';
      grid.style.columnGap = gap + 'px';
      const heights = Array(columns).fill(1);
      for (const link of links) {
        const img = link.querySelector('img');
        const ratio = Number(img.getAttribute('height')) / Number(img.getAttribute('width'));
        const span = Math.max(1, Math.ceil(columnWidth * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1) + gap));
        const col = heights.indexOf(Math.min(...heights));
        link.style.gridColumn = String(col + 1);
        link.style.gridRow = heights[col] + ' / span ' + span;
        heights[col] += span;
      }
    };
    layout();
    new ResizeObserver(layout).observe(grid);
  }
  if (!links.length || !('showModal' in HTMLDialogElement.prototype)) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-viewer';
  dialog.setAttribute('aria-label','Full screen photograph viewer');
  dialog.innerHTML = '<div class="viewer-top"><span class="viewer-count" aria-live="polite"></span><button class="viewer-close" aria-label="Close viewer">×</button></div><div class="viewer-stage"><button class="viewer-prev" aria-label="Previous photograph">‹</button><img alt=""><button class="viewer-next" aria-label="Next photograph">›</button></div><div class="viewer-caption"></div>';
  document.body.append(dialog);
  const image = dialog.querySelector('img');
  let current = 0, opener, startX = null, startY = null, oldOverflow = '';
  function show(index) {
    current = (index + links.length) % links.length;
    const link = links[current], thumb = link.querySelector('img');
    image.alt = thumb.alt;
    image.src = link.href;
    image.srcset = thumb.srcset;
    image.sizes = '100vw';
    dialog.querySelector('.viewer-count').textContent = (current + 1) + ' / ' + links.length;
    dialog.querySelector('.viewer-caption').textContent = thumb.alt;
  }
  links.forEach((link,i) => link.addEventListener('click', e => {
    if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); opener = link; show(i); oldOverflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden'; dialog.querySelector('.viewer-close').focus();
  }));
  dialog.querySelector('.viewer-close').onclick = () => dialog.close();
  dialog.querySelector('.viewer-prev').onclick = () => show(current-1);
  dialog.querySelector('.viewer-next').onclick = () => show(current+1);
  dialog.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault(); show(current+(e.key==='ArrowLeft'?-1:1));}
  });
  const stage = dialog.querySelector('.viewer-stage');
  stage.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
  stage.addEventListener('touchend',e=>{
    if(startX===null)return;
    const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy))show(current+(dx<0?1:-1));
    startX=startY=null;
  },{passive:true});
  dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;image.removeAttribute('srcset');image.removeAttribute('src');opener?.focus();});
})();