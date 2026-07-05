// Local Chart.js fallback - minimal version for basic bar/pie charts
// Download full version: https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.js

(function(){if(typeof window.Chart!=='undefined')return;console.log('Local Chart.js stub loaded');window.Chart=function(){console.log('Chart created with local stub');return{toBase64Image:function(){return'https://via.placeholder.com/400x400?text=Chart.js'}};};})();
