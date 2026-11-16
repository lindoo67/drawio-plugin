// The host has an opaque origin and denies storage/network APIs.
window.urlParams = {offline:'1',local:'1',embed:'0',gapi:'0',gh:'0',gl:'0',od:'0',tr:'0',browser:'0',math:'0',plugins:'0',ui:'kennedy',stealth:'1',noExitBtn:'1',noSaveBtn:'1',pv:'0'};
window.mxLoadResources = false;
window.mxLoadStylesheets = false;
// Keep in sync with `languages` in build.mjs. English is the base bundle.
const bundledLanguages = ['de','es','fr','it','ja','ko','nl','pl','pt','pt-br','ru','tr','zh','zh-tw'];
const pickLanguage = tags => {
  for (const tag of tags) {
    const [primary, ...rest] = String(tag).toLowerCase().split('-');
    if (primary === 'en') return 'en';
    if (primary === 'zh') return rest.some(part => ['tw','hk','mo','hant'].includes(part)) ? 'zh-tw' : 'zh';
    if (primary === 'pt') {
      try { if (new Intl.Locale(tag).region === 'BR') return 'pt-br'; } catch {}
    }
    if (bundledLanguages.includes(primary)) return primary;
  }
  return 'en';
};
const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
const useLanguage = language => {
  window.mxLanguage = language;
  window.urlParams.lang = language;
};
useLanguage(pickLanguage(browserLanguages));
window.drawioHostLanguage = window.mxLanguage;
window.drawioLanguageOverride = null;
window.drawioLanguageReady = (async () => {
  let stored = null;
  try { stored = await window.orca?.storage?.get('ui-language'); } catch {}
  // Reading storage waits for the frame handshake that supplies Orca's UI locale.
  window.drawioHostLanguage = pickLanguage(window.orca?.locale ? [window.orca.locale] : browserLanguages);
  window.drawioLanguageOverride = ['en',...bundledLanguages].includes(stored) ? stored : null;
  useLanguage(window.drawioLanguageOverride || window.drawioHostLanguage);
})();
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
