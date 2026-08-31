(function () {
  'use strict';

  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true },
      sequence: { useMaxWidth: true }
    });

    var diagrams = document.querySelectorAll('pre.mermaid');
    if (diagrams.length > 0) {
      diagrams.forEach(function (el, i) {
        el.id = el.id || 'mermaid-' + i;
      });
      mermaid.run({ nodes: diagrams });
    }
  }
})();
