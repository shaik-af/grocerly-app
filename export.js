// Export utilities: only checked items from nonempty sections are included.
(function () {
  'use strict';

  function groupedSelections(data) {
    return data.sections
      .map(section => ({
        name: section.name,
        items: data.items.filter(item => item.sectionId === section.id && item.done)
      }))
      .filter(section => section.items.length > 0);
  }

  function asText(groups) {
    return groups.map(section =>
      section.name + '\n' + section.items.map(item => '• ' + item.name).join('\n')
    ).join('\n\n');
  }

  async function copyText(groups) {
    const value = asText(groups);
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      document.body.append(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      return copied;
    }
  }

  function imageCanvas(groups) {
    const width = 720;
    const rowHeight = 38;
    const headingHeight = 43;
    const lineCount = groups.reduce((sum, section) => sum + section.items.length + 1, 0);
    const height = Math.max(100, 64 + lineCount * rowHeight + groups.length * 12);
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    let y = 38;
    for (const section of groups) {
      context.fillStyle = '#173d87';
      context.font = 'bold 22px Arial';
      context.fillText(section.name, 40, y);
      y += headingHeight;
      for (const item of section.items) {
        context.fillStyle = '#172b4d';
        context.font = '18px Arial';
        let label = item.name;
        while (context.measureText('• ' + label).width > 580 && label.length > 1) {
          label = label.slice(0, -2) + '…';
        }
        context.fillText('• ' + label, 40, y - 2);
        y += rowHeight;
      }
      y += 12;
    }
    return canvas;
  }

  function saveImage(groups) {
    return new Promise((resolve, reject) => {
      imageCanvas(groups).toBlob(blob => {
        if (!blob) return reject(new Error('Image generation failed'));
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'grocerly-list.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        resolve();
      }, 'image/png');
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function savePdf(groups) {
    const popup = window.open('', '_blank');
    if (!popup) return false;

    const sections = groups.map(section => {
      const rows = section.items.map(item =>
        `<div class="item">• ${escapeHtml(item.name)}</div>`
      ).join('');
      return `<section><h2>${escapeHtml(section.name)}</h2>${rows}</section>`;
    }).join('');

    // No nested script tag: this HTML is written into the print window only.
    const printDocument = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Grocery List</title>
<style>
  body { font-family: Arial, sans-serif; color: #172b4d; margin: 0; padding: 18px 28px; }
  section { margin: 0 0 23px; break-inside: avoid; }
  h2 { font-size: 19px; color: #173d87; margin: 0 0 13px; }
  .item { padding: 7px 0; font-size: 15px; break-inside: avoid; }
  @page { margin: 15mm; }
</style></head><body>${sections}</body></html>`;

    popup.document.open();
    popup.document.write(printDocument);
    popup.document.close();
    setTimeout(() => { popup.focus(); popup.print(); }, 450);
    return true;
  }

  window.GrocerlyExport = { groupedSelections, copyText, saveImage, savePdf };
})();
