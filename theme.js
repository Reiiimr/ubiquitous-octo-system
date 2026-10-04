(function(){var k='cityvet.theme',t=null;try{t=localStorage.getItem(k)}catch(e){}
if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;
function sync(){var d=document.documentElement.dataset.theme==='dark';[].forEach.call(document.querySelectorAll('[data-theme-toggle]'),function(e){if(e.type==='checkbox')e.checked=d;else e.innerHTML='<img class="ico" alt="" src="'+(d?'icon-sun.png':'icon-moon.png')+'"/> '+(d?'Light mode':'Dark mode')});var m=document.querySelector('meta[name=theme-color]');if(m)m.content=d?'#121b16':'#01a85a'}
function set(v){document.documentElement.dataset.theme=v;try{localStorage.setItem(k,v)}catch(e){}sync()}
document.addEventListener('DOMContentLoaded',sync);
document.addEventListener('click',function(e){var b=e.target.closest('[data-theme-toggle]');if(b&&b.type!=='checkbox')set(document.documentElement.dataset.theme==='dark'?'light':'dark')});
document.addEventListener('change',function(e){if(e.target.matches('[data-theme-toggle]'))set(e.target.checked?'dark':'light')})})();
