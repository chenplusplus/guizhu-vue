const {parse} = require('@babel/parser');
function t(label, code){
  try { parse(code, {sourceType:'module', plugins:['jsx']}); console.log(label, 'OK'); }
  catch(e){ console.log(label, 'ERR', e.message); }
}
t("const-split", "const\nformRef = ref()\nconst x = 1");
t("onmounted", "onMounted(() => { loadCounterparties()\nloadLastTotal()})");
t("await-split", "await\nformRef.value.validate(async (valid) => {})");
