export const printThermalReceipt = (invoice: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const date = new Date(invoice.created_at);
  const formattedDate = date.toLocaleDateString('en-GB').replace(/\//g, '-');
  const formattedTime = date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const items = invoice.invoice_items || invoice.items || [];
  const services = invoice.extra_services || invoice.services || [];

  const itemsHtml = items
    .map(
      (it: any) => `
    <div class="item-row">
      <div class="item-name">${it.product_name}<br/><span class="variant-text">${it.variant_name || ''}</span></div>
      <div class="item-qty">${it.quantity}</div>
      <div class="item-price">${Math.round(it.sale_price * it.quantity)}</div>
    </div>
  `
    )
    .join('');

  const servicesHtml = services
    .map(
      (ser: any) => `
    <div class="item-row">
      <div class="item-name">${ser.name || ser.product_name}<br/><span class="variant-text">خدمة إضافية</span></div>
      <div class="item-qty">${ser.quantity}</div>
      <div class="item-price">${Math.round(ser.sale_price * ser.quantity)}</div>
    </div>
  `
    )
    .join('');

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>فاتورة #${invoice.id}</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&display=swap" rel="stylesheet">

  <style>
    * { box-sizing: border-box; color:#000 !important; -webkit-print-color-adjust: exact; }
    body{
      font-family:"Cairo",Tahoma,Arial,sans-serif !important;
      width:38mm; margin:0 auto; padding:1mm 0;
      font-size:11px; line-height:1.35;
      font-weight:800; direction:rtl; unicode-bidi:plaintext;
      text-rendering:geometricPrecision; -webkit-font-smoothing:none;
      background:#fff;
    }
    .center{text-align:center;}
    .bold{font-weight:900;}
    .divider{border-top:2px solid #000; margin:4px 0; width:100%;}
    .header-title{font-size:15px; border:2.5px solid #000; padding:3px; width:95%; display:inline-block; font-weight:900;}

    .item-row{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; border-bottom:1.5px solid #000; padding-bottom:2px; width:100%;}
    .item-row:last-child{border-bottom:none;}
    .item-name{flex:2.5; text-align:right; font-weight:900; font-size:11px;}
    .variant-text{display:block; font-size:9px; font-weight:800;}
    .item-qty{flex:0.5; text-align:center; font-size:12px; font-weight:900;}
    .item-price{flex:1; text-align:left; font-size:12px; font-weight:900;}

    .total-section{margin-top:6px; border-top:2.5px solid #000; padding-top:3px;}
    .total-row{display:flex; justify-content:space-between; margin-bottom:2px; font-size:11px; font-weight:900;}
    .grand-total{font-size:15px; border-top:2px dashed #000; padding-top:4px; margin-top:4px; font-weight:900;}

    .footer{font-size:10px; margin-top:10px; border:2px solid #000; padding:4px; font-weight:900;}
    @media print{ body{width:38mm;} }
  </style>
</head>
<body>
  <div class="center">
    <div class="header-title">Flyyti Mobile</div>
    <div class="bold" style="font-size:12px;">نابلس - رأس العين</div>
    <div class="bold" style="font-size:11px;">عمارة أبو الحيات</div>
    <div dir="ltr" class="bold" style="font-size:14px; margin-top:2px;">0568117126</div>
    <div class="divider"></div>
    <div class="bold">رقم الفاتورة: ${invoice.id}</div>
    <div class="bold">تاريخ: ${formattedDate}</div>
    <div class="bold">وقت: ${formattedTime}</div>
    <div class="divider"></div>
  </div>

  <div class="item-row bold" style="border-bottom:2.5px solid #000; margin-bottom:5px;">
    <div class="item-name">الصنف</div>
    <div class="item-qty">كم</div>
    <div class="item-price">السعر</div>
  </div>

  ${itemsHtml}
  ${servicesHtml}

  <div class="total-section">
    <div class="total-row"><span>المجموع:</span><span>${Math.round(invoice.total_amount || 0)} ₪</span></div>
    ${
      invoice.discount > 0
        ? `<div class="total-row"><span>الخصم:</span><span>${Math.round(invoice.discount)} ₪</span></div>`
        : ''
    }
    <div class="total-row grand-total"><span>الإجمالي:</span><span>${Math.round(invoice.net_amount || 0)} ₪</span></div>
  </div>

  <div class="center footer">
    شكرًا لزيارتكم ❤
    <div style="font-size:9px;margin-top:4px;">الإستبدال خلال 24 ساعة بشرط وجود كرتونة المنتج</div>
  </div>

  <script>
    async function doPrint(){
      try{
        if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
        setTimeout(()=>{ window.print(); setTimeout(()=>window.close(),700); },200);
      }catch(e){
        window.print(); setTimeout(()=>window.close(),700);
      }
    }
    window.onload = doPrint;
  </script>
</body>
</html>
  `);

  printWindow.document.close();
};

export const printWarrantyReceipt = (purchases: any[], serialIndex: number = 100001) => {
  if (!purchases || purchases.length === 0) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const first = purchases[0];
  const date = new Date(first.purchase_date);
  const formattedDate = date.toLocaleDateString('en-GB').replace(/\//g, '-');
  const mflyId = `Mfly${serialIndex}`;
  const totalValue = purchases.reduce((sum, p) => sum + Number(p.purchase_price || 0), 0);

  const devicesHtml = purchases
    .map(
      (p: any) => `
    <div class="device-entry">
      <div class="device-main">
        <span class="device-model">${p.phone_model}</span>
        <span class="device-price">${Math.round(p.purchase_price)} ₪</span>
      </div>
      <div class="device-sub">سعة: ${p.storage_capacity} | IMEI: ${p.imei1 || '---'}</div>
    </div>
  `
    )
    .join('');

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>كفالة - ${first.customer_name}</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&display=swap" rel="stylesheet">

  <style>
    *{ box-sizing:border-box; color:#000 !important; -webkit-print-color-adjust:exact; }
    body{
      font-family:"Cairo",Tahoma,Arial,sans-serif !important;
      width:38mm; margin:0 auto; padding:1mm 0;
      font-size:11px; line-height:1.35; font-weight:800;
      direction:rtl; unicode-bidi:plaintext;
      text-rendering:geometricPrecision; -webkit-font-smoothing:none;
      background:#fff;
    }
    .center{text-align:center;}
    .bold{font-weight:900;}

    .header-title{font-size:14px; border:2.5px solid #000; padding:3px; width:95%; display:inline-block; font-weight:900;}
    .subtitle{font-size:12px; border-bottom:2px solid #000; padding-bottom:2px; margin-bottom:5px; font-weight:900; display:block;}
    .mfly-serial{font-size:13px; font-weight:900; border:2px solid #000; display:inline-block; padding:3px 10px; margin:5px 0;}

    .section-box{border:1.5px solid #000; margin-bottom:6px; padding:4px;}
    .section-title{font-size:10px; font-weight:900; background:#000; color:#fff !important; padding:2px 5px; display:inline-block; margin-bottom:4px;}
    .info-row{display:flex; justify-content:space-between; margin-bottom:3px; border-bottom:0.5px solid #eee;}
    .info-label{font-weight:900; font-size:10px;}
    .info-value{font-size:11px; font-weight:900;}

    .device-entry{border-bottom:1px solid #000; padding:5px 0;}
    .device-entry:last-child{border-bottom:none;}
    .device-main{display:flex; justify-content:space-between; align-items:center;}
    .device-model{font-size:10.5px; font-weight:900; flex:1; text-align:right;}
    .device-price{font-size:11px; font-weight:900; margin-right:5px; white-space:nowrap;}
    .device-sub{font-size:9px; font-weight:800; margin-top:2px; opacity:0.95;}

    .total-box{background:#000; color:#fff !important; padding:6px; margin:8px 0;}
    .total-flex{display:flex; justify-content:space-between; align-items:center; font-size:14px; font-weight:900;}
    .total-box *{color:#fff !important;}

    .warranty-terms{font-size:9px; line-height:1.3; border:1.5px solid #000; padding:5px; font-weight:900; background:#f9f9f9;}
    .signature-area{margin-top:45px; display:flex; justify-content:space-between; font-size:10px; padding:0 5px;}
    .sig-block{width:45%; text-align:center;}
    .sig-line{border-top:2px solid #000; margin-bottom:5px;}
    .sig-text{font-weight:900; font-size:9px;}

    @media print { body{width:38mm;} }
  </style>
</head>
<body>
  <div class="center">
    <div class="header-title bold">Flyyti Mobile</div>
    <div class="subtitle bold">سند بيع وكفالة أجهزة</div>
    <div class="mfly-serial">${mflyId}</div>
    <div class="bold" style="font-size:10px;">تاريخ: ${formattedDate}</div>
  </div>

  <div class="section-box">
    <div class="section-title">بيانات الزبون</div>
    <div class="info-row"><span class="info-label">الاسم:</span><span class="info-value">${first.customer_name}</span></div>
    <div class="info-row"><span class="info-label">الهاتف:</span><span class="info-value" dir="ltr">${first.phone_number}</span></div>
  </div>

  <div class="section-box">
    <div class="section-title">الأجهزة المباعة</div>
    ${devicesHtml}
  </div>

  <div class="total-box">
    <div class="total-flex"><span>الإجمالي:</span><span>${Math.round(totalValue)} ₪</span></div>
  </div>

  <div class="warranty-terms center">
    تغطي الكفالة عيوب التصنيع فقط. لا تشمل الكسر أو السوائل أو سوء الاستخدام.
  </div>

  <div class="signature-area">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-text">توقيع الزبون</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-text">ختم الإدارة</div>
    </div>
  </div>

  <script>
    async function doPrint(){
      try{
        if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
        setTimeout(()=>{ window.print(); setTimeout(()=>window.close(),700); },200);
      }catch(e){
        window.print(); setTimeout(()=>window.close(),700);
      }
    }
    window.onload = doPrint;
  </script>
</body>
</html>
  `);

  printWindow.document.close();
};
