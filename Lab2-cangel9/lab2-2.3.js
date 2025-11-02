// Lab 2-2.3 — Debug logging at interesting points
console.log('[Lab 2-2.3] Injecting debug logs...');
(function attach(){
  const _update = window.update;
  const _render = window.render;
  if (_update) {
    window.update = function(dt){
      console.log('[DBG] frame dt=', dt.toFixed(4), 'player', {x:player.x.toFixed(1), y:player.y.toFixed(1), vy:player.vy.toFixed(1)});
      return _update(dt);
    }
  }
  if (_render) {
    window.render = function(dt){
      // Drop a perf marker that shows in the performance profiler
      performance.mark('render-start');
      const r = _render(dt);
      performance.mark('render-end');
      performance.measure('render', 'render-start', 'render-end');
      return r;
    }
  }
})();