// The host has an opaque origin and denies storage/network APIs.
window.urlParams = {offline:'1',local:'1',embed:'0',gapi:'0',gh:'0',gl:'0',od:'0',tr:'0',browser:'0',math:'0',plugins:'0',ui:'kennedy',stealth:'1',noExitBtn:'1',noSaveBtn:'1'};
window.mxLoadResources = false;
window.mxLoadStylesheets = false;
// Keep in sync with `languages` in build.mjs. English is the base bundle.
const bundledLanguages = ['de','es','fr','it','ja','ko','nl','pl','pt','pt-br','ru','tr','zh','zh-tw'];
const pickLanguage = () => {
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const [primary, ...rest] = String(tag).toLowerCase().split('-');
    if (primary === 'en') return 'en';
    if (primary === 'zh') return rest.some(part => ['tw','hk','mo','hant'].includes(part)) ? 'zh-tw' : 'zh';
    if (primary === 'pt' && rest[0] === 'br') return 'pt-br';
    if (bundledLanguages.includes(primary)) return primary;
  }
  return 'en';
};
window.mxLanguage = pickLanguage();
window.urlParams.lang = window.mxLanguage;
window.mxLanguages = bundledLanguages;
window.mxIsElectron = false;
window.isLocalStorage = false;
window.EXPORT_URL = null;
window.DRAWIO_CONFIG = { enableAi: false, enableCustomLibraries: false };
window.mxscript = function(url, onload) { console.warn('Unavailable offline module:',url); };
// Upstream settings probe localStorage at module initialisation.
for (const name of ['localStorage','sessionStorage']) {
  try { Object.defineProperty(window,name,{value:{getItem(){return null},setItem(){},removeItem(){},clear(){}},configurable:true}); } catch {}
}
