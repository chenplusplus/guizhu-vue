import{Br as e,Di as t,Fr as n,Lr as r,Nr as i,Or as a,Pr as o,Si as s,Vr as c,ci as l,ha as u,ki as d,n as f,oi as p,qi as m,qr as h,ri as g,ui as _,vi as v}from"./errorMessage-D0FXHcJy.js";import{t as y}from"./_plugin-vue_export-helper-BDNMzG2s.js";import{i as b,r as x}from"./vue-router-VZpBZaA0.js";import{t as S}from"./dict-DhVl1HB8.js";import{t as C}from"./api-B3ZF2141.js";import{r as ee}from"./customer-CkxDLtno.js";var te=e=>C.get(`/repair/by-order/${e}`),ne=e=>C.get(`/repair/${e}`),re=e=>C.post(`/repair`,e),ie=e=>C.put(`/repair`,e);m(),h(),s();var ae={class:`repair-form-container`},oe={class:`card-header no-print`},se={class:`card-title`},ce={class:`card-actions`},le={class:`table-wrap`},w={class:`repair-table main-table`},T={class:`order-field`,colspan:`2`},E={key:0,class:`readonly-value`},D={colspan:`2`,class:`order-field`},O={key:0,class:`readonly-value`},k={colspan:`2`,class:`order-field`},A={key:0,class:`readonly-value`},j={colspan:`2`,class:`order-field`},M={key:0,class:`readonly-value`},N={colspan:`2`,class:`order-field`},P={key:0,class:`readonly-value`},F={class:`order-field`},I={key:0,class:`readonly-value`},L={class:`order-field`},R={key:0,class:`readonly-value`},z={class:`order-field`},B={key:0,class:`readonly-value`},V={key:0,class:`readonly-value`},H={class:`order-field`},U={key:0,class:`readonly-value`},W={class:`order-field`},G={key:0,class:`readonly-value`},ue={class:`order-field`},de={key:0,class:`readonly-value`},fe={class:`order-field`},pe={key:0,class:`readonly-value`},me={colspan:`4`,rowspan:`6`,class:`img-cell`},he={class:`img-group`},ge={class:`img-item`},_e={key:1,class:`preview-img preview-img-empty`},ve={class:`img-item`},ye={key:1,class:`preview-img preview-img-empty`},be={colspan:`6`,class:`label-td note-cell`},xe={colspan:`6`,rowspan:`2`,class:`remark-cell`},K=y({__name:`repair-order`,setup(s){let m=b(),h=x(),y=i(()=>h.params.id&&h.params.id!==`create`),C=i(()=>parseInt(h.query.orderId)||null),K=d([]),q=d([]),J=i(()=>!!$.orderId),Y=i(()=>K.value.find(e=>Number(e.customerId)===Number($.customerId))?.customerName||$.customerId||`-`),X=t({product:``,letter:``}),Se=async()=>{try{let e=await ee({page:1,pageSize:100});e.success&&(K.value=e.data||[])}catch(e){console.error(`获取客户列表失败:`,e)}},Z=d(null),Q=d(!1),$=t({id:null,repairNo:``,orderId:null,customerId:null,productName:``,quantity:1,size:``,color:``,weightRequirement:``,widthThick:null,chainWeight:null,diamondLevel:``,orderDate:``,deliveryDate:``,serialNo:``,hasWaxOut:!1,waxOutTime:``,laborFee:null,mainStoneWeight:null,diamondPrice:null,clasp:``,claspFee:null,mainStoneCount:null,mainStoneLaborFee:null,chainModel:``,moldWeight:null,sideStoneWeight:null,sideStonePrice:null,steelWeight:null,moldFee:null,sideStoneCount:null,sideStoneLaborFee:null,customerStoneWeight:null,customerGoldWeight:null,bezelWeight:null,polishWeight:null,waxOutFee:null,polishOtherFee:null,cncFee:null,note:``,remark:``,remark2:``}),Ce={customerId:[{required:!0,message:`请选择客户`,trigger:`change`}],productName:[{required:!0,message:`请输入品名`,trigger:`blur`}]},we=async()=>{if(y.value)try{let e=await ne(h.params.id);if(e.success){let t=e.data;Object.keys($).forEach(e=>{t[e]!==void 0&&t[e]!==null&&($[e]=t[e])}),t.productImage&&(X.product=t.productImage),t.letterImage&&(X.letter=t.letterImage)}}catch(e){console.error(`加载数据失败:`,e),f.error(`加载数据失败`)}else if(C.value)try{let e=await te(C.value);if(e.success&&e.isNew){let t=e.data;$.orderId=t.orderId||C.value,$.customerId=t.customerId,$.productName=t.productName||``,$.quantity=t.quantity||1,$.size=t.size||``,$.color=t.color||``,$.weightRequirement=t.weightRequirement||``,$.widthThick=t.widthThick?Number(t.widthThick):null,$.chainWeight=t.chainWeight?Number(t.chainWeight):null,$.diamondLevel=t.diamondLevel||``,$.orderDate=t.orderDate||``,$.deliveryDate=t.deliveryDate||``,$.serialNo=t.serialNo||``,$.diamondLevel=t.diamondLevel||``,$.mainStoneWeight=t.mainStoneWeight==null?null:Number(t.mainStoneWeight),$.mainStoneCount=t.mainStoneQty==null?null:Number(t.mainStoneQty),$.mainStoneLaborFee=t.mainStoneSettingFee==null?null:Number(t.mainStoneSettingFee),$.diamondPrice=t.mainStonePrice==null?null:Number(t.mainStonePrice),$.laborFee=t.laborFee==null?null:Number(t.laborFee),X.product=t.productImage||``,X.letter=t.letterImage||``,f.success(`已从订单带入数据`)}else e.success&&!e.isNew&&(f.info(`该订单已有维修单，正在跳转...`),m.push(`/repair/edit/${e.data.id}`))}catch(e){console.error(`加载订单数据失败:`,e)}},Te=async()=>{await Z.value?.validate(async e=>{if(e){Q.value=!0;try{let e={...$};delete e.id,delete e.repairNo,e.productImage=X.product,e.letterImage=X.letter,e.customerName=Y.value||``,e.waxOutTime=e.waxOutTime||null;let t;y.value?(e.id=$.id,t=await ie(e)):t=await re(e),t.success?(f.success(y.value?`保存成功`:`创建成功`),m.push(`/order/factory-list`)):f.error(t.message||`操作失败`)}catch(e){console.error(`提交失败:`,e),f.error(`提交失败`)}finally{Q.value=!1}}})},Ee=()=>m.push(`/order/factory-list`),De=(e,t)=>{let n=e=>Array.from(e.querySelectorAll(`.el-input-number, .el-select, .el-date-editor, .el-checkbox, .el-input, .el-textarea`)).filter(e=>!e.parentElement?.closest(`.el-input-number, .el-select, .el-date-editor, .el-checkbox`)),r=n(e),i=n(t);r.forEach((e,t)=>{let n=i[t];if(!n)return;let r=``;r=e.classList.contains(`el-checkbox`)?e.querySelector(`input`)?.checked?`是`:`否`:e.classList.contains(`el-select`)?e.querySelector(`.el-select__selected-item`)?.textContent?.trim()||e.querySelector(`input`)?.value||``:e.classList.contains(`el-input-number`)||e.matches(`.el-date-editor, .el-input`)?e.querySelector(`input`)?.value||``:e.classList.contains(`el-textarea`)?e.querySelector(`textarea`)?.value||``:e.textContent?.trim()||``;let a=document.createElement(`span`);a.className=`plain-text`,a.textContent=r||`-`,n.replaceWith(a)})},Oe=()=>{let e=document.querySelector(`.form-card`);if(!e){f.error(`找不到打印内容`);return}let t=e.cloneNode(!0);De(e,t);let n=window.open(``,`_blank`,`width=1000,height=1400`);if(!n){f.warning(`请允许浏览器弹出窗口`);return}n.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>维修单打印</title>
        <style>
          @page { size: A4 portrait; margin: 8mm 6mm; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0; padding: 0;
            font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
            font-size: 12px; color: #000; background: #fff;
          }

          /* 隐藏按钮 / 卡片头 / 菜单 */
          .no-print, .el-card__header, .card-header,
          .el-button, .el-pagination, .el-tag {
            display: none !important;
          }
          .el-card { border: none !important; box-shadow: none !important; }
          .el-card__body { padding: 0 !important; }

          /* ===== 表格 ===== */
          table.repair-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          table.repair-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            height: 24px;
            vertical-align: middle;
            font-size: 11px;
            word-break: break-all;
          }
          .label-td {
            text-align: center;
            font-weight: 500;
            white-space: nowrap;
          }
          .title-cell {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 6px;
          }
          .red-text { color: #ff0000 !important; }
          .red-bg {
            background: #ff0000 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .white-text { color: #fff !important; }
          .empty-row td { height: 10px; border: none; }

          /* 订单带出字段红字 */
          .order-field {
            color: #ff0000 !important;
            font-weight: 500;
          }

          /* ===== 纯文本值 ===== */
          .plain-text {
            display: block;
            width: 100%;
            font-size: 11px;
            color: inherit;
            white-space: pre-wrap;
            word-break: break-all;
            min-height: 16px;
          }

          /* ===== 图片 =====
             ⚠️ 打印窗口是新开的空白页，没有引入 Element Plus 的 CSS，
              el-image 内部的 <img> 没有任何尺寸约束 → 按原图尺寸渲染，
              一张图就能占满整页。这里必须把 img 明确锁进小框里。 */
          .img-cell { vertical-align: top; }
          .img-group { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
          .img-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
          .img-label { font-size: 10px; text-align: left; color: #333; }

          .preview-img,
          .preview-img .el-image__inner {
            display: block !important;
            width: 200px !important;
            min-width: 0 !important;
            max-width: 200px !important;
            height: 70px !important;
            max-height: 70px !important;
            object-fit: cover !important;
            overflow: hidden !important;
            border: 1px solid #000;
            background: #fff;
            line-height: 0;
          }
          .preview-img.preview-img-empty {
            display: flex !important;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #999;
            border-color: #000;
          }

          /* ===== 打印表格 ===== */
          .print-gap { height: 0 !important; margin: 0 !important; }
          .print-table .process-header td {
            background: #f0f0f0 !important;
            font-weight: 600;
            text-align: center;
            padding: 2px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-table .process-detail-header td {
            background: #f7f7f7 !important;
            text-align: center;
            padding: 2px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-table .check-row td { height: 18px !important; padding: 0 !important; }
          .print-table .process-row td { height: 22px !important; padding: 1px 3px !important; }

          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>${t.outerHTML}</body>
    </html>
  `),n.document.close(),n.focus(),setTimeout(()=>{n.print(),n.close()},600)};return g(()=>{S.getItemsByKey(`diamondlevel`).then(e=>{q.value=(e?.data||[]).map(e=>({label:e.itemLabel||e.itemValue,value:e.itemValue}))}).catch(()=>{f.error(`加载钻石级别字典失败`)}),Se(),we()}),(t,i)=>{let s=_(`el-button`),d=_(`el-option`),f=_(`el-select`),m=_(`el-input`),h=_(`el-date-picker`),g=_(`el-input-number`),b=_(`el-image`),x=_(`el-form`),S=_(`el-card`);return p(),r(`div`,ae,[c(S,{class:`form-card`,shadow:`never`},{header:v(()=>[o(`div`,oe,[o(`span`,se,u(y.value?`编辑维修单`:`新建维修单`),1),o(`div`,ce,[c(s,{onClick:Ee},{default:v(()=>[...i[38]||=[e(`取消`,-1)]]),_:1}),c(s,{onClick:Oe},{default:v(()=>[...i[39]||=[e(`打印`,-1)]]),_:1}),c(s,{type:`primary`,onClick:Te,loading:Q.value},{default:v(()=>[e(u(y.value?`保存修改`:`确认创建`),1)]),_:1},8,[`loading`])])])]),default:v(()=>[c(x,{ref_key:`formRef`,ref:Z,model:$,rules:Ce,size:`default`},{default:v(()=>[o(`div`,le,[o(`table`,w,[o(`tbody`,null,[o(`tr`,null,[i[40]||=o(`td`,{class:`label-td`},`客户`,-1),o(`td`,T,[J.value?(p(),r(`span`,E,u(Y.value),1)):(p(),n(f,{key:1,modelValue:$.customerId,"onUpdate:modelValue":i[0]||=e=>$.customerId=e,placeholder:`请选择客户`,filterable:``,style:{width:`100%`},size:`small`},{default:v(()=>[(p(!0),r(a,null,l(K.value,e=>(p(),n(d,{key:e.customerId,label:e.customerName,value:e.customerId},null,8,[`label`,`value`]))),128))]),_:1},8,[`modelValue`]))]),i[41]||=o(`td`,{colspan:`4`,class:`title-cell`},`维修单`,-1),i[42]||=o(`td`,{class:`red-text label-td`},`编号`,-1),i[43]||=o(`td`,{colspan:`4`},null,-1)]),o(`tr`,null,[i[44]||=o(`td`,{class:`label-td`},`品名`,-1),o(`td`,D,[J.value?(p(),r(`span`,O,u($.productName||`-`),1)):(p(),n(m,{key:1,modelValue:$.productName,"onUpdate:modelValue":i[1]||=e=>$.productName=e,size:`small`},null,8,[`modelValue`]))]),i[45]||=o(`td`,{class:`label-td`},`订单日期`,-1),o(`td`,k,[J.value?(p(),r(`span`,A,u($.orderDate||`-`),1)):(p(),n(h,{key:1,modelValue:$.orderDate,"onUpdate:modelValue":i[2]||=e=>$.orderDate=e,type:`date`,"value-format":`YYYY-MM-DD`,style:{width:`100%`},size:`small`},null,8,[`modelValue`]))]),i[46]||=o(`td`,{class:`label-td`},`出货日期`,-1),o(`td`,j,[J.value?(p(),r(`span`,M,u($.deliveryDate||`-`),1)):(p(),n(h,{key:1,modelValue:$.deliveryDate,"onUpdate:modelValue":i[3]||=e=>$.deliveryDate=e,type:`date`,"value-format":`YYYY-MM-DD`,style:{width:`100%`},size:`small`},null,8,[`modelValue`]))]),i[47]||=o(`td`,{class:`label-td`},`流水单号：`,-1),o(`td`,N,[J.value?(p(),r(`span`,P,u($.serialNo||`-`),1)):(p(),n(m,{key:1,modelValue:$.serialNo,"onUpdate:modelValue":i[4]||=e=>$.serialNo=e,size:`small`},null,8,[`modelValue`]))])]),o(`tr`,null,[i[48]||=o(`td`,{class:`label-td`},`数量`,-1),o(`td`,F,[J.value?(p(),r(`span`,I,u($.quantity),1)):(p(),n(g,{key:1,modelValue:$.quantity,"onUpdate:modelValue":i[5]||=e=>$.quantity=e,min:1,style:{width:`100%`},size:`small`},null,8,[`modelValue`]))]),i[49]||=o(`td`,{class:`label-td`},`颜色`,-1),o(`td`,L,[J.value?(p(),r(`span`,R,u($.color||`-`),1)):(p(),n(m,{key:1,modelValue:$.color,"onUpdate:modelValue":i[6]||=e=>$.color=e,size:`small`},null,8,[`modelValue`]))]),i[50]||=o(`td`,{class:`label-td`},`宽/厚度`,-1),o(`td`,z,[J.value?(p(),r(`span`,B,u($.widthThick??`-`),1)):(p(),n(g,{key:1,modelValue:$.widthThick,"onUpdate:modelValue":i[7]||=e=>$.widthThick=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`]))]),i[51]||=o(`td`,{class:`label-td`},`出蜡`,-1),o(`td`,null,[J.value?(p(),r(`span`,V,u($.hasWaxOut||`-`),1)):(p(),n(m,{key:1,modelValue:$.hasWaxOut,"onUpdate:modelValue":i[8]||=e=>$.hasWaxOut=e,size:`small`},null,8,[`modelValue`]))]),i[52]||=o(`td`,{class:`red-bg white-text label-td`},`钻石级别`,-1),o(`td`,H,[J.value?(p(),r(`span`,U,u($.diamondLevel||`-`),1)):(p(),n(f,{key:1,modelValue:$.diamondLevel,"onUpdate:modelValue":i[9]||=e=>$.diamondLevel=e,size:`small`,style:{width:`100%`},clearable:``},{default:v(()=>[(p(!0),r(a,null,l(q.value,e=>(p(),n(d,{key:e.value,label:e.label,value:e.value},null,8,[`label`,`value`]))),128))]),_:1},8,[`modelValue`]))]),i[53]||=o(`td`,{class:`red-text label-td`},`工费`,-1),o(`td`,null,[c(g,{modelValue:$.laborFee,"onUpdate:modelValue":i[10]||=e=>$.laborFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[i[54]||=o(`td`,{class:`label-td`},`手寸/长度`,-1),o(`td`,W,[J.value?(p(),r(`span`,G,u($.size||`-`),1)):(p(),n(m,{key:1,modelValue:$.size,"onUpdate:modelValue":i[11]||=e=>$.size=e,size:`small`},null,8,[`modelValue`]))]),i[55]||=o(`td`,{class:`label-td`},`克重要求`,-1),o(`td`,ue,[J.value?(p(),r(`span`,de,u($.weightRequirement||`-`),1)):(p(),n(m,{key:1,modelValue:$.weightRequirement,"onUpdate:modelValue":i[12]||=e=>$.weightRequirement=e,size:`small`},null,8,[`modelValue`]))]),i[56]||=o(`td`,{class:`label-td`},`链重`,-1),o(`td`,fe,[J.value?(p(),r(`span`,pe,u($.chainWeight??`-`),1)):(p(),n(g,{key:1,modelValue:$.chainWeight,"onUpdate:modelValue":i[13]||=e=>$.chainWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`]))]),i[57]||=o(`td`,{class:`label-td`},`出蜡时间`,-1),o(`td`,null,[c(h,{modelValue:$.waxOutTime,"onUpdate:modelValue":i[14]||=e=>$.waxOutTime=e,type:`datetime`,"value-format":`YYYY-MM-DDTHH:mm:ss`,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[58]||=o(`td`,{class:`label-td`},`主石卡重`,-1),o(`td`,null,[c(g,{modelValue:$.mainStoneWeight,"onUpdate:modelValue":i[15]||=e=>$.mainStoneWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[59]||=o(`td`,{class:`label-td`},`钻石价格`,-1),o(`td`,null,[c(g,{modelValue:$.diamondPrice,"onUpdate:modelValue":i[16]||=e=>$.diamondPrice=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[i[60]||=o(`td`,{colspan:`4`,class:`red-text label-td`},`字印要求`,-1),i[61]||=o(`td`,{class:`label-td`},`扣头`,-1),o(`td`,null,[c(m,{modelValue:$.clasp,"onUpdate:modelValue":i[17]||=e=>$.clasp=e,size:`small`},null,8,[`modelValue`])]),i[62]||=o(`td`,{class:`label-td`},`版费`,-1),o(`td`,null,[c(g,{modelValue:$.claspFee,"onUpdate:modelValue":i[18]||=e=>$.claspFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[63]||=o(`td`,{class:`label-td`},`主石粒数`,-1),o(`td`,null,[c(g,{modelValue:$.mainStoneCount,"onUpdate:modelValue":i[19]||=e=>$.mainStoneCount=e,min:0,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[64]||=o(`td`,{class:`label-td`},`主石工费`,-1),o(`td`,null,[c(g,{modelValue:$.mainStoneLaborFee,"onUpdate:modelValue":i[20]||=e=>$.mainStoneLaborFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[o(`td`,me,[o(`div`,he,[o(`div`,ge,[i[65]||=o(`div`,{class:`img-label`},`产品图片`,-1),X.product?(p(),n(b,{key:0,src:X.product,"preview-src-list":[X.product],"preview-teleported":!0,fit:`cover`,class:`preview-img`,alt:`产品图`},null,8,[`src`,`preview-src-list`])):(p(),r(`div`,_e,`暂无图片`))]),o(`div`,ve,[i[66]||=o(`div`,{class:`img-label`},`字印图片`,-1),X.letter?(p(),n(b,{key:0,src:X.letter,"preview-src-list":[X.letter],"preview-teleported":!0,fit:`cover`,class:`preview-img`,alt:`字印图`},null,8,[`src`,`preview-src-list`])):(p(),r(`div`,ye,`暂无图片`))])])]),i[67]||=o(`td`,{class:`label-td`},`链条型号`,-1),o(`td`,null,[c(m,{modelValue:$.chainModel,"onUpdate:modelValue":i[21]||=e=>$.chainModel=e,size:`small`},null,8,[`modelValue`])]),i[68]||=o(`td`,{class:`label-td`},`倒模重`,-1),o(`td`,null,[c(g,{modelValue:$.moldWeight,"onUpdate:modelValue":i[22]||=e=>$.moldWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[69]||=o(`td`,{class:`label-td`},`副石卡重`,-1),o(`td`,null,[c(g,{modelValue:$.sideStoneWeight,"onUpdate:modelValue":i[23]||=e=>$.sideStoneWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[70]||=o(`td`,{class:`label-td`},`副石价格`,-1),o(`td`,null,[c(g,{modelValue:$.sideStonePrice,"onUpdate:modelValue":i[24]||=e=>$.sideStonePrice=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[i[71]||=o(`td`,{class:`label-td`},`钢片重`,-1),o(`td`,null,[c(g,{modelValue:$.steelWeight,"onUpdate:modelValue":i[25]||=e=>$.steelWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[72]||=o(`td`,{class:`label-td`},`倒模工费`,-1),o(`td`,null,[c(g,{modelValue:$.moldFee,"onUpdate:modelValue":i[26]||=e=>$.moldFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[73]||=o(`td`,{class:`label-td`},`副石粒数`,-1),o(`td`,null,[c(g,{modelValue:$.sideStoneCount,"onUpdate:modelValue":i[27]||=e=>$.sideStoneCount=e,min:0,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[74]||=o(`td`,{class:`label-td`},`副石工费`,-1),o(`td`,null,[c(g,{modelValue:$.sideStoneLaborFee,"onUpdate:modelValue":i[28]||=e=>$.sideStoneLaborFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[i[76]||=o(`td`,{class:`label-td`},`客来石重`,-1),o(`td`,null,[c(g,{modelValue:$.customerStoneWeight,"onUpdate:modelValue":i[29]||=e=>$.customerStoneWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),o(`td`,be,[i[75]||=o(`div`,null,`注意：`,-1),c(m,{modelValue:$.note,"onUpdate:modelValue":i[30]||=e=>$.note=e,type:`textarea`,rows:2,size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[i[78]||=o(`td`,{class:`label-td`},`客来金重`,-1),o(`td`,null,[c(g,{modelValue:$.customerGoldWeight,"onUpdate:modelValue":i[31]||=e=>$.customerGoldWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),o(`td`,xe,[i[77]||=o(`div`,{class:`remark-title`},`备注`,-1),c(m,{modelValue:$.remark,"onUpdate:modelValue":i[32]||=e=>$.remark=e,type:`textarea`,rows:5,size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[i[79]||=o(`td`,{class:`label-td`},`贝金托重`,-1),o(`td`,null,[c(g,{modelValue:$.bezelWeight,"onUpdate:modelValue":i[33]||=e=>$.bezelWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])])]),o(`tr`,null,[i[80]||=o(`td`,{class:`label-td`},`磨贝重`,-1),o(`td`,null,[c(g,{modelValue:$.polishWeight,"onUpdate:modelValue":i[34]||=e=>$.polishWeight=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[81]||=o(`td`,{class:`label-td`},`出蜡费`,-1),o(`td`,null,[c(g,{modelValue:$.waxOutFee,"onUpdate:modelValue":i[35]||=e=>$.waxOutFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[82]||=o(`td`,{class:`label-td`},`磨贝/其他费`,-1),o(`td`,null,[c(g,{modelValue:$.polishOtherFee,"onUpdate:modelValue":i[36]||=e=>$.polishOtherFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])]),i[83]||=o(`td`,{class:`label-td`},`CNC费`,-1),o(`td`,null,[c(g,{modelValue:$.cncFee,"onUpdate:modelValue":i[37]||=e=>$.cncFee=e,min:0,precision:2,style:{width:`100%`},size:`small`},null,8,[`modelValue`])])])])]),i[84]||=o(`div`,{class:`print-gap`},null,-1),i[85]||=o(`table`,{class:`repair-table print-table`},[o(`tbody`,null,[o(`tr`,{class:`process-header`},[o(`td`,{class:`label-td`},`数据确认`),o(`td`,{class:`label-td`},`出蜡`),o(`td`,{class:`label-td`},`倒模`),o(`td`,{class:`label-td`},`配件缺失`),o(`td`,{class:`label-td`},`执模`),o(`td`,{class:`label-td`},`车石`),o(`td`,{class:`label-td`},`CNC`),o(`td`,{class:`label-td`},`扫镶口`),o(`td`,{class:`label-td`},`镶石`),o(`td`,{class:`label-td`},`扣链`),o(`td`,{class:`label-td`},`抛光`),o(`td`,{class:`label-td`},`备注`)]),o(`tr`,{class:`check-row`},[o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-detail-header`},[o(`td`,{class:`label-td`},`部门`),o(`td`,{class:`label-td`},`日期`),o(`td`,{class:`label-td`},`发货重量`),o(`td`,{class:`label-td`},`签名`),o(`td`,{class:`label-td`},`时间`),o(`td`,{class:`label-td`},`收货重量`),o(`td`,{class:`label-td`},`签名`),o(`td`,{class:`label-td`},`时间`),o(`td`,{class:`label-td`},`收回日期`),o(`td`,{class:`label-td`},`水口`),o(`td`,{class:`label-td`},`收回时间`),o(`td`,{class:`label-td`},`报废重量`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`,rowspan:`2`},`执模/有耗`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`},`扣链`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`},`扣链`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`},`CNC`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`,rowspan:`2`},`微镶`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`,rowspan:`2`},`手镶`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`,rowspan:`2`},`抛光有耗`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`},`磨石/滴胶`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`},`抛光无耗`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`},`扫相口`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)]),o(`tr`,{class:`process-row`},[o(`td`,{class:`label-td`},`成品抛光`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`),o(`td`)])])],-1)])]),_:1},8,[`model`])]),_:1})])}}},[[`__scopeId`,`data-v-4c8a07c2`]]);export{K as default};