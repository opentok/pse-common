!function(global) {
  'use strict';

  var position = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    DOWN: 'down',
    HOME: 'home'
  };

  var oppositePosition = {
    left: position.RIGHT,
    right: position.LEFT,
    top: position.DOWN,
    down: position.TOP
  };

  /**
   * The view disappears in favour of the new view
   *
   * @param {DOMElement} the view
   *
   * @param {String} value
   *
   * @param {String} view will be translated from this position
   *
   */
  function toggle(view, pos) {
    view.data('position', oppositePosition[pos]);
  }

  var Handler = function(container) {
    var currentCard;
    var cards = {};
    var history = [];
    var childNodes = container.childNodes;
    for (var count = 0, length = childNodes.length; count < length; count++) {
      var child = childNodes[count];
      if (child.classList && child.classList.contains('card')) {
        cards[child.id] = child;
        if (child.data('position') === position.HOME) {
          currentCard = child;
          history.push(currentCard);
          document.body.data('currentCard', child.id);
        }
      }
    }

    return {
      /**
       * It goes to first card
       *
       */
      reset: function() {
        var isNotTheLastCard = this.back();
        while (isNotTheLastCard) {
          isNotTheLastCard = this.back();
        };
      },

      /**
       * Returns the view by identifier
       *
       * @param {String} identifier of the view
       *
       */
      get: function(id) {
        return cards[id];
      },

      /**
       * Navigates to a view by identifier
       *
       * @param {String} identifier of the view
       *
       */
      go: function(id) {
        if (id === currentCard.id) {
          return;
        }

        var goCard = cards[id];
        if (goCard) {
          toggle(currentCard, goCard.data('position'));
          currentCard = goCard;
          history.push(currentCard);
          document.body.data('currentCard', id);
          currentCard.data('position', position.HOME);
        }
      },

      /**
       * Navigates to the previous view
       */
      back: function() {
        var count = history.length;
        if (count <= 1) {
          return false;
        }

        currentCard = history[count - 2];
        var lastCard = history.pop();
        toggle(lastCard, currentCard.data('position'));
        currentCard.data('position', position.HOME);
        return true;
      },

      /**
       * Returns the current view
       */
      get current() {
        return currentCard;
      },

      destroy: function() {
        currentCard = null;
        cards = null;
        history = null;
        childNodes = null;
      }
    };
  };

  var _instances = [];
  global.Navigator = {
    get: function(sel) {
      var element = typeof sel === 'string' ? document.querySelector(sel) : sel;
      var instance = _instances.find(inst => inst.element === element);
      !instance && (instance =
        _instances[_instances.push({ element: element, handler: new Handler(element)}) - 1]);
      return instance.handler;
    }
  };

}(this);
