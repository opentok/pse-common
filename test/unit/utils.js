!function(exports) {

  exports.loadScript = function loadScript(filename, callback) {
    var script = document.createElement('script');
    script.src = 'base/' + filename;
    script.async = false;
    typeof callback === 'function' && script.addEventListener('load', callback);
    document.head.appendChild(script);
  }

}(this);
